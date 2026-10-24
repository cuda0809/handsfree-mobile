# Shared PIN reset preparation — 2026-10-24 KST

User explicitly approved changing the shared PIN. The previously entered secure value is unavailable to the assistant; do not reconstruct it.

Baseline: f4655abb62d6f08dd0dc5887354af73fec0e6544. Branch: task/pin-reset-20261024. This branch excludes the separate undeployed Apps Script receipt fix.

api/sa2-auth.js now accepts server-only HF_SA2_LOGIN_PIN. An explicitly configured four-digit value replaces the old verifier; invalid configuration rejects all PINs instead of restoring the old credential. If the setting is absent, the previous authentication remains unchanged. Existing signed sessions, database, API contracts, request origin checks and failure throttling are unchanged.

The user must enter and save the new PIN in Vercel as a Secret, scoped to Preview branch codex/real-live-read-alignment-20260915 (the installed URL's deployment environment). Do not print/read back the value or add it to source. The browser currently requires Vercel administrator login before reaching settings.

Pending: user-only secret entry, deployment with this source SHA and the existing branch environment, reject-invalid/authenticated-login checks, then assigning the existing installed alias. No PIN reset or operational deployment has occurred merely by committing this file. No reinstall is needed after the existing alias is updated.

Tests use synthetic credentials: replacement/old-PIN rejection, leading zeros, input format, missing-setting compatibility, malformed-setting fail-closed. Rollback before activation: leave existing deployment unchanged. After activation, returning to f4655ab restores the old verifier and must be treated as credential rollback, not a silent deployment fallback.
