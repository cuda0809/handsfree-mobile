# Save reliability and research transfer — partial

Live build remains MOBILE25, f4655abb62d6f08dd0dc5887354af73fec0e6544. No production deployment performed.

Authorized operational event recorded for LAB-260109K-004 / PRJ-00091: 연속순환믹서 연구소 이관 완료. Server history confirms WRITTEN, request HF-20261024-095537-f1df886b, 2026-10-24 09:55:40 KST. A separate process-preservation event is part of the same request. No resend. UI receipt confirms readback.

Current canonical issue ISS-20260907-011 still MONITOR with Current_State 금일 연구소 이관 예정 (2026-10-16); current card retains old parts-delay reason and overdue badge. Transfer event does not currently update lifecycle state. No customer shipment or actual transfer date invented. Old issues preserved. editIssue exists but no UI caller found in current kmt-sa2 source.

Consolidated receipt identity fix: an explicit submissionId may not fall back to old identical text. Existing month-boundary safety fix retained. node --test tests/receipt-identity.test.mjs tests/schedule-month-boundary.test.mjs: 12/12 passed, mocks only. Production Apps Script deployment mapping/access not verified, so patches are NOT live. Do not claim save reliability fully resolved. Test GAS authorization remains blocked at Google consent; separate test implementation is not operational proof.

Next: identify exact operational GAS deployment/project/version, deploy receipt fix with backup, expose audited current-state editing or implement explicit internal transfer lifecycle, then verify production readback and independently authenticated session. Do not write computed Core cells directly. PIN unchanged.
