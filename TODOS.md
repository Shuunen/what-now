# TODOS

## Persistence

### Cross-tab sync for local IndexedDB store

**What:** Two tabs open at once each hydrate independently and debounce-write the whole `AppData` document to IndexedDB; simultaneous edits in two tabs silently clobber each other (last write wins, no warning).

**Why:** Flagged by the /ship red-team review when migrating from Appwrite cloud sync to local-only persistence. Building real cross-tab awareness (BroadcastChannel + conflict handling or at least a "data changed in another tab" warning) is a meaningfully sized feature, deferred out of the migration PR to keep it reviewable.

**Context:** `src/db/use-persistence.ts` — `useHydration`/`usePersistence`.

**Effort:** M
**Priority:** P1
**Depends on:** None

## Design

### Task card control buttons below touch-target minimum

**What:** The increase/decrease/move buttons on planner task cards are sized at 16x16px (`size-4` override), under the 44px minimum recommended touch target.

**Why:** Flagged by the /ship design review; hard to tap accurately on mobile/touch devices.

**Context:** `src/pages/page-planner.tsx` — `TaskCardControls`.

**Effort:** S
**Priority:** P2
**Depends on:** None

## Testing

### Cover download-file.utils.ts

**What:** `src/utils/download-file.utils.ts` has 0% test coverage.

**Why:** It's the only util file with no tests at all; a regression there wouldn't be caught by `pnpm test:unit`.

**Context:** Pre-existing gap, not introduced by any specific change. Low urgency since the function is small and rarely touched.

**Effort:** S
**Priority:** P4
**Depends on:** None

## Completed
