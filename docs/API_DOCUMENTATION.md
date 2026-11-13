# API reference

Base `/api`. JSON unless multipart/download. Protected routes require `Authorization: Bearer <JWT>`. Do not log tokens. Error shape `{message}`; statuses 400 validation, 401 session, 403 role, 404 unavailable/private record, 409 duplicate/stale/capacity/state conflict, 413 oversize, 429 auth throttling, 500 generic failure.

## Authentication

| Method / path                                            | Access        | Input / result                                                                 |
| -------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------ |
| POST `/auth/register`                                    | Public        | `{name,email,password,role?}`; role absent/student only. 201 safe user.        |
| POST `/auth/login`                                       | Public        | `{email,password}`; one-hour `{token,user}`.                                   |
| GET `/auth/me`                                           | Signed in     | Safe user: id/name/email/role/status.                                          |
| PATCH `/auth/me`                                         | Signed in     | `{name}` only.                                                                 |
| PUT `/auth/password`                                     | Signed in     | `{currentPassword,newPassword}`; check current password and revoke all tokens. |
| POST `/auth/logout`                                      | Signed in     | Revoke all tokens for this account.                                            |
| GET `/auth/student-area`, `/teacher-area`, `/admin-area` | Matching role | Authorization diagnostic.                                                      |

Names 2–100 characters, email normalized, password minimum 8 characters / maximum 72 UTF-8 bytes. Unknown fields rejected. Combined login/register throttle: 30 requests per IP per 15 minutes, in-process store.

## Assignments and submissions

| Method / path                                         | Access                                   | Behavior                                                                |
| ----------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| GET `/assignments`                                    | Signed in                                | Paginated visible coursework; student rows include own submission/null. |
| POST `/assignments`                                   | Teacher/admin                            | Create, default draft.                                                  |
| GET `/assignments/:id`                                | Visible record                           | `{assignment,submission}`; own submission for student, otherwise null.  |
| PUT `/assignments/:id`                                | Owner/admin                              | Allowlisted partial edit.                                               |
| DELETE `/assignments/:id`                             | Owner/admin                              | Archive; retain records/files.                                          |
| POST `/assignments/:id/resources`                     | Owner/admin                              | Multipart one `file`; return updated assignment.                        |
| GET `/assignments/:id/resources/:resourceId/download` | Visible record                           | Private attachment download.                                            |
| DELETE `/assignments/:id/resources/:resourceId`       | Owner/admin                              | Remove metadata/file.                                                   |
| POST `/assignments/:id/submissions`                   | Student; published record                | Multipart one `file`; immutable unique submission, 201.                 |
| GET `/assignments/:id/submissions`                    | Owner/admin                              | Paginated, populated safe student details.                              |
| GET `/submissions/:id`                                | Student owner / assignment owner / admin | Persisted receipt and grade/feedback.                                   |
| GET `/submissions/:id/download`                       | Same                                     | Private attachment.                                                     |
| PUT `/submissions/:id/grade`                          | Assignment owner/admin                   | `{grade,feedback?}`; 0–maxMarks, feedback 2000 max.                     |

Required assignment fields: title (150 max), description (5000), subject (100), dueDate (future ISO timestamp with timezone). Optional: status draft/published, maxMarks 1–1000/default 100, requirements up to 10 `{title,description}` (120/1000 bounds), resourceNotes (2000). Unchanged past deadlines may be preserved; changed dates must be future. Cannot lower maximum below an existing grade.

Students see published non-archived work; teachers see own; admins see all. List query: `q`, staff `status`, `sort` (default deadline ascending, `due-desc`, `title`), `page`, `limit`. Response `{assignments,total,count,page,pages}`.

Uploads: exactly one multipart `file`, no extra fields; non-empty PDF/ZIP/DOCX up to 25 MiB. Maximum 10 resources. Signature/archive structure checks reject spoofed DOCX, malformed/encrypted/excessively complex archives. These are format checks, not malware scanning. Late submission accepted with saved server-time late flag. Duplicate submission 409. Archived coursework is unavailable through submission/download routes, including to admins.

## Events

| Method / path                   | Access          | Behavior                                                             |
| ------------------------------- | --------------- | -------------------------------------------------------------------- |
| GET `/events`                   | Signed in       | Visible paginated events with own registration flag.                 |
| GET `/events/mine`              | Student         | Own paginated registrations with populated event.                    |
| POST `/events`                  | Teacher/admin   | Create draft/published event.                                        |
| GET `/events/:id`               | Visible record  | Event with own registration flag.                                    |
| PUT `/events/:id`               | Organizer/admin | Partial update; cancelled events immutable.                          |
| POST `/events/:id/register`     | Student         | Transactional future registration; capacity/duplicate protection.    |
| DELETE `/events/:id/register`   | Student owner   | Transactional cancellation; closes at start except cancelled events. |
| GET `/events/:id/registrations` | Organizer/admin | Paginated attendee names/email.                                      |

Required title (150), description (5000), category Technology/Workshop/Cultural/Sports/Other, location (200), startsAt/endsAt (future timezone-qualified ISO; end after start), capacity (integer 1–100000). Optional status default draft. Updates can cancel; cannot return to draft with registrations, lower capacity below count, or change dates to past. Unchanged dates can be preserved. Draft visible only to organizer/admin. Published/cancelled visible to signed-in users.

List queries: `q`, `category`, `upcoming=true`, staff `own=true`, `page`, `limit`. Responses `{events,total,page,pages}`, or `{registrations,total,page,pages}` for own/attendee lists.

## Admin and summaries

| Method / path      | Access    | Behavior                                                                                                   |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------------------- |
| GET `/users`       | Admin     | Paginated safe users; q/role/page/limit.                                                                   |
| POST `/users`      | Admin     | `{name,email,password,role}`; student/teacher only.                                                        |
| PATCH `/users/:id` | Admin     | `{status?,role?}`; enable/disable or promote student→teacher; revoke sessions. Admin identities protected. |
| GET `/dashboard`   | Signed in | Role-based stats, future deadlines, featured event, unavailable-feature list.                              |
| GET `/health`      | Public    | Connection-state summary after server startup.                                                             |

Pagination default limit 20, maximum 100; page starts at 1. Administrator creation and password recovery use explicit interactive operator tools, not public endpoints.
