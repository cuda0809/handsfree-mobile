# KMT mobile app invariants

- This is the user's approved navy KMT design, converted from design-preview. Preserve its visual identity.
- The blue KMT logo embedded in theme.js and icon.svg is the approved original screenshot. Original SHA256: 319EC030FE49E8EE789BB7DC2D87EA5477840E184A5C582998753EE5A30E4092.
- Do not regenerate, redraw, recolor, replace or distort the logo. The only user-approved crop is x=32,y=47,width=94,height=50 to exclude the black table borders.
- Use existing authenticated /api/real-status and /api/write routes. Preserve deployed READ URL, token and source Sheets.
- Never present sample production totals, schedule dates, AI replies or input completion as real results.
- Device drafts and receipts are local. Never claim cross-device sync or guaranteed delivery.
- Ambiguous write responses must not be automatically retried: existing backend does not guarantee persistent idempotency by client submission ID.
- Service worker caches only public application shell, never API responses. Increment its cache version for shell changes and verify restart/update behavior.
- Test writes only on isolated/shadow data. Production promotion requires user approval.
