# Tauri Desktop Client Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Package ContentFlow as a native desktop client that starts the local API runtime automatically when the app opens.

**Architecture:** Add a Tauri 2 shell around the existing Vite/React app. Build the Express/CopilotKit runtime into a Node sidecar binary, let the Tauri process spawn and supervise it, and point the webview at the bundled frontend assets. Keep the current browser-based file storage unchanged for the first version.

**Tech Stack:** Tauri 2, Rust, Vite, React, TypeScript, Express, esbuild, @yao-pkg/pkg.

---

### Task 1: Add Desktop Build Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Steps:**
1. Add scripts for `tauri`, desktop dev/build, server bundling, and sidecar packaging.
2. Add dev dependencies: `@tauri-apps/cli`, `esbuild`, `@yao-pkg/pkg`.
3. Run `npm install` to update the lockfile.

**Verification:**
- `npm run build:server`
- `npm run package:server`

### Task 2: Create Tauri Shell

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/icons/.gitkeep`

**Steps:**
1. Configure Tauri to use `dist` as frontend assets and `npm run dev` as the dev URL provider.
2. Register the sidecar binary in `bundle.externalBin`.
3. Spawn the sidecar on setup with `PORT=3001`.
4. Kill the sidecar when the app exits.
5. Add a single-instance plugin so opening the app twice focuses the existing window.

**Verification:**
- `npm run desktop:dev`
- App window opens and `GET /api/health` returns `{"status":"ok"}`.

### Task 3: Make Runtime Desktop-Safe

**Files:**
- Modify: `server/index.ts`

**Steps:**
1. Keep `.env` loading for development and packaged use.
2. Ensure CORS accepts Tauri/webview origins in addition to localhost.
3. Keep `/api/health` as the lifecycle check.

**Verification:**
- `npm run test:run`
- `npm run build:server`

### Task 4: Route API Calls in Packaged Frontend

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/copilot/CopilotShell.tsx`
- Modify: `src/copilot/providerConfig.ts`
- Modify: `src/copilot/AIProviderSettings.tsx`

**Steps:**
1. Add a tiny API URL helper that uses `/api` in web/dev and `http://127.0.0.1:3001/api` inside Tauri.
2. Use that helper for AI provider testing and CopilotKit runtime URL.
3. Keep existing Vite proxy behavior for browser development.

**Verification:**
- `npm run build`
- Browser dev still uses relative `/api`.
- Tauri app uses localhost runtime directly.

### Task 5: Document and Validate

**Files:**
- Modify: `README.md`
- Modify: `tasks/todo.md`

**Steps:**
1. Add desktop development/build instructions.
2. Mark checklist progress.
3. Run tests, typecheck, lint, server packaging, and a Tauri dev smoke test if dependencies are available.

**Verification:**
- `npm run test:run`
- `npx tsc -b --pretty false`
- `npm run lint`
- `npm run build`
- `npm run build:server`
- `npm run package:server`
- `npm run desktop:dev`
