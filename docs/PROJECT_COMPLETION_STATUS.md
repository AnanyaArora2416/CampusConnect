# Completion status

| Approved phase     | Delivered                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Baseline        | Versioned source, lockfile, startup/config validation, password byte bounds, safe diagnostics, secret exclusions.                          |
| 2. Authentication  | Student signup, all-role login, stored-role guards, expiry, all-device sign-out, profile/password changes, operator provisioning/recovery. |
| 3. Shared UI       | Responsive purple shell, mobile navigation/sign-out, labelled forms, native dialogs, loading/retry/error/empty states.                     |
| 4. Assignments     | Real CRUD/archive/publication/search/pagination/detail, requirements, marks, private resources.                                            |
| 5. Submissions     | Immutable final upload, timestamp/late flag, saved receipt, protected download, bounded grades and feedback.                               |
| 6. Events          | CRUD/cancel, transaction-based registration/cancellation, capacity, uniqueness, My events, organizer attendee list.                        |
| 7. Role dashboards | Scoped live counts; admin search/create/promote/disable/enable; protected administrator accounts.                                          |
| 8. Verification    | API/browser tests, responsive/accessibility scans, screenshots, CI, source formatting and full setup/API/model/architecture docs.          |

The enhanced source is ready for local setup and testing. Atlas access/configuration and hosting are separate environment requirements; no live Atlas migration or deployment is claimed.

## Explicit limits

- Attendance, transcripts, campus notifications, Google sign-in and email receipts are unavailable and labelled accordingly.
- Published assignments are campus-wide; no cohort/enrolment model exists. One immutable final submission; late work accepted/labelled. No resubmission/extension/appeal flow.
- Password recovery is an operator CLI; no reset-email service. Admins are bootstrapped by operator; user API creates student/teacher identities only.
- JWT sessionStorage can be read by scripts on the origin. CSP/escaping reduce XSS exposure; HttpOnly-cookie migration is separate work.
- Format checks are not antivirus scanning. Production needs quotas, malware scanning, file reconciliation and retention. Filesystem/database writes are not atomic; process crashes can leave orphan files.
- Archive hides and retains records/files; no purge automation. Persistent storage and coordinated backups are required.
- The auth limiter is per-process; multiple instances need a shared limiter store. Demo is loopback-only/disposable.
- Automated accessibility scans are representative coverage, not manual conformance certification. Design references informed the layout; pixel-perfect matching is not claimed.
- Legacy users require fresh login due to changed JWT format. Existing data must satisfy indexes; back up and review compatibility before production startup.
