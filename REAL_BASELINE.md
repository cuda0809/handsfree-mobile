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
- Internal API/data codes may remain English, but every user-visible app label, status, help text and operating term must be presented in Korean. Product/model/order identifiers are not translated.
- Plan consumption and physical completion are different measures. Plan progress must never be displayed as physical completion without direct evidence.
- Shipment readiness is evidence-based. Missing approval/test evidence remains `확인 필요`; REAL does not infer final shipment approval.

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
V3 read-parity guard was implemented. Assembly Ready was separated from general flow blockage, V3 decision evidence was respected, and a parity diagnostic endpoint was introduced while Write Gate remained locked.

## REAL 0.3.3 checkpoint — 2026-09-10
Korean presentation policy was implemented for the mobile app without changing internal Core contracts. User-visible labels/status/help text are Korean while model/order identifiers and internal API codes remain unchanged.

## REAL 0.4.0 checkpoint — 2026-09-10
Production-readiness decision model is implemented from a veteran equipment-production perspective.

Implemented:
- Added `core/production-readiness.js` with four decision axes: physical completion vs plan consumption, critical-material readiness, quality reverification, and shipment-readiness gates.
- Physical completion is intentionally `확인 필요` when direct actual-progress evidence is absent. Plan-based `% · 계획기준` is retained only as plan consumption.
- Added `core/google-sheets-v04.js` read-only bridge range for `HF_DATA_90일분석이력`, mapping production slack, production state, final inspection, bottleneck, purchase status, assembly-available date and actual-basis evidence.
- Project Core now exposes `physicalCompletion`, `planConsumption`, `productionSlackDays`, `bottleneck`, `assemblyAvailableDate`, `analysis90`, and structured `readiness`.
- Critical-material readiness uses current supply/inbound issues and 90-day purchase/assembly evidence but explicitly marks part-level critical-material data as not yet connected.
- Active quality issues force the quality gate to `재검증 필요`; modification records alone do not close the gate.
- Shipment readiness separately evaluates material, quality, test evidence, final inspection and shipment approval. Hard material/quality blockers produce `출고 조건 보류`; otherwise incomplete evidence remains `출고 조건 확인`. Even a fully clear operating state is only `출고 가능 후보` until explicit shipment approval exists.
- Project detail now starts with a Korean `생산판단 4대 기준` panel and shows actual completion, plan consumption, critical materials, quality reverification, shipment condition, assembly-available date, production slack and bottleneck.
- `/api/core/parity` now checks readiness model presence, forbids fake physical progress, verifies quality reverification gating, verifies hard shipment holds, and requires 90-day analysis rows when authenticated LIVE read is active.
- PWA shell cache advanced to `handsfree-real-v040` and version marker to `REAL-0.4.0 / PRODUCTION_READINESS_4_AXIS`.

Verification:
- REAL 0.4.0 Preview deployment reached READY.
- Vercel build completed with no build errors.
- No error/fatal runtime logs were found in the checked Preview window.
- Preview remains Vercel-auth protected, so body-level authenticated Google LIVE parity is still pending.
- Google Sheet operational ledgers were not modified by this checkpoint; REAL remains read-only.

## Next production gate
1. Connect authenticated OS v3 LIVE read and run `/api/core/parity?refresh=1` until every read/parity/readiness check passes.
2. Add a structured `PART / CRITICAL_MATERIAL` ledger: Project ID, Part No, item, required quantity, received quantity, vendor, planned inbound, actual inbound, incoming-inspection status and Blocking flag.
3. Add a structured `PHYSICAL_PROGRESS` ledger so actual completion and remaining effort become direct evidence rather than `확인 필요`.
4. Add `QUALITY_VERIFICATION` and `SHIPMENT_GATE` evidence ledgers for correction → reverification → pass and assembly/electrical/program/test/inspection/FAT/correction-closed/shipment-approval states.
5. Only after reliable read parity and evidence schemas pass, implement append-only EVENT Write Gate through queue → validation → dedupe → audit evidence → post-write re-read verification.
