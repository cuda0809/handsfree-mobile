# HandsFree Mobile REAL 0.2 — Source-aware Core checkpoint

Date: 2026-09-10

## What changed
- The mobile product remains project-lifecycle-first: Today / Projects / Grow / Issues / Search.
- The Core now has a runtime source boundary (`core/runtime.js`).
- New operational exports from OS v3 must not be committed to the public repository.
- A private server runtime snapshot can be injected through `HF_OS_V3_SNAPSHOT_JSON`.
- If the private source is unavailable, the application explicitly reports REFERENCE mode rather than pretending it is live.
- `Assembly Ready` is tri-state: READY / BLOCKED / UNKNOWN. Missing material evidence never becomes READY by inference.
- Project detail is evidence-first: linked Issues, Changes and Events are shown together.
- Today can surface source freshness and workforce CAPA when the private source provides it.
- Search spans PROJECT / EVENT / ISSUE / CHANGE when available.
- Grow remains read/decision only. Write verbs are blocked until the queue write gate is connected.
- Service worker cache is bumped to REAL v0.2 and includes the Core adapter.

## Security gate
The current GitHub repository is public. Therefore customer/project/issue data read from the authoritative OS v3 sheet is not added to source control. REAL production data must come from a private runtime source or an authenticated Google bridge.

## Write gate
OS v3 defines mobile writes through `HF_DATA_입력대기열` (Queue → validation → operational apply). REAL 0.2 intentionally does not write directly to `업무이력` or planning sheets.

## Next production gate
1. Configure a private authenticated OS v3 runtime source.
2. Add user authentication for the production app.
3. Connect append-only queue writes with validation, dedupe and audit evidence.
4. Promote only after read synchronization and write rollback tests pass.
