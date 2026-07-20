use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use image::{
    codecs::jpeg::JpegEncoder, imageops::FilterType, DynamicImage, ImageDecoder, ImageReader, Limits,
};
use tauri::{ipc::Response, Manager, WindowEvent};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

#[derive(Default)]
struct ApiSidecar(Mutex<Option<CommandChild>>);

#[derive(serde::Serialize)]
struct NativeTextFile {
    name: String,
    content: String,
    updated_at: String,
}

fn spawn_api_sidecar(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let port = std::env::var("CONTENTFLOW_API_PORT").unwrap_or_else(|_| "3001".to_string());
    let sidecar = app
        .shell()
        .sidecar("contentflow-api")?
        .env("HOST", "127.0.0.1")
        .env("PORT", port)
        .env("COPILOTKIT_TELEMETRY_DISABLED", "true");

    let (mut rx, child) = sidecar.spawn()?;

    *app.state::<ApiSidecar>().0.lock().expect("sidecar lock poisoned") = Some(child);

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[contentflow-api] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[contentflow-api] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(status) => {
                    println!("[contentflow-api] terminated: {:?}", status);
                }
                _ => {}
            }
        }
    });

    Ok(())
}

fn stop_api_sidecar<R: tauri::Runtime>(manager: &impl Manager<R>) {
    let child = {
        let state = manager.state::<ApiSidecar>();
        let child = state.0.lock().expect("sidecar lock poisoned").take();
        child
    };

    if let Some(child) = child {
        let _ = child.kill();
    }
}

fn resolve_data_path(root: &str, relative_path: &str) -> Result<PathBuf, String> {
    let root_path = PathBuf::from(root);
    let relative = Path::new(relative_path);

    if relative.is_absolute() || relative.components().any(|part| matches!(part, std::path::Component::ParentDir)) {
        return Err("invalid relative path".to_string());
    }

    Ok(root_path.join(relative))
}

fn modified_iso(path: &Path) -> String {
    let millis = fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or(0);

    format!("{millis}")
}

#[cfg(target_os = "macos")]
fn is_dataless_file(metadata: &fs::Metadata) -> bool {
    use std::os::macos::fs::MetadataExt;

    const SF_DATALESS: u32 = 0x40000000;
    metadata.st_flags() & SF_DATALESS != 0
}

#[cfg(not(target_os = "macos"))]
fn is_dataless_file(_metadata: &fs::Metadata) -> bool {
    false
}

#[tauri::command]
fn pick_data_directory() -> Result<Option<String>, String> {
    Ok(rfd::FileDialog::new().pick_folder().map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn directory_exists(path: String) -> bool {
    PathBuf::from(path).is_dir()
}

#[tauri::command]
fn has_directory(root: String, name: String) -> Result<bool, String> {
    Ok(resolve_data_path(&root, &name)?.is_dir())
}

#[tauri::command]
fn has_markdown_files(root: String) -> Result<bool, String> {
    let root_path = PathBuf::from(root);
    let entries = match fs::read_dir(root_path) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(error) => return Err(error.to_string()),
    };

    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        if entry.path().extension().is_some_and(|extension| extension == "md") {
            return Ok(true);
        }
    }

    Ok(false)
}

