# REAL 0.8 Mobile SAFE WRITE checkpoint — 2026-09-15 refresh

## Current verified operating state
- HandsFree REAL mobile Production opens from the fixed Vercel root URL.
- Mobile LIVE status display is currently usable.
- App-layer auth remains active; unauthenticated `/api/real-status` requests are rejected by the application layer rather than Vercel SSO.
- READ V2 local Apps Script verification previously passed with `schema=HF_REAL_READ_V2`, `currentStatus=5`, `openIssues=5`, `tokenPresent=true`, and `spreadsheetConnected=true`.
- Google Sheet `현장입력` SAFE WRITE engine is OPEN and the PC Enter test passed.
- Queue -> classification -> normalization -> EXCLUDED safety gate was verified on the 2026-09-14 test input.
- Vercel `/api/write` exists and is protected by REAL session/app key.
- `/real-v08/` mobile UI exists: FIELD INPUT posts to `/api/write`; Enter submits, Shift+Enter inserts newline; failed sends are locally backed up.
- Root Production baseline remains preserved until REAL 0.8 end-to-end gates pass.

## Important integration finding from 2026-09-15 review
- The mobile screen can show LIVE success while the intended newest Apps Script integration is not actually the path serving the successful READ.
- Review of `api/real-status.js` and Vercel execution behavior found that a configured current Apps Script request could fail while a hardcoded last-known-good READ fallback returned success.
- Therefore `LIVE visible` is not by itself proof that the canonical current Apps Script path is fully verified.
- `/api/write` does not share the same READ fallback behavior, creating a possible READ/WRITE asymmetry: READ may appear healthy while WRITE still fails against the configured current URL.
- This fallback behavior must be removed or redesigned to be explicit and observable before REAL 0.8 production promotion.

## Canonical integration reference
Current approved Apps Script deployment URL on record:
`https://script.google.com/macros/s/AKfycbwP07OxSxPd22aMlXX6k69U01sg8LZR6fg2kGT7nc1BNNGFDnb7uIGnNRJivk6epUY9/exec`

Secrets must not be rotated or exposed merely to diagnose routing:
- keep `HF_REAL_READ_TOKEN`
- keep `HF_REAL_APP_KEY`

## Mobile bridge baseline
- Canonical source: `apps-script/HF_REAL_MOBILE_WRITE_BRIDGE_V1.gs`.
- The Mobile bridge is standalone and does not depend on the SAFE WRITE engine being hosted in the same Apps Script file.
- It exposes one intended `doPost`, validates the existing `HF_REAL_READ_TOKEN`, validates the operating spreadsheet / safety gate / sheet IDs, writes the canonical `FIELD_INPUT` Queue row, and returns defined SAFE WRITE statuses.

## Safety rules preserved
- Grow modification/deletion/schedule-change commands remain WRITE LOCKED unless explicitly approved.
- Correction Center remains review-first; no casual direct source mutation.
- 2026-09-14 probe/test records remain EXCLUDED from real operational history.
- RAW/history preservation remains mandatory.
- Existing Google Sheets operating DB remains the operational source of truth.
- READ and WRITE remain logically separated.

## Current priority before REAL 0.8 promotion
1. Verify the canonical intended Apps Script READ path without hidden stale fallback.
2. Align WRITE with the same approved deployment/configuration path.
3. Remove or explicitly redesign the hardcoded READ fallback so configuration failures cannot be silently masked.
4. Complete SAFE WRITE E2E verification.
5. Remove the temporary safe-write probe endpoint after its purpose is complete.
6. Add/verify Queue concurrency protection (`LockService` or equivalent appropriate strategy).
7. Improve dedupe/idempotency so legitimate same-day repeated text for different targets is not incorrectly collapsed.
8. Run 30–50 Shadow validation items with no unsafe operational write.
9. Grow performs final verification.
10. Emotion approves Production promotion.

## Codex-ready repository workflow
Effective 2026-09-15:
- Root `AGENTS.md` defines mandatory Codex behavior and production boundaries.
- `CODEX_TEST_RULES.md` defines the minimum test/verification contract.
- `GROW_CODEX_OPERATING_MODEL.md` defines the Emotion -> Grow -> Codex -> Grow verification operating model.
- `UPDATE_POLICY.md` defines task branch -> test -> Preview -> Grow verification -> approval -> main/Production flow.
- Codex must read these files before substantial HandsFree REAL implementation work.
- `main` must not be used as a scratch branch.
- Production data mutation, deployment promotion, permissions, cost-bearing changes, and consequential structural changes remain under Emotion approval.

## Grow × Codex operating model
- Emotion states goals and owns final consequential approval.
- Grow interprets, designs, sequences, and verifies.
- Codex implements and tests inside the approved scope.
- HandsFree stores and operates on verified approved data.
- Emotion should not need to decide which technical executor to use; Grow routes the work.
- If a problem occurs, diagnose -> alternative -> test -> verify; do not stop at “cannot verify.”

## Next technical work package for Codex
The next implementation package should be narrowly scoped to:
- inspect `api/real-status.js`, `/api/write`, Apps Script bridge, and current env-dependent routing assumptions;
- remove hidden stale-success behavior while preserving current user-visible LIVE availability during controlled verification;
- add deterministic tests/checks for auth, upstream failure handling, SAFE WRITE queueing, concurrency, and dedupe/idempotency;
- produce a Grow handoff report in the format required by `AGENTS.md`.

Do not promote that package to Production until Grow verification is complete and Emotion approves the promotion.
