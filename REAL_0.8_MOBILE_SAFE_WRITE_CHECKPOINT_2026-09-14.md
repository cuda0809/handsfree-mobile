# REAL 0.8 Mobile SAFE WRITE checkpoint — 2026-09-14

## Completed
- Google Sheet `현장입력` SAFE WRITE engine is OPEN and PC Enter test passed.
- Queue -> classification -> normalization -> EXCLUDED safety gate verified on 2026-09-14 test input.
- Vercel `/api/write` exists and is protected by REAL session/app key.
- Added `/real-v08/` mobile UI: FIELD INPUT posts to `/api/write`; Enter submits, Shift+Enter inserts newline; failed sends are locally backed up.
- Vercel production deployment for REAL 0.8 staging is READY and `/real-v08/` returns HTTP 200.
- Existing root REAL 0.7.1 is intentionally preserved until end-to-end write verification passes.

## Safety rules preserved
- Grow modification/deletion/schedule-change commands remain WRITE LOCKED.
- Correction Center remains review-only; no direct source mutation.
- 2026-09-14 actual work remains EXCLUDED until explicit release.
- KMT catalog logo asset is not changed.

## 2026-09-15 diagnostic update
- Vercel Authentication / Require Log In was disabled and root app access now returns HTTP 200 without Vercel SSO.
- `/api/real-status` reaches the app layer and returns `401 unauthorized_app` without a valid HandsFree app session, confirming the Vercel function is executing normally.
- READ V2 local verification on Apps Script has passed with `schema=HF_REAL_READ_V2`, `currentStatus=5`, `openIssues=5`, `tokenPresent=true`, and `spreadsheetConnected=true`.
- SAFE WRITE E2E probe showed Vercel was initially still targeting an older Apps Script deployment.
- Emotion supplied the current Apps Script deployment ID: `AKfycbwP07OxSxPd22aMlXX6k69U01sg8LZR6fg2kGT7nc1BNNGFDnb7uIGnNRJivk6epUY9`.
- Follow-up probing then found a one-character typo in Vercel `HF_REAL_READ_URL`: `...aMIXX...` was entered instead of `...aMlXX...`, causing Google HTTP 404.
- Canonical current Apps Script URL:
  `https://script.google.com/macros/s/AKfycbwP07OxSxPd22aMlXX6k69U01sg8LZR6fg2kGT7nc1BNNGFDnb7uIGnNRJivk6epUY9/exec`

## Mobile bridge baseline
- The Mobile bridge is standalone and does not depend on the SAFE WRITE engine being hosted in the same Apps Script project.
- Canonical source: `apps-script/HF_REAL_MOBILE_WRITE_BRIDGE_V1.gs`.
- It exposes exactly one `doPost`, validates the existing `HF_REAL_READ_TOKEN`, validates the operating spreadsheet / safety gate / sheet IDs, writes the canonical `FIELD_INPUT` Queue row, preserves daily dedupe, and returns `QUEUED` when the SAFE WRITE processor is hosted elsewhere.

## Current blocker
- Vercel `HF_REAL_READ_URL` must exactly match the canonical current Apps Script URL above and then be redeployed.
- `HF_REAL_READ_TOKEN` and `HF_REAL_APP_KEY` must not be changed.

## Immediate verification after correction
1. Call `/api/safe-write-probe` once.
2. Expected response is `QUEUED`, `EXCLUDED`, or `DUPLICATE`; never Google 404 and never `Script function not found: doPost`.
3. Verify Queue row creation and downstream SAFE WRITE processing.
4. Confirm the 2026-09-14 probe stays EXCLUDED and does not create an `업무이력` write.
5. Re-check `/api/real-status` through the normal HandsFree app-key session flow.
6. Only after these checks pass, promote REAL 0.8 UI to root and run 30–50 item Shadow validation before expanding write scope.

## Shared Grow × Codex operating model — effective 2026-09-15
- Emotion owns goals, priorities, and final approval for consequential changes.
- Grow owns architecture, requirement interpretation, sequencing, safety, integration, and final verification.
- Codex is the preferred execution layer for repository-scale code changes, bug fixes, refactors, tests, and repeatable implementation work.
- Grow should perform everything it can directly first and only ask Emotion for actions that require user-only permissions, physical/UI interaction, credentials, billing, destructive changes, deployment approvals, or other capabilities Grow/Codex cannot safely perform.
- Repository code changes should be executed and tested before asking Emotion to paste or hand-edit snippets. Full replacement files are preferred whenever manual handoff is unavoidable.
- Production data, permissions, deployment targets, cost-bearing actions, and structural changes require Emotion approval before final application.
- PC and mobile are one continuous workstream; the latest verified checkpoint is the single source of truth.
- The same operating model applies to HandsFree REAL and Game Project #001.
