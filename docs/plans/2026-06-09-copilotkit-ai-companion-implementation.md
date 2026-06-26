# CopilotKit AI Companion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a website-native CopilotKit AI Companion that uses user-provided OpenAI-compatible model credentials, understands the current ContentFlow page, and safely queries or updates local content through fixed frontend tools.

**Architecture:** Run CopilotKit OSS Runtime and a Built-in Agent in the existing local Express server. Mount a CopilotKit sidebar and route-aware bridge in React; keep business data access in browser-side tools because the File System Access API directory handle is browser-owned. Persist provider configuration and conversations locally, outside `AppData`.

**Tech Stack:** React 19, TypeScript, Vite, Express 5, Zustand, CopilotKit OSS v2 APIs, AG-UI, Vercel AI SDK providers, Zod, Vitest.

---

### Task 1: Prove The CopilotKit Thin Slice

**Files:**
- Modify: `package.json`
- Modify: `server/index.ts`
- Modify: `src/App.tsx`
- Create: `src/copilot/CopilotShell.tsx`

**Steps:**
1. Pin compatible CopilotKit OSS, AI SDK provider, Zod, and Vitest dependencies.
2. Add one local `/api/copilotkit` Runtime route with a temporary development-only Provider configuration.
3. Mount `CopilotKitProvider` and a minimally styled `CopilotSidebar` after ContentFlow data is loaded.
4. Register one harmless `get_current_page` frontend tool returning the current route.
5. Start the existing React and Express development servers.
6. Verify streaming text and one frontend tool call work end to end.
7. Verify existing non-AI pages still work when Express is stopped.
8. Remove temporary hard-coded credentials before proceeding.

**Verification:**
- Run: `npm run dev`
- Expected: Sidebar streams a response and can report the current route.
- Run: `npm run build`
- Expected: PASS.

### Task 2: Add Tests And Provider Configuration Model

**Files:**
- Modify: `package.json`
- Create: `src/copilot/providerConfig.ts`
- Create: `src/copilot/providerConfig.test.ts`
- Modify: `src/pages/Settings/index.tsx`

**Steps:**
1. Add `test` and `test:run` scripts using Vitest.
2. Write failing tests for validation, redaction, local serialization, and missing Tool Calling support.
3. Define `AIProviderConfig` with `enabled`, `name`, `baseUrl`, `apiKey`, and `model`.
4. Store the config under a dedicated browser-local key, never in `AppData`.
5. Add helpers that always redact API keys in diagnostics and UI summaries.
6. Add an “AI 模型” section to Settings with provider fields and a connection test button.
7. Ensure export backup does not include provider credentials.
8. Run tests, type check, lint, and build.

**Verification:**
- Run: `npm run test:run -- src/copilot/providerConfig.test.ts`
- Expected: PASS.
- Run: `npx tsc -b --pretty false && npm run build`
- Expected: PASS.

### Task 3: Secure The Local Copilot Runtime

**Files:**
- Create: `server/copilot/providerFactory.ts`
- Create: `server/copilot/providerFactory.test.ts`
- Create: `server/copilot/runtime.ts`
- Modify: `server/index.ts`

**Steps:**
1. Write failing tests for allowed URL schemes, missing credentials, key redaction, and Provider construction.
2. Build an OpenAI-compatible Provider factory from request-scoped configuration.
3. Create a single Content Agent with a fixed system instruction and bounded maximum steps.
4. Add `/api/copilotkit` and `/api/copilotkit/test-provider`.
5. Restrict CORS to configured local frontend origins.
6. Add a short-lived local session token required by Copilot routes.
7. Prevent request bodies, API keys, and model headers from being logged.
8. Disable CopilotKit anonymous telemetry in local and Docker environments.
9. Return explicit capability results for text streaming and Tool Calling.

**Verification:**
- Run: `npm run test:run -- server/copilot/providerFactory.test.ts`
- Expected: PASS.
- Test valid and invalid Provider configurations from Settings.

### Task 4: Build Route-Aware Agent Context

**Files:**
- Create: `src/copilot/context.ts`
- Create: `src/copilot/context.test.ts`
- Create: `src/copilot/CopilotBridge.tsx`
- Modify: `src/App.tsx`

**Steps:**
1. Write failing tests proving context excludes API keys, script body, and raw platform record arrays.
2. Implement a small `PageAgentContext` builder for every route.
3. Include current entity identity, useful summary fields, filters, and available actions.
4. Place `CopilotBridge` inside the router-aware application shell.
5. Register the context with CopilotKit v2 `useAgentContext`.
6. Add a visible context indicator in the sidebar header.
7. Verify page navigation updates Agent context without recreating business state.

**Verification:**
- Run: `npm run test:run -- src/copilot/context.test.ts`
- Expected: PASS.
- Manually ask “我当前在哪个页面，能看到什么？” on three routes.

### Task 5: Add Read-Only Frontend Tools

**Files:**
- Create: `src/copilot/tools/readTools.ts`
- Create: `src/copilot/tools/readTools.test.ts`
- Modify: `src/copilot/CopilotBridge.tsx`
- Reuse: `src/services/fileSystem.ts`
- Reuse: `src/services/riskDetectApi.ts`

