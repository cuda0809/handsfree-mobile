# Light v1 daily schedule edit contract

The current monthly sheet contains one process per project/day. The plan ledger contains daily records, including historical overlapping source months. The existing schedule-change aggregate selects the latest row per project/process using formulas, so daily moves must not be appended there as process milestones.

| Existing field | Change | Compatibility | Rollback |
| --- | --- | --- | --- |
| Plan A record ID, E project ID, M source month, N provenance | Preserved; identity is A+M+N | Historical duplicates remain intact | No migration |
| Plan B:D year/month/date | Update only selected daily record | Date remains a numeric Sheets date | Inverse edit with a new audit event |
| Plan O:P memo/time | Record request ID, reason and timestamp | Existing columns preserved | Prior values retained in audit |
| Monthly project/day cells | Move exact process to an empty day within the displayed 31-day window | Preserve formulas, formatting and other days | Inverse edit after current revision check |
| HF_DATA_일정변경누적 | No schema or value changes | Existing project/process milestone formulas preserved | Not applicable |
| New HF_LIGHT_일정감사 | Append request, actor, immutable project/record identity, before/after, reason and receipt | Separate daily schedule audit; not a milestone aggregate | Disable route; retain audit |

All changed cells plus the audit receipt use one Sheets batchUpdate (atomic application). A ScriptLock serializes this route; revision checks detect changes since the user loaded the record. Direct spreadsheet edits by other clients are not covered by ScriptLock and may race; post-write verification reports uncertainty, never automatic retries.

Fail closed on ambiguous identity, absent project, source mismatch, occupied destination, formula-backed editable cells, invalid date, stale revision, missing reason, read-only role, disabled production gate or missing signed request. Dates outside the displayed monthly window are explicitly rejected until that month is opened in the source workflow. No automatic month rollover is introduced.

Production gate defaults closed. First verification uses a private copy of the real workbook. No operational dates are moved as tests.
