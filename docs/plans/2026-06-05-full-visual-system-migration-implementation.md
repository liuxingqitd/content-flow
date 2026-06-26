# Full Visual System Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the approved visual system to every application page without changing business behavior, persistence, or user data.

**Architecture:** Update the existing CSS-variable design foundation and shared React UI components first. Then make scoped presentation-only adjustments to page components while preserving their event handlers and store calls. Verify the final diff excludes business and data-layer modules.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand

---

### Task 1: Upgrade the visual foundation

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/PageContainer.tsx`

**Steps:**
1. Map the approved dark and light tokens into the existing stable variable names.
2. Add spacing, typography, motion and reusable product UI classes.
3. Restyle the app shell, sidebar and page container without changing navigation or theme actions.
4. Run `npx tsc -b --pretty false`.

### Task 2: Upgrade shared UI components

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Select.tsx`
- Modify: `src/components/ui/Modal.tsx`
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/StatusBadge.tsx`

**Steps:**
1. Apply the shared visual vocabulary to all variants and states.
2. Preserve props, native events, loading behavior and modal close behavior.
3. Run lint and type checking for the modified components.

### Task 3: Adapt primary workflow pages

**Files:**
- Modify: `src/pages/Dashboard/index.tsx`
- Modify: `src/pages/Kanban/index.tsx`
- Modify: `src/pages/Topics/index.tsx`
- Modify: `src/pages/Scripts/index.tsx`
- Modify: `src/pages/Scripts/ScriptEditor.tsx`

**Steps:**
1. Align cards, filters, grids, lists and editor surfaces with the new design system.
2. Preserve all drag, edit, save, delete, risk detection and navigation handlers.
3. Check responsive overflow and information visibility.

### Task 4: Adapt library, detail, analytics and settings pages

**Files:**
- Modify: `src/pages/Videos/index.tsx`
- Modify: `src/pages/Videos/VideoDetail.tsx`
- Modify: `src/pages/Analytics/index.tsx`
- Modify: `src/pages/Settings/index.tsx`
- Modify: `src/pages/DirectorySetup.tsx`

**Steps:**
1. Align tables, tabs, settings lists and detail panels to the approved designs.
2. Preserve all existing data-backed controls and store calls.
3. Ensure narrow layouts scroll or collapse without hiding actions.

### Task 5: Verify behavior and data safety

**Steps:**
1. Run `npm run lint`.
2. Run `npx tsc -b --pretty false`.
3. Run `npm run build`.
4. Run `git diff -- src/store src/services src/types server` and confirm no data or business-layer changes.
5. Start the app and inspect main routes in dark and light themes.
6. Record results in `tasks/todo.md`.
