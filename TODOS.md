# TODOS

## Quality

Use Fallow

## Persistence

### Verify "delete my synced data" fully completes on partial failure

**What:** The "delete my synced data" Settings action removes all rows from the user's own Convex deployment in one operation; if it fails partway through (unlikely but possible), the user has no way to know some rows survived the delete.

**Why:** Flagged during /plan-ceo-review Section 2 (Error & Rescue Map). Low likelihood given personal-scale task counts (tens, not thousands) and Convex's per-mutation reliability — deferred rather than blocking the sync feature's initial ship.

**Context:** Convex `deleteAll`-style mutation (once built, per design doc Next Steps). Note: under the bring-your-own-Convex-URL model (design doc Approach D), this deletes everything in that deployment since it's single-tenant — no `userId` filter needed.

**Effort:** S
**Priority:** P3
**Depends on:** Convex sync feature shipping

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
