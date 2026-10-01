# HandsFree startup loading optimization checkpoint — 2026-10-01

Branch: `task/startup-loading-opt-20261001`
Base: `e8d61990e35d61c07fbc877155d826cb6cefd2f0` (`codex/real-live-read-alignment-20260915`)
Production promotion: NOT performed. Emotion approval still required.

## Goal
Reduce perceived and actual first-launch latency for the shared HandsFree CORE used by the installed mobile wrapper and PC desktop/PWA without changing production data, write semantics, authentication rules, or source-of-truth behavior.

## Changes
- `kmt-sa2/sw.js`
  - Bumped static cache version.
  - Changed exact app-shell assets from network-first to cached response first with background revalidation.
  - API routes remain outside the service-worker static asset interception.
- `kmt-sa2/mobile.js`
  - Preserved last-good CORE cache restore.
  - Deferred four-file live asset hashing from 2.5s after launch to an idle 12s startup check.
  - Asset checks yield while the initial data read is pending.
  - Focus checks are throttled and the periodic check is reduced to every 180s.
- `handsfree-desktop/sw.js`
  - Bumped static cache version.
  - Changed static shell delivery to cached response first with background revalidation.
  - `/api/` remains bypassed.
- `handsfree-desktop/desktop.js`
  - Initial refresh now waits only for `/api/sa2-real-status` before rendering.
  - Full project catalog is warmed after the first render during idle time.
  - Catalog requests are deduplicated with `catalogPending`.
- `tests/startup-loading.test.mjs`
  - Added regression checks for cache-first shell behavior, delayed asset checks, status-first PC render, and catalog request dedupe.

## Verification
Connector-side syntax compile:
- PASS `kmt-sa2/mobile.js`
- PASS `kmt-sa2/sw.js`
- PASS `handsfree-desktop/desktop.js`
- PASS `handsfree-desktop/sw.js`

Regression/static safety checks:
- PASS current shared API paths remain
- PASS PC safe-write + readback confirmation remains
- PASS phone read-only desktop layout remains
- PASS PC status-first startup
- PASS PC catalog warmup dedupe
- PASS mobile CORE cache restore remains
- PASS mobile asset check yields to initial read
- PASS mobile/PC static caches revalidate in background
- PASS PC APIs are not intercepted by the service worker

Vercel:
- Preview build READY for commit `f6f70fa1bf5ba52b9f4286ccea46db40c583afd8`.
- Preview browser rendering could not be independently opened by the external browser probe, so visual/timing verification on a real device remains pending.

## Limitations
- The Windows `.exe` installer source is not present in the operational branch. The existing installer is a launcher around the same Vercel-hosted HandsFree app, so these web startup changes affect its loaded application without rebuilding the wrapper. A new installer is only required if its launch URL or native wrapper behavior changes.
- No production alias or main branch was changed.
- No production Sheet/data mutation was performed.

## Rollback
Discard branch `task/startup-loading-opt-20261001` or reset to base commit `e8d61990e35d61c07fbc877155d826cb6cefd2f0`.

## Next verification before production
1. Open the preview from Windows installed app/browser and Android wrapper.
2. Compare cold launch vs second launch.
3. Confirm first usable screen appears before catalog/meta background traffic.
4. Confirm refresh, project open, write, and readback still behave normally.
5. Only after Emotion approval, promote the verified branch.
