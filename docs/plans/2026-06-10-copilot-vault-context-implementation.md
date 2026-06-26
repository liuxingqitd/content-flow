# Copilot Vault Context Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the AI Companion visibly follow the current page and safely search or read scripts from the shared Obsidian Vault.

**Architecture:** Keep route and entity summaries in `useAgentContext`, resolve the current script through explicit Video/Script relationships, and expose browser-side tools that read only the authorized `scripts/` directory. Style the existing CopilotKit v2 sidebar with a custom header and scoped theme overrides.

**Tech Stack:** React 19, React Router, Zustand, Browser File System Access API, CopilotKit v2, TypeScript, Vitest.

---

### Task 1: Resolve Current Script Reliably

**Files:**
- Modify: `src/copilot/context.ts`
- Test: `src/copilot/context.test.ts`

1. Add tests for script routes, video routes, reverse-link fallback, and missing body state.
2. Add page labels, context revision, related IDs, and current script resolution.
3. Run `npm run test:run -- src/copilot/context.test.ts`.

### Task 2: Add Vault Read And Search Services

**Files:**
- Modify: `src/services/fileSystem.ts`
- Create: `src/copilot/vaultSearch.ts`
- Test: `src/copilot/vaultSearch.test.ts`

1. Add a read-only script directory listing helper returning Markdown metadata and content.
2. Implement deterministic keyword search with bounded snippets and result count.
3. Test ranking, orphan Markdown discovery, and result limits.
4. Run `npm run test:run -- src/copilot/vaultSearch.test.ts`.

### Task 3: Register Context-Aware Copilot Tools

**Files:**
- Modify: `src/copilot/CopilotBridge.tsx`
- Modify: `server/copilot/runtime.ts`

1. Register `read_current_script` and `search_vault_scripts`.
2. Configure page-specific suggestions.
3. Update the system prompt to always prefer the latest page context and never invent missing body content.
4. Run focused Copilot tests.

### Task 4: Polish The Sidebar

**Files:**
- Create: `src/copilot/CopilotHeader.tsx`
- Modify: `src/copilot/CopilotShell.tsx`
- Modify: `src/styles/global.css`

1. Add a custom Header that displays current page focus.
2. Add scoped ContentFlow theme variables and sidebar overrides.
3. Verify light and dark themes remain readable.

### Task 5: Verify End To End

**Files:**
- Modify: `tasks/todo.md`
- Modify: `tasks/lessons.md`

1. Run `npm run test:run`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Check the final diff and document residual manual-testing limits.
