# HandsFree Mobile — REAL

## Status
REAL lineage is active on branch `real-v0.1`. The former Alpha/V3 work is preserved as development history and reference material; REAL does not rewrite or delete that history.

## Product definition
HandsFree Mobile REAL is a mobile-first operating system for make-to-order equipment production. Its job is not to reproduce a spreadsheet on a phone. Its job is to connect one Project/Order ID across planning, design handoff, purchasing, supplier inbound, assembly, electrical work, programming, testing, inspection/FAT, shipment, field support and A/S, then surface only the decisions that require a human.

## Primary UX
Bottom navigation is fixed to five user concepts:
1. Today — decisions, work, blockers, capacity.
2. Projects — one equipment/project lifetime view.
3. Grow — natural-language command and decision assistant.
4. Issues — active delay/quality/supply/resource issues.
5. Search — company/project history search.

## Core rules
- Project lifecycle, not month, is the primary object.
- Calendar/month screens are views, not the source data model.
- Initial plans are immutable baselines; changes are separate events.
- Work facts are append-only events; corrections are traceable.
- Supplier inbound and customer shipment are distinct meanings.
- Purchasing percentage is secondary to Assembly Ready and blocking parts.
- Assembly Ready means material/supplier-inbound readiness; general production flow blockage is tracked separately.
- Capacity evolves from headcount FTE to skill/capability capacity.
- Risk is based on remaining required work, dependencies, material readiness, skill capacity and protected test/FAT time.
- Grow reads current data first, explains risk and raises only high-impact choices for approval.
- High-risk decisions such as customer due-date changes remain human decisions.

## Data model target
PROJECT → WORK_PACKAGE / PLAN → EVENT → CHANGE → ISSUE → PART/SUPPLY/VENDOR → RESOURCE/SKILL → QUALITY/A-S → IMPACT/RISK → ROLE VIEWS.

## Migration policy
No legacy data is deleted. Alpha/V3 is reference history. REAL imports and normalizes useful data into the new model incrementally, with Project/Order ID as the join key. Operational Google Sheet data and Google credentials must not be committed to the public GitHub repository.

## REAL 0.1.1 checkpoint — 2026-09-10
The first structured Core read layer was implemented with Decision Inbox, project lifecycle, issues, unified search and a compatibility dashboard bridge. Grow read operations were enabled while write/change operations remained locked.

## REAL 0.2 checkpoint — 2026-09-10
Source-aware security boundaries were introduced. Runtime operational data is separated from the public code repository, and the app can fall back to a reference source without pretending that reference data is live.

## REAL 0.3.1 checkpoint — 2026-09-10
Evidence-first project detail was added. Project detail connects current state, open issues, schedule changes, recent events and capacity impact rather than showing only a card-level summary.

## REAL 0.3.2 checkpoint — 2026-09-10
V3 read-parity guard is implemented on branch `real-v0.1`.

Implemented:
- Authenticated Google Sheets read bridge supports the authoritative private OS v3 source without putting credentials or new operational exports in GitHub.
- Live source ranges include `제품마스터`, `업무이력`, `HF_DATA_이슈원장`, `HF_DATA_일정변경누적`, `HF_VIEW_인력CAPA`, and `HF_VIEW_브리핑소스`.
- Decision Inbox now respects the V3 briefing source `결정필요` evidence when available instead of escalating every quality issue automatically.
- Assembly Ready is separated from Flow BLOCKED. Quality rework can block the next production gate without falsely implying that material readiness is blocked.
- Quality processes such as `가공/외주` are no longer misclassified as supply blockage solely because the process name contains `외주`.
- Today work count prefers distinct planned Project IDs from current-date CAPA, with actual work events as fallback.
- Capacity decision items are day-level deduplicated and use V3 briefing evidence for human-decision escalation.
- Project detail explicitly displays both `Assembly Ready` and `Flow` status.
- PWA shell cache advanced to `handsfree-real-v032`.
- Version marker advanced to `REAL-0.3.2 / V3_READ_PARITY_GUARD`.

Verification:
- Latest REAL 0.3.2 Preview deployment reached READY.
- Vercel build completed with no build errors.
- No runtime errors were found in the post-deployment check window.
- Preview remains Vercel-auth protected. The available connector cannot complete cookie-based body verification of `/api/core/source`, so `runtimeDirectGoogleRead:true` has not yet been proven from a live response in this session.
- Write Gate remains locked.

## Next production gate
1. Prove authenticated OS v3 LIVE read by verifying `/api/core/source?refresh=1` reports `runtimeDirectGoogleRead:true`, `label: OS v3 LIVE`, and `auth: service-account`.
2. Run read-parity checks against authoritative V3 values for project count, current work, open issues, schedule changes, Decision Inbox and CAPA.
3. Only after read parity passes, implement append-only EVENT Write Gate through queue → validation → dedupe → audit evidence → post-write re-read verification.
4. Human approval remains mandatory only for high-risk decisions such as due-date/external commitment changes.
