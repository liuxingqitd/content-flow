# Video Library Performance And Commercial Amount Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the video library open quickly while adding commercial deal amount tracking with privacy-controlled dashboard display.

**Architecture:** Keep changes local to the existing React/Zustand data flow. Optimize list perceived performance by lazy-loading and caching cover thumbnails, and add commercial fields directly to `Video` because the amount belongs to the video rather than a platform publish record.

**Tech Stack:** React 19, TypeScript, Zustand with immer, Vite.

---

### Task 1: Video Data Model And Migrations

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/defaultData.ts`
- Modify: `src/services/fileSystem.ts`

**Steps:**
- Add `isCommercial?: boolean` and `commercialAmount?: number` to `Video`.
- Add `hideCommercialAmount?: boolean` to `AppSettings`.
- Set the default setting to `false`.
- Migrate both browser and Tauri data reads so existing workspaces get `hideCommercialAmount: false`.

### Task 2: Detail Page Commercial Editing

**Files:**
- Modify: `src/pages/Videos/VideoDetail.tsx`

**Steps:**
- Read `hideCommercialAmount` from settings.
- Add a compact business section in the detail page.
- Let users toggle commercial status.
- When enabled and not hidden, show a number input for commercial amount.
- Store positive amounts as `commercialAmount`; clear the amount when toggled off.

### Task 3: Dashboard Commercial Summary

**Files:**
- Modify: `src/pages/Dashboard/index.tsx`

**Steps:**
- Compute monthly commercial amount from videos marked commercial.
- Use `publishedAt ?? createdAt` as the month source to match promotion cost behavior.
- Add a dashboard card when `hideCommercialAmount` is false.

### Task 4: Settings Privacy Toggle

**Files:**
- Modify: `src/pages/Settings/index.tsx`

**Steps:**
- Keep the existing promotion amount toggle.
- Add a parallel commercial amount toggle below or beside it in the Privacy section.
- Preserve the existing visual pattern and copy style.

### Task 5: Video Library Cover Performance

**Files:**
- Modify: `src/pages/Videos/index.tsx`

**Steps:**
- Add a small module-level thumbnail URL cache.
- Observe each thumbnail with `IntersectionObserver`.
- Read the cover only after the thumbnail enters or nears the viewport.
- Reuse cached object URLs on return visits during the same app session.
- Revoke newly loaded URLs only when they are not cached or no longer needed.

### Task 6: Verification

**Commands:**
- `npx eslint src/types/index.ts src/services/defaultData.ts src/services/fileSystem.ts src/pages/Videos/index.tsx src/pages/Videos/VideoDetail.tsx src/pages/Dashboard/index.tsx src/pages/Settings/index.tsx`
- `npx tsc -b --pretty false`
- `npm run build`

**Expected:** All commands pass, except any known unrelated full-repo lint issue is documented if encountered.
