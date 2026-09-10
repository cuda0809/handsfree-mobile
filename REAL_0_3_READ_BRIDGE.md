# HandsFree Mobile REAL 0.3 — OS v3 Authenticated Read Bridge

REAL reads the private Google Sheet `핸즈프리 OS 버전 3` from Vercel serverless functions without exposing operational data or Google credentials in the public GitHub repository.

Runtime priority: private runtime snapshot → Google Sheets live read → Reference fallback. The UI remains read-only and Write Gate stays locked.

Live ranges: `제품마스터!A4:L1100`, `업무이력!A7:I220`, `HF_DATA_이슈원장!A1:P1000`, `HF_DATA_일정변경누적!A1:T2000`, `HF_VIEW_인력CAPA!A1:R2000`.

Required Vercel variables: `HF_OS_V3_SPREADSHEET_ID` and `HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64` (recommended). Share the OS v3 spreadsheet as Viewer with the service account `client_email`.

Verification: `/api/core/source?refresh=1` must report `runtimeDirectGoogleRead: true`, `label: OS v3 LIVE`, and `auth: service-account`. Production promotion remains blocked until read parity and mobile regression tests pass.
