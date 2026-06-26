# AI Companion Local Prompt Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow the AI sidebar to discover and load every local prompt-only Skill through controlled server-side tools.

**Architecture:** Add a server-side Skill Registry that recursively discovers `SKILL.md` files under configured roots and safely loads Markdown-only content. Merge two server-side AI SDK tools into the existing Copilot Runtime tool set while retaining browser-side business tools.

**Tech Stack:** TypeScript, Node.js filesystem APIs, Vercel AI SDK, CopilotKit Runtime v2, Zod, Vitest

---

### Task 1: Implement and test the Skill Registry

**Files:**
- Create: `server/skills/registry.ts`
- Create: `server/skills/registry.test.ts`

1. Write tests for recursive discovery, metadata parsing, root priority, Markdown-only loading, truncation, and path safety.
2. Run the focused test and verify it fails.
3. Implement the minimal registry.
4. Run the focused test and verify it passes.

### Task 2: Register server-side Skill tools

**Files:**
- Create: `server/copilot/skillTools.ts`
- Modify: `server/copilot/runtime.ts`

1. Expose `list_local_skills` and `load_local_skill` as AI SDK tools.
2. Merge them with CopilotKit frontend tools.
3. Update the system prompt with prompt-only Skill rules.
4. Run Copilot and server tests.

### Task 3: Document configuration and verify

**Files:**
- Modify: `README.md`
- Modify: `docker-compose.yml`
- Modify: `tasks/todo.md`

1. Document `SKILLS_ROOTS` and prompt-only behavior.
2. Ensure Docker exposes the mounted Skill root to the registry.
3. Run tests, scoped lint, type checking, build, and diff checks.
4. Record the verification result in `tasks/todo.md`.
