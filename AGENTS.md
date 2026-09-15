# AGENTS.md — Grow × Codex Repository Instructions

Effective: 2026-09-15
Scope: entire `cuda0809/handsfree-mobile` repository unless a deeper `AGENTS.md` overrides it.

## Mission
This repository supports the Grow × Emotion operating model.

Core motto:
> Emotion speaks. Grow interprets and decides. Codex implements and tests. Grow verifies. HandsFree remembers and operates.

Codex is an execution layer, not the product owner. Preserve the user's intent, the latest verified checkpoint, and production safety boundaries.

## Authority and roles
- **Emotion**: owns goals, priorities, and final approval for consequential decisions.
- **Grow**: owns architecture, requirement interpretation, sequencing, safety, integration, and final verification.
- **Codex**: implements repository-scale code changes, bug fixes, refactors, tests, and repeatable technical work inside the approved scope.

Read `GROW_CODEX_OPERATING_MODEL.md` before substantial work.

## Mandatory starting context
For HandsFree REAL work, read these files before editing implementation code:
1. `GROW_CODEX_OPERATING_MODEL.md`
2. `REAL_0.8_MOBILE_SAFE_WRITE_CHECKPOINT_2026-09-14.md`
3. `CODEX_TEST_RULES.md`
4. `UPDATE_POLICY.md`
5. `RELEASE_PIPELINE.md` when Android/release work is involved

For Game Project work under `bastian/`, preserve the same Grow × Codex operating model, but do not mix Game changes into HandsFree REAL changes unless Grow explicitly requests it.

## Production protection rules
1. **Do not edit `main` directly for implementation work.** Use a dedicated branch.
2. **Do not promote to production automatically.** Production promotion requires Emotion approval after Grow verification.
3. **Do not mutate production Google Sheets data as part of code testing.** Use excluded/test/shadow paths only.
4. **Do not rotate or expose secrets.** Never print or commit `HF_REAL_READ_TOKEN`, `HF_REAL_APP_KEY`, signing passwords, keystores, or equivalent credentials.
5. **Do not silently fall back to stale production integrations.** If the configured live integration fails, surface the failure unless a fallback is explicitly approved and observable.
6. Preserve working LIVE READ while improving WRITE paths. A successful current production behavior is a regression boundary.
7. RAW/history preservation is mandatory. Prefer append-only or reversible migrations over destructive rewrites.

## HandsFree REAL invariants
- Google Sheets operating DB remains the operational source of truth.
- READ and WRITE paths stay logically separated.
- SAFE WRITE must pass Queue -> classification/normalization -> safety gate before any operational write.
- Current mobile LIVE behavior must not regress during refactors.
- Existing current-state semantics remain authoritative: `Current_State`, `State_Since`, `Next_Action`.
- `2026-09-14` probe/test records remain excluded from real operational history unless Grow explicitly changes that rule.
- The root production UI remains on the currently approved baseline until Grow verification and Emotion production approval.

## Coding behavior
- Prefer the smallest change that satisfies the approved requirement.
- Avoid broad refactors during incident fixes unless necessary for correctness.
- Reuse existing naming and data contracts where possible.
- When changing an API contract, update all callers and tests in the same change.
- Keep environment-specific values in environment configuration, never hardcoded production URLs/tokens unless a documented immutable public constant is intentionally required.
- Remove temporary diagnostic endpoints after their verification purpose is complete.

## Required verification before handoff
Every code change must report:
- files changed
- behavior changed
- tests/checks run
- pass/fail result
- known limitations
- rollback point
- whether production approval is required

Use `CODEX_TEST_RULES.md` as the minimum verification contract.

## Failure handling
Do not stop at “cannot verify.”
1. identify the blocker,
2. try an available alternative,
3. isolate whether the failure is code, configuration, permissions, environment, or external service,
4. rerun the smallest relevant test,
5. report only what was actually verified.

Do not mask failures by switching to an old integration path unless that fallback is explicitly part of the approved design and visibly reported.

## User-interaction rule
Do not ask Emotion to hand-edit snippets when Codex can make the repository change directly. If user-only action is unavoidable, Grow should reduce it to the smallest safe step.

## Change isolation
Keep unrelated work separated:
- HandsFree REAL changes should not modify `bastian/` unless explicitly requested.
- Game work should not alter REAL API/App Script/production files unless explicitly requested.
- Documentation-only changes should not be bundled with behavior changes unless needed to describe the same change.

## Handoff format to Grow
End substantial Codex work with a concise report:

```
STATUS: PASS | PARTIAL | FAIL
SCOPE: <approved task>
CHANGED: <files>
VERIFIED: <checks/tests>
RISKS: <remaining risks>
PRODUCTION: approval required | no production change
ROLLBACK: <commit/branch or reversal note>
NEXT: <single recommended next action>
```
