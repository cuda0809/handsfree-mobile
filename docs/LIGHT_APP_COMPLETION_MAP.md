# Light v1 complete flow contract

Existing source tables remain authoritative. No A/B switching, new AI model, photo/QR or push expansion in this cycle.

| Existing field/path | Fix | Compatibility / rollback |
|---|---|---|
| Existing delivery annual/monthly and support tables | Read through signed personal API and display actual aggregates | Read only; no synthetic totals |
| Product master IDs including twin equipment | Expose all existing projects and require an exact project for daily schedule/input | No ID rewriting; wildcard issue groups stay groups |
| Queue + normalization | Read own server receipts and project Event history | No resend; existing RAW/queue retained |
| Issue Current_State, Next_Action, Status, State_Since, Latest_Update, Closed_At, Briefing_Active | Explicit personal-user edit with original revision and reason | Only listed cells; atomic batch with new audit; rollback via another logged change |
| No issue-state audit table | Append HF_LIGHT_상태감사, 12 columns matching schedule audit structure | Existing issue and source Event IDs preserved; never delete audits |
| Schedule audit only last local receipt | Read server project change history | Both schedule and state audit shown separately from Events |
| Client submission ID discarded | Preserve UUID in Queue payload and prefer it for receipt recovery | Legacy own request/text lookup still available; no automatic retry |

Issue editing requires HF_LIGHT_APP_OPEN=OPEN and existing Google Owner/Writer permission. Reads recheck allowed accounts. Ambiguous or stale requests fail closed. Test writes use only the named isolated workbook. Existing KMT_CONFIRMED_EDIT stays closed; the old unsynchronized plan-edit path is not activated.
