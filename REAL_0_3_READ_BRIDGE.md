# HandsFree Mobile REAL 0.3.2 — OS v3 Authenticated Read Bridge

REAL reads the private Google Sheet `핸즈프리 OS 버전 3` from Vercel serverless functions without exposing operational data or Google credentials in the public GitHub repository.

Runtime priority: private runtime snapshot → Google Sheets live read → Reference fallback. The UI remains read-only and Write Gate stays locked.

Live ranges: `제품마스터!A4:L1100`, `업무이력!A7:I220`, `HF_DATA_이슈원장!A1:P1000`, `HF_DATA_일정변경누적!A1:T2000`, `HF_VIEW_인력CAPA!A1:R2000`, `HF_VIEW_브리핑소스!A1:N1000`.

## V3 read parity guard
- `Assembly Ready` represents material / supplier-inbound readiness. A quality rework issue alone must not mark Assembly Ready as BLOCKED.
- `Flow BLOCKED` is the broader gate status and can be caused by supply, schedule or quality evidence.
- Decision Inbox respects the authoritative `HF_VIEW_브리핑소스` `결정필요` value when present. Quality issues are not automatically escalated to a human decision.
- Production B-team capacity is deduplicated to a day-level worst gap and uses the briefing source for DecisionRequired. The known 2026-09-11 capacity warning is a decision item while the 2026-09-10 leave effect remains monitoring-only.
- Today work count prefers distinct planned Project IDs from CAPA for the current date and falls back to actual work events.
- Source evidence remains read-only. No direct UI write is allowed.

Required Vercel variables: `HF_OS_V3_SPREADSHEET_ID` and `HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64` (recommended). The OS v3 spreadsheet should remain private and only be shared as Viewer with the service account `client_email` used by the runtime.

Verification: `/api/core/source?refresh=1` must report `runtimeDirectGoogleRead: true`, `label: OS v3 LIVE`, and `auth: service-account`. Production promotion remains blocked until authenticated read parity and mobile regression tests pass.