**Steps:**
1. Write failing tests for tool schemas, result limits, missing IDs, and excluded sensitive fields.
2. Implement `search_content` with result limits.
3. Implement `get_video_details`.
4. Implement `get_script_content` as an explicit on-demand read.
5. Implement `get_workflow_summary`.
6. Implement `get_analytics_summary` using aggregated data only.
7. Wrap the existing risk detection client as `run_script_risk_detection`.
8. Register all tools using CopilotKit v2 `useFrontendTool`.
9. Render tool progress and results with `useRenderTool`.

**Verification:**
- Run: `npm run test:run -- src/copilot/tools/readTools.test.ts`
- Expected: PASS.
- Verify Agent answers questions using tool results rather than hallucinating records.

### Task 6: Add Controlled Generative UI

**Files:**
- Create: `src/copilot/components/ContentSummaryCard.tsx`
- Create: `src/copilot/components/OpeningOptionsCard.tsx`
- Create: `src/copilot/components/RiskReportCard.tsx`
- Create: `src/copilot/components/ViralAnalysisCard.tsx`
- Create: `src/copilot/components/DraftPreviewCard.tsx`
- Modify: `src/copilot/CopilotBridge.tsx`

**Steps:**
1. Define strict Zod schemas for each structured result.
2. Build components using the existing design tokens and UI components.
3. Register components with `useComponent` or controlled render tools.
4. Add loading, empty, malformed-result, and retry states.
5. Ensure cards do not mutate business data directly.
6. Verify light and dark themes.

**Verification:**
- Run: `npx tsc -b --pretty false`
- Expected: PASS.
- Manually verify summary, opening options, risk report, and viral analysis render as structured UI.

### Task 7: Add Safe Draft Creation Commands

**Files:**
- Create: `src/copilot/tools/writeTools.ts`
- Create: `src/copilot/tools/writeTools.test.ts`
- Modify: `src/store/appStore.ts`
- Modify: `src/copilot/CopilotBridge.tsx`

**Steps:**
1. Write failing tests for allowed fields, invalid entity IDs, stale versions, and confirmation requirements.
2. Add narrow store command wrappers that return `{ ok, id?, error? }` instead of silently returning.
3. Implement `create_topic_draft` and `create_video_draft`.
4. Implement metadata-only topic and video update commands with field allowlists.
5. Show a `DraftPreviewCard` before creating content.
6. Require explicit user confirmation before executing each write.
7. Do not expose delete, publish, status transition, settings mutation, or full script replacement yet.

**Verification:**
- Run: `npm run test:run -- src/copilot/tools/writeTools.test.ts`
- Expected: PASS.
- Create one topic draft and one video draft through the sidebar; verify persistence after reload.

### Task 8: Add Local Conversation Persistence

**Files:**
- Create: `src/copilot/conversations.ts`
- Create: `src/copilot/conversations.test.ts`
- Create: `src/copilot/ConversationMenu.tsx`
- Modify: `src/copilot/CopilotShell.tsx`

**Steps:**
1. Write failing tests for thread creation, rename, deletion, message limits, and corrupted storage recovery.
2. Store conversation metadata and messages in a dedicated local browser key.
3. Add new, switch, rename, and delete conversation controls.
4. Apply a bounded retention policy.
5. Ensure conversations and API keys are excluded from ContentFlow backup export.
6. Restore the active conversation after page reload.

**Verification:**
- Run: `npm run test:run -- src/copilot/conversations.test.ts`
- Expected: PASS.
- Reload the browser and verify conversation restoration.

### Task 9: Harden Failure States And Compatibility

**Files:**
- Modify: `src/copilot/CopilotShell.tsx`
- Modify: `src/copilot/CopilotBridge.tsx`
- Modify: `server/copilot/runtime.ts`
- Modify: `README.md`

**Steps:**
1. Add UI states for Runtime offline, invalid Key, unsupported Tool Calling, rate limiting, and aborted runs.
2. Disable write tools when the Provider lacks Tool Calling.
3. Make Agent failures non-blocking for all existing ContentFlow pages.
4. Document Provider requirements, local-only credential handling, telemetry disabling, and troubleshooting.
5. Document the exact capabilities intentionally excluded from the first release.

**Verification:**
- Test with the Express server stopped.
- Test with an invalid API Key.
- Test with a text-only model.
- Expected: Existing application remains usable and Companion displays actionable errors.

### Task 10: Final Verification And Review

**Files:**
- Modify: `tasks/todo.md`
- Modify: `tasks/lessons.md`

**Steps:**
1. Run all unit tests.
2. Run lint, type check, and production build.
3. Start the full application and verify all first-release acceptance scenarios.
4. Inspect exported backup and local data directory for API keys or conversation data.
5. Inspect server logs to prove API keys are redacted.
6. Compare core non-AI workflows before and after the integration.
7. Add final review notes and remaining risks to `tasks/todo.md`.
8. Record reusable implementation lessons in `tasks/lessons.md`.

**Verification:**
- Run: `npm run test:run`
- Run: `npm run lint`
- Run: `npx tsc -b --pretty false`
- Run: `npm run build`
- Expected: All pass, with any pre-existing unrelated failure explicitly documented.

