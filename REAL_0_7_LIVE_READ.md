# HandsFree Mobile REAL 0.7.0 — LIVE READ

Goal: move REAL from a trusted reference snapshot to authenticated read-only production data without opening any write path.

## Architecture
Google Sheets (HandsFree OS v3, back-data only) → standalone Google Apps Script read bridge → Vercel serverless runtime → REAL Core → Mobile UI.

## Safety rules
- WRITE gate remains locked.
- REAL never writes to the integration OS v3 during LIVE READ.
- Apps Script exposes read-only data and requires a high-entropy token.
- The Apps Script URL and token exist only in Vercel environment variables.
- Never commit the token or other credentials to GitHub.
- Reference/private fallback may keep the UI usable for diagnostics, but it must never be labeled as LIVE.
- `/api/core/live?refresh=1` is the strict gate: HTTP 200 only when the runtime is reading the Apps Script bridge and the source is labeled `OS v3 LIVE`.

## Required Vercel Preview variables
- `HF_APPS_SCRIPT_URL`
- `HF_APPS_SCRIPT_TOKEN`

The variables are scoped to preview branch `real-v0.7-live-read` during Shadow Mode. Production remains unchanged until validation passes.

## Authoritative read contract
The Apps Script bridge reads and the REAL adapter validates these seven sources before building a snapshot:
1. 제품마스터
2. 업무이력
3. HF_DATA_이슈원장
4. HF_DATA_일정변경누적
5. HF_VIEW_인력CAPA
6. HF_VIEW_브리핑소스
7. HF_DATA_90일분석이력

On any header mismatch the LIVE read must fail closed rather than silently map wrong columns.

## Verification order
1. Deploy the standalone Apps Script as Web App: Execute as Me / Anyone.
2. Create and rotate the protected read token if exposed.
3. Configure `HF_APPS_SCRIPT_URL` and `HF_APPS_SCRIPT_TOKEN` for Preview branch `real-v0.7-live-read` only.
4. Trigger a Preview deployment.
5. Call `/api/core/live?refresh=1`; require HTTP 200 and `REAL_LIVE_READ_READY`.
6. Call `/api/core/source?refresh=1`; require runtime direct read, source label `OS v3 LIVE`, and Apps Script auth/source metadata.
7. Run parity/core regression.
8. Begin Shadow Mode comparison against the sheet; keep WRITE locked.

## Promotion gate
Production promotion is blocked until LIVE READ and Shadow Mode checks pass. No SAFE WRITE work starts from a fallback/reference source.

Preview redeploy trigger after token rotation: 2026-09-11.
