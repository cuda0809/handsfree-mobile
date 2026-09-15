# Codex Test Rules — HandsFree REAL

Effective: 2026-09-15
Purpose: minimum verification contract for repository changes before Grow accepts a result.

## 1. General rule
A change is not complete because code was written. It is complete only when the relevant behavior is tested and the result is reported.

Minimum report for every change:
- exact files changed
- exact checks/tests executed
- pass/fail result
- production impact
- rollback point

## 2. Baseline protection
Before changing a working flow, establish the current behavior and preserve it as a regression boundary.

For HandsFree REAL, treat these as protected baselines unless Grow explicitly changes them:
- fixed production URL remains reachable
- app-layer auth remains enforced
- LIVE READ returns expected current-status data through the normal authenticated flow
- Google Sheets operating DB remains the source of truth
- READ and WRITE stay separated
- production writes are never used as an ad-hoc test mechanism

## 3. API changes
For changes under `api/`:
- syntax/import/load check must pass
- expected auth failure must remain explicit, e.g. unauthenticated request should not accidentally expose data
- upstream non-JSON/4xx/5xx failures must be surfaced rather than silently converted into stale success
- response contract used by the current UI must remain compatible unless the caller is updated in the same change
- temporary diagnostic routes must be clearly marked and removed after use

### Critical REAL endpoints
When relevant, verify:
- `/api/real-status`
- `/api/unlock`
- `/api/write`
- any temporary safe-write probe only while it is intentionally present

## 4. Apps Script changes
For files under `apps-script/`:
- no duplicate top-level identifiers/functions in the same deployment project
- exactly the intended number of `doGet` / `doPost` entry points for that deployment design
- spreadsheet ID and required sheet IDs must match the approved operating DB
- no secret/token literal may be committed
- token validation must fail closed
- Queue writes that may be concurrent must use an appropriate locking strategy
- dedupe/idempotency behavior must be deterministic
- test/probe records must stay excluded from operational history unless explicitly approved

## 5. SAFE WRITE verification
SAFE WRITE changes must be verified in stages:
1. request accepted/authenticated
2. Queue row created or deterministic duplicate detected
3. classification/normalization completed
4. safety gate applied
5. expected result is `WRITTEN`, `EXCLUDED`, `REVIEW`, `QUEUED`, `DUPLICATE`, or documented failure
6. excluded probe must not create a real `업무이력` operational write

Do not expand WRITE scope before the previous stage is verified.

## 6. Google Sheets / operating DB rules
Repository code that reads or writes the operating DB must preserve:
- RAW/history retention
- existing identifiers and traceability
- append-only history where feasible
- explicit source/provenance for normalized records
- no destructive schema migration without Grow review and Emotion approval

If a schema change is required, produce a migration map before implementation:
`old field -> new field -> compatibility impact -> rollback`.

## 7. Mobile/UI changes
For root/mobile UI changes:
- page loads without fatal console/runtime error
- current LIVE status path still works
- auth flow still works
- navigation remains usable on mobile viewport
- field input failure does not silently lose user input
- existing production root is not replaced until approved

Visual changes should be checked in a real browser/preview when available, not only by static code review.

## 8. Branch and preview rule
Implementation changes follow:
`task branch -> local/static tests -> Vercel Preview when applicable -> Grow verification -> Emotion production approval -> main`.

Do not use `main` as a scratch branch.

## 9. Security checks
Before handoff:
- no credentials or tokens added to source
- no diagnostic endpoint unintentionally left public
- no auth bypass introduced
- no production URL fallback that can hide an integration failure unless explicitly approved
- no destructive operation added without a guard/confirmation path

## 10. Definition of PASS
`PASS` means all relevant checks above were executed and passed.

`PARTIAL` means implementation may be correct but a required environment-dependent check could not be completed. State exactly what remains unverified.

`FAIL` means a tested requirement did not pass. Do not recommend production promotion.

## 11. Current REAL 0.8 gate
Before REAL 0.8 root promotion, minimum gates are:
- canonical current Apps Script integration verified directly through the intended path
- stale/hidden fallback behavior removed or explicitly redesigned and observable
- SAFE WRITE E2E verified
- temporary safe-write probe removed
- Queue concurrency/idempotency reviewed and corrected if necessary
- 30–50 Shadow validation items completed without unsafe operational writes
- Grow verification complete
- Emotion approves production promotion
