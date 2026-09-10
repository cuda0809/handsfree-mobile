# HandsFree Mobile — REAL

## Status
REAL 0.1 baseline. The former Alpha/V3 work is preserved as development history and reference material. This branch begins the production lineage without rewriting or deleting that history.

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
- Capacity evolves from headcount FTE to skill/capability capacity.
- Risk is based on remaining required work, dependencies, material readiness, skill capacity and protected test/FAT time.
- Grow reads current data first, explains risk and raises only high-impact choices for approval.
- High-risk decisions such as customer due-date changes remain human decisions.

## REAL 0.1 scope
The first usable shell must provide:
- Decision Inbox as the first content on Today.
- Today work and blocker cards.
- Project cards and a lifecycle detail sheet.
- Active issue list.
- Global search.
- Grow command sheet.
- Compatibility adapter for the existing `/api/dashboard` and `/api/command` contracts while the new Core API is built.

## Data model target
PROJECT → WORK_PACKAGE / PLAN → EVENT → CHANGE → ISSUE → PART/SUPPLY/VENDOR → RESOURCE/SKILL → QUALITY/A-S → IMPACT/RISK → ROLE VIEWS.

## Migration policy
No legacy data is deleted. Alpha/V3 is reference history. REAL imports and normalizes useful data into the new model incrementally, with Project/Order ID as the join key.
