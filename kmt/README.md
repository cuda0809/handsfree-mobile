# KMT HandsFree installable web app

Entry: `/kmt/`. Existing root and `/real-v08/` remain unchanged.

Implemented: approved logo and theme; authenticated live issue overview/search/details; device draft persistence; retained receipts; explicit SAFE WRITE submission and response status; latest read after applied response; bounded loading; unknown-response protection; voice browser feature detection; install manifest and shell-only offline cache; update check.

Not yet operational: personal identity/roles, server receipt synchronization/status recovery, production/support totals, approved stage schedules, photo uploads, QR scanning, remote AI model, push notifications. These are labeled unavailable rather than synthesized.

Phone installation: open HTTPS `/kmt/` in Safari (iOS) or Chrome (Android), use Add to Home Screen / Install. Physical phone installation and microphone permissions require device verification. SVG icon support varies; verify both devices before release.

Storage: localStorage `kmt-draft-v1` and `kmt-notes-v1`; same-origin, device-local. App keys are never written to localStorage. Successful server response and refreshed operational data are distinct evidence. Operational server may route an input to review/exclusion rather than change current state.

Rollback: remove `/kmt/` addition or revert its commit on the preview branch; no source database or production deployment change is required.
