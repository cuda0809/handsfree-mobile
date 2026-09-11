# HandsFree Mobile REAL 0.7.0 — LIVE READ

Goal: move REAL from a trusted reference snapshot to authenticated read-only production data without opening any write path.

## Architecture
Google Sheets (HandsFree OS v3) → Vercel serverless runtime → Google read bridge → REAL Core → Mobile UI.

## Safety rules
- WRITE gate remains locked.
- Google credentials exist only in Vercel server environment variables.
- Never commit service-account JSON/private keys to GitHub.
- Reference/private fallback may keep the UI usable for diagnostics, but it must never be labeled as LIVE.
- `/api/core/live?refresh=1` is the strict gate: HTTP 200 only when `runtimeDirectGoogleRead=true`, `auth=service-account`, and the source label is `OS v3 LIVE`.

## Required Vercel variables
- `HF_OS_V3_SPREADSHEET_ID`
- `HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64` (recommended)

Alternative credential form already supported by the bridge:
- `HF_GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `HF_GOOGLE_PRIVATE_KEY`
- optional `HF_GOOGLE_TOKEN_URI`

The private OS v3 sheet must be shared Viewer-only with the service-account `client_email`.

## Authoritative read contract
The existing `core/google-sheets-v04.js` bridge validates these seven sources before building a snapshot:
1. 제품마스터
2. 업무이력
3. HF_DATA_이슈원장
4. HF_DATA_일정변경누적
5. HF_VIEW_인력CAPA
6. HF_VIEW_브리핑소스
7. HF_DATA_90일분석이력

On any header mismatch the LIVE read must fail closed rather than silently map wrong columns.

## Verification order
1. Configure Vercel env values for Preview only.
2. Share the OS v3 sheet Viewer-only with the service account.
3. Trigger a Preview deployment from `real-v0.7-live-read`.
4. Call `/api/core/live?refresh=1`; require HTTP 200 and `REAL_LIVE_READ_READY`.
5. Call `/api/core/source?refresh=1`; require `runtimeDirectGoogleRead: true`, `label: OS v3 LIVE`, `auth: service-account`.
6. Run parity/core regression.
7. Begin Shadow Mode comparison against the sheet; keep WRITE locked.

## Promotion gate
Production promotion is blocked until LIVE READ and Shadow Mode checks pass. No SAFE WRITE work starts from a fallback/reference source.
