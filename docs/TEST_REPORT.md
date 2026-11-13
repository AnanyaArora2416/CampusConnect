# Enhanced edition verification

Verified on **14 November 2026** with Node.js 24, Chromium, and isolated local MongoDB replica sets. Tests do not read `.env`, use Atlas, clear a cloud database, reset real accounts or run provisioning tools.

| Check                          | Actual local result                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `npm test` / backend API suite | 15 groups passed; zero failed/skipped.                                                                   |
| `npm run test:browser`         | 15 workflow/check groups passed.                                                                         |
| Responsive coverage            | 15 page states at 1440×1024 and 390×844; no document-level horizontal overflow; mobile sign-out visible. |
| WCAG 2 A/AA + 2.1 AA scans     | Five representative screens, zero reported violations.                                                   |
| Browser errors                 | Zero uncaught JavaScript exceptions or CSP violations.                                                   |
| Production dependency audit    | Zero known vulnerabilities at execution time.                                                            |

API coverage includes signup validation/duplicates/role escalation/bcrypt byte limits; token expiry and stored-role gates; assignment ownership/draft visibility/pagination/calendar validation/legacy defaults; PDF/ZIP/DOCX validation/private downloads/resource removal; immutable submissions/receipts/26 MiB rejection/cleanup; grading/feedback/bounds; real progress/overdue/late metrics; event ownership/capacity under concurrency/duplicate prevention/cancellation; admin provisioning/access revocation; profile/password/logout; archival retention; JSON errors/CORS/security headers/rate limits.

Browser tests use actual forms, HTTP and database persistence for all three role logins, student registration, teacher create/publish/resource upload, real search/detail links, submission receipt/refresh/download, teacher grading/student feedback, event create/register/My events/cancel, admin create/disable, role guards, profile/password/logout, and responsive pages. Only failure checks simulate a temporary API outage and an invalid token.

Accessibility screens: student dashboard, create assignment, admin users, login and registration. These scans do not replace manual assistive-technology testing.

Screenshots: `docs/screenshots/`. Machine-readable browser/accessibility results and raw command logs: `docs/testing/`. GitHub Actions is configured to rerun checks; local success does not claim an unobserved CI or production result.

No live Atlas connectivity, existing-data/index migration, external email/Google service, production deployment/backup or antivirus integration was verified. Operator account tools were reviewed without executing them on the user's database.
