# HandsFree REAL reliability checkpoint — 2026-10-24 KST

Status: PARTIAL; Stage 1 real authenticated end-to-end flow BLOCKED.

## Verified baseline

- Repository cuda0809/handsfree-mobile; baseline f4655abb62d6f08dd0dc5887354af73fec0e6544.
- Live Vercel deployment dpl_AZmton17nisd1yu2eYyTbuV5RL1C, READY; UI 2026.10.22.SA2.8.3-MOBILE25 / HYBRID 0.5.
- Existing URL: https://handsfree-mobile-alpha-02-git-codex-real-l-fbac1c-cuda0809-8210.vercel.app/kmt-sa2/
- Working branch task/reliability-plan-20261024. Root AGENTS.md and required starting documents read.

## Observed path and remaining uncertainty

Screen → /api/sa2-auth (name/shared PIN, signed cookie) → /api/sa2-write or /api/sa2-app → signed Apps Script bridge → queue / normalized events / business history → receipt and core/history reread → screen.

This describes repository source. Exact currently deployed Apps Script source/version remains unverified. Per-user independent authorization for 12 users is not established by the shared-PIN implementation; changing permissions is a separate decision.

Operating spreadsheet: 1maCCn4XQogypiVAn0GZeEZUclxR7A9cLc-03FRmDxZM. Existing test copy: 1fvT_2Sdj_X6cdE23ksNFBL5QZdvC76e7xr97NwkORSc. Both have 52 sheets. Test copy HF_SYS_연동소스 A1:F4 still contains operating spreadsheet references. It is NOT safe to execute copied synchronization scripts without first isolating every write target and trigger. No operating data test writes performed.

Representative read-only source: PRJ-00091 / LAB-260109K-004 / APM-20K continuous circulation mixer; past due date, research testing state, no actual shipment. Future mutation tests must use an isolated record and backend, not this live row.

## Reproduced defect and change

hfAppReceipt_ fell back to matching text/target when a supplied submissionId was missing. This could report an old WRITTEN receipt for a new unreceived submission. Changed fallback to legacy lookups lacking BOTH requestId and submissionId. Actor filtering and existing identifier recovery preserved.

Files: apps-script/HF_LIGHT_APP.gs; tests/receipt-identity.test.mjs.

Before fix: new-submission test returned WRITTEN instead of NOT_FOUND (1 failed, 3 passed). After fix: four identity tests passed. Combined receipt-identity, issue-reliability, v9-bridge and personal-write tests: 15 runner cases passed. Apps Script syntax and git diff --check passed. These are local tests, not deployed end-to-end acceptance.

## Blocker and next start

Secure browser login submitted by user returned PIN mismatch. No PIN guessing/reset or repeated attempts. Authenticated read, write/readback, cross-screen/new-session consistency, and deployed receipt behavior remain unverified. Existing secure PIN login must succeed before continuing real-flow validation.

First isolate existing copy backend/source IDs and disable production-directed execution, identify deployed Apps Script project/version, then verify representative write with receipt/readback/new session in that scope. Stage 2 production B integration and Stage 3/4 planning remain pending the Stage 1 gate. No new UI redesign or planning claims.

## Preservation and rollback

No production data/config mutation or new deployment for this fix. Source baseline remains f4655abb62d6f08dd0dc5887354af73fec0e6544; reverting this branch's receipt change restores source behavior. No data rollback required. Existing app installation unchanged; reinstall not required for this branch-only work. Keep existing development log and shared handoff updated with commit after push.