#[tauri::command]
fn read_text_file(root: String, relative_path: String) -> Result<Option<String>, String> {
    let path = resolve_data_path(&root, &relative_path)?;
    match fs::read_to_string(path) {
        Ok(contents) => Ok(Some(contents)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn write_text_file(root: String, relative_path: String, contents: String, validate_json: bool) -> Result<(), String> {
    if validate_json {
        serde_json::from_str::<serde_json::Value>(&contents).map_err(|error| error.to_string())?;
    }

    let path = resolve_data_path(&root, &relative_path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let tmp_path = path.with_extension(format!(
        "{}tmp",
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| format!("{extension}."))
            .unwrap_or_default()
    ));

    fs::write(&tmp_path, contents).map_err(|error| error.to_string())?;
    fs::rename(&tmp_path, &path).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_file(root: String, relative_path: String) -> Result<(), String> {
    let path = resolve_data_path(&root, &relative_path)?;
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn list_markdown_files(root: String, relative_dir: String) -> Result<Vec<NativeTextFile>, String> {
    let dir = resolve_data_path(&root, &relative_dir)?;
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(error) => return Err(error.to_string()),
    };

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if !path.is_file() || !path.extension().is_some_and(|extension| extension == "md") {
            continue;
        }

        files.push(NativeTextFile {
            name: entry.file_name().to_string_lossy().to_string(),
            content: fs::read_to_string(&path).map_err(|error| error.to_string())?,
            updated_at: modified_iso(&path),
        });
    }

    Ok(files)
}

#[tauri::command]
fn read_binary_file(root: String, relative_path: String) -> Result<Option<Vec<u8>>, String> {
    let path = resolve_data_path(&root, &relative_path)?;
    match fs::read(path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

fn cover_thumbnail_bytes(
    root: &str,
    relative_path: &str,
    cache_root: &Path,
    width: u32,
    height: u32,
) -> Result<Vec<u8>, String> {
    let source = resolve_data_path(root, relative_path)?;
    let metadata = fs::metadata(&source).map_err(|error| error.to_string())?;
    let modified = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_nanos())
        .unwrap_or(0);

    let mut source_hasher = DefaultHasher::new();
    root.hash(&mut source_hasher);
    relative_path.hash(&mut source_hasher);
    let source_key = format!("{:016x}", source_hasher.finish());

    let mut revision_hasher = DefaultHasher::new();
    root.hash(&mut revision_hasher);
    relative_path.hash(&mut revision_hasher);
    metadata.len().hash(&mut revision_hasher);
    modified.hash(&mut revision_hasher);
    width.hash(&mut revision_hasher);
    height.hash(&mut revision_hasher);
    let cache_name = format!("{source_key}_{:016x}.jpg", revision_hasher.finish());

    fs::create_dir_all(cache_root).map_err(|error| error.to_string())?;
    let cached = cache_root.join(&cache_name);
    if cached.is_file() {
        return fs::read(cached).map_err(|error| error.to_string());
    }
    if is_dataless_file(&metadata) {
        return Ok(Vec::new());
    }

    let mut reader = ImageReader::open(&source).map_err(|error| error.to_string())?;
    let mut limits = Limits::default();
    limits.max_image_width = Some(12_000);
    limits.max_image_height = Some(12_000);
    limits.max_alloc = Some(96 * 1024 * 1024);
    reader.limits(limits);
    let mut decoder = reader
        .with_guessed_format()
        .map_err(|error| error.to_string())?
        .into_decoder()
        .map_err(|error| error.to_string())?;
    let orientation = decoder.orientation().map_err(|error| error.to_string())?;
    let mut decoded = DynamicImage::from_decoder(decoder).map_err(|error| error.to_string())?;
    decoded.apply_orientation(orientation);
    let thumbnail = decoded
        .resize_to_fill(width, height, FilterType::Triangle)
        .to_rgb8();
    let mut bytes = Vec::new();
    JpegEncoder::new_with_quality(&mut bytes, 76)
        .encode_image(&thumbnail)
        .map_err(|error| error.to_string())?;

    let temp_suffix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos())
        .unwrap_or(0);
    let tmp = cached.with_extension(format!("jpg.{temp_suffix}.tmp"));
    fs::write(&tmp, &bytes).map_err(|error| error.to_string())?;
    if let Err(error) = fs::rename(&tmp, &cached) {
        let _ = fs::remove_file(&tmp);
        if cached.is_file() {
            return fs::read(cached).map_err(|read_error| read_error.to_string());
        }
        return Err(error.to_string());
    }

    if let Ok(entries) = fs::read_dir(cache_root) {
        let prefix = format!("{source_key}_");
        for entry in entries.flatten() {
            let path = entry.path();
            let is_stale =
                path != cached && entry.file_name().to_string_lossy().starts_with(&prefix);
            if is_stale {
                let _ = fs::remove_file(path);
            }
        }
    }

    Ok(bytes)
}

#[tauri::command]
async fn read_cover_thumbnail(
    app: tauri::AppHandle,
    root: String,
    relative_path: String,
    width: u32,
    height: u32,
) -> Result<Response, String> {
    let cache_root = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join("cover-thumbnails");
    let bytes = tauri::async_runtime::spawn_blocking(move || {
        cover_thumbnail_bytes(&root, &relative_path, &cache_root, width, height)
    })
    .await
    .map_err(|error| error.to_string())??;

    Ok(Response::new(bytes))
}

#[tauri::command]
fn write_binary_file(root: String, relative_path: String, bytes: Vec<u8>) -> Result<(), String> {
    let path = resolve_data_path(&root, &relative_path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, bytes).map_err(|error| error.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(ApiSidecar::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            spawn_api_sidecar(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            pick_data_directory,
            directory_exists,
            has_directory,
            has_markdown_files,
            read_text_file,
            write_text_file,
            delete_file,
            list_markdown_files,
            read_binary_file,
            read_cover_thumbnail,
            write_binary_file,
        ])
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. }) {
                stop_api_sidecar(window);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running ContentFlow desktop client");
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Rgb, RgbImage};

    #[test]
    fn creates_and_reuses_a_small_cover_thumbnail() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after unix epoch")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("contentflow-cover-test-{suffix}"));
        let covers = root.join("covers");
        let cache = root.join("cache");
        fs::create_dir_all(&covers).expect("covers directory should be created");

        let source = covers.join("video_portrait.jpg");
        RgbImage::from_fn(1080, 1920, |x, y| {
            Rgb([
                ((x * 13 + y * 7) % 256) as u8,
                ((x * 3 + y * 17) % 256) as u8,
                ((x * 11 + y * 5) % 256) as u8,
            ])
        })
        .save(&source)
        .expect("source image should be written");
        let source_size = fs::metadata(&source)
            .expect("source metadata should be available")
            .len();

        let first = cover_thumbnail_bytes(
            root.to_str().expect("temp path should be utf-8"),
            "covers/video_portrait.jpg",
            &cache,
            96,
            128,
        )
        .expect("thumbnail should be generated");
        let decoded = image::load_from_memory(&first).expect("thumbnail should be valid jpeg");
        assert_eq!((decoded.width(), decoded.height()), (96, 128));
        assert!(
            source_size > 500_000,
            "fixture should represent a large cover"
        );
        assert!(
            first.len() < 50_000,
            "list thumbnail should stay below 50 KB"
        );

        let second = cover_thumbnail_bytes(
            root.to_str().expect("temp path should be utf-8"),
            "covers/video_portrait.jpg",
            &cache,
            96,
            128,
        )
        .expect("cached thumbnail should be read");
        assert_eq!(second, first);
        assert_eq!(fs::read_dir(&cache).expect("cache should exist").count(), 1);

        fs::remove_dir_all(root).expect("test files should be removed");
    }
}
