# HandsFree REAL execution audit — 2026-10-24 KST

Status PARTIAL / real save verification BLOCKED. No operational data mutation, PIN rotation or deployment performed.

## Actual browser checks

Existing PIN login succeeded. MOBILE25 / HYBRID 0.5 read 153 Core records. New tab moved from explicitly stale cached display to confirmed latest read. This is same-browser/new-tab verification, not an independent browser session.

LAB-260109K-004 continuous circulation mixer is visible despite overdue due date. Today card, detail, project overview and issue page show matching identity/status. Server history returns saved WRITTEN events including 2026-10-20 research transfer. Original progress-grid explanatory phrases are absent in observed issue grid. Plan page loads and renders equipment schedules. Logged-in header still says Login; this is a remaining presentation inconsistency.

Observed production plan automatically assumes finishing assembly 1–2 weekdays after programming and before inspection. This is a heuristic, not the resource/material/design constrained engine requested. Realistic planning acceptance is NOT met. 64's shown due date is 2026-10-05; verify its semantic source against approved customer/inspection/shipment dates before modifying data.

## Regression execution

Ran node --test tests/*.test.mjs on f4655ab workspace with the separately prepared undeployed PIN change: 210 cases, 189 pass, 21 fail. Sanitized failing-case inventory in HANDSFREE_AUDIT_20261024_TEST_OUTPUT.txt. Raw output remains temporary, not a source of truth.

Failures are NOT equivalent to 21 confirmed product bugs. Confirmed harness/expectation problems include old APK/build strings, extraction harnesses missing currentIssueRows/isCarryoverStock/teamMatches/planReviewReasons/norm/isABTeam/itemById, a bool expectation for a now-structured readback result, and fetch mocks not intercepting the current HTTPS transport (example.invalid only; no operational network writes). Remaining semantic differences include unknown-equipment note visibility and saved_unverified vs applied receipt expectations; require contract-level reconciliation. Tests were not weakened merely to obtain green status.

Existing schedule tests exercised atomic requests, revision conflicts, duplicate IDs, formula protection, role rejection, forged signatures and expiry with mock services. Existing safe-write shadow tests exercised 45 classifier cases and token/lock/target dedupe. These do not prove deployed behavior.

## Newly reproduced and fixed product defect

HF_LIGHT_SCHEDULE assumed every month had 31 days. Reproduced a September 2026 plan accepting October 1 as APPLIED and advertising it as maxDate. This could write an adjacent-month date into the wrong monthly grid column.

Changed actual month-length boundary in record validation, advertised maxDate and write validation. Added eight regression cases spanning February, leap February, September and December, including corrupted next-month rows and receipt replay. Nine runner cases passed with schedule-readback; syntax and diff checks passed. Files: apps-script/HF_LIGHT_SCHEDULE.gs and tests/schedule-month-boundary.test.mjs. Source only, not deployed. Prior receipt identity fix remains separately saved at 9c978a8b898da8678d2fe42a23e6fc3965ba4287.

## Real write blocker verified by execution

Opened existing Apps Script project 1ZJrXNPVLvEbR58QIIa6hvc2Cn0uT_pDpQT6ZaD2BxoevCUfrC9qJx-50. Executed read-only loadTest. Execution requested authorization; Review permissions opened Google's 'unverified app' warning. Did not bypass warning/grant permissions. Therefore no actual test write, readback or response-loss replay occurred.

This standalone test source is different from the operational bridge. Even its eventual success would not establish operational E2E. Existing copied source registry contains operating DB references; original sync scripts must not execute from the copy before all write targets are isolated. setupTest also creates backups and a daily trigger, so it was not run as a diagnostic.

## Preservation / next start

Task branch task/stability-audit-20261024 based on f4655abb62d6f08dd0dc5887354af73fec0e6544. No main changes. Revert the schedule patch to restore source; no data rollback needed. Separate PIN work remains undeployed on task/pin-reset-20261024 / 8eb5a733ac1fd335b526e0255d63ba03d5ac600e.

Next: resolve test-project consent through user-only authorization, establish an isolated instance of the actual operational code, deploy receipt/month-boundary fixes there and run real save→receipt→readback→new session/conflict/replay checks. Only then advance production B integration and constrained planning. Do not replace these gates with a mock PASS claim.
