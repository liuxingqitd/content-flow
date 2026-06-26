use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::UNIX_EPOCH,
};

use tauri::{Manager, WindowEvent};
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
