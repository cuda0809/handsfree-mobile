# Light v1 Event audit compatibility map

| Existing field | Change | Compatibility | Rollback |
|---|---|---|---|
| Normalized A:T | Keep all existing fields and historic rows | Existing readers still read first 20 columns | Restore prior code |
| No explicit normalized project column | Append U `Project_ID` for new Events | Separates immutable project identity from P issue link | Retain audit; stop new writes |
| Queue D requester only | Append V `Actor_Email` from the trusted Queue D value | Never infer actor from participant names | Retain audit |
| Event entry ID prefix | Append W `Request_ID` | Direct link to immutable original request and actor | Retain audit |
| P inferred issue shortcut | New Events store the resolved project ID in P and U | P already supports issue/order IDs; historical issue links remain unchanged; original explicit issue text stays in RAW | Restore code only |
| Customer/model lookup | Distinct order IDs are distinct candidates; explicit complete ID selects one | Ambiguous equipment moves to REVIEW, never first-match writes | Restore code, do not rewrite history |

Historical rows are not backfilled or changed. New audit columns are appended only if U:W are empty or already have these exact headers. Existing unrelated columns cause a safe failure. Tests write only to the named isolated workbook copy. Monthly plans, issue status, and production dates are not changed by Event entry.
