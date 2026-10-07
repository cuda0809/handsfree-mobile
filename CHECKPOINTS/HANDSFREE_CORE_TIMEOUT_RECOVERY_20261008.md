# HandsFree Core timeout recovery — 2026-10-08 08:46 KST

- Incident: installed PC app reported timeout. Logs on final j6 deployment 75Mme show core timeout after 45004ms at 08:40 (execution) and 08:42 (result), while catalog/plans return in 2–4 seconds. Google transport or execution latency remains underlying cause; do not claim proven permanent cure.
- Source baseline restored from remote checkpoint/handsfree-final-j6-20261008 after automated scratch cleanup. Parent 183bf8eea0fee2440badfdc32b254b91e097a543 preserves prior immutable fixes and operating rules.
- Change: lib/apps-script-read.mjs permits only signed light_app core reads to recover a transient timeout/reset once using a new execution nonce. First hop waits at most 20 seconds, preserving time for a fresh attempt under the unchanged 45-second total deadline. Authorization/semantic failures never retry. Credentials never reach Google result URL. WRITE paths unchanged. Other read paths unchanged. No stale data substituted.
- Tests: tests/apps-script-read-transport.test.mjs, 9/9 PASS, syntax PASS. Covers result stall recovery, reset recovery, repeated-stall deadline, rejection, redirect safety, no result credential forwarding, whitelist isolation, prior 404 recovery.
- Remote code commit 74eea0c61abc8d807d8b55823c2be9a660c4b2d2; task/core-timeout-recovery-20261008. Deployment dpl_Bzvzn9uJMgYkwizZMCSmwwJA9TJ5 with original environment ref codex/real-live-read-alignment-20260915, exact new SHA. Do not deploy an unscoped branch (missing credentials).
- UI files, j6 filters/year behavior, PC enlargement, auth/env settings, database unchanged. Full authenticated live recovery must be checked through installed-app runtime logs. Simulated tests establish recovery mechanics only.
- Rollback: installed alias to dpl_75MmejbmLYJVUBHGHMJymeUdgWhe. Do not restore legacy READ_URL.

- Deployment READY; auth GET 200; installed alias assigned to Bzvzn. Authenticated Core recovery still awaiting real app request.
