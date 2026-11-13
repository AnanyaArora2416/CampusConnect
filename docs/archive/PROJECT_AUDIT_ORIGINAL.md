# CampusConnect — Project Audit

**Phase:** 1 — audit only  
**Date:** 13 November 2026  
**Scope:** Source review of the existing HTML, CSS, JavaScript, Express, and Mongoose project.  
**Runtime:** Servers were not started and MongoDB Atlas was not queried. A feature is marked **implemented** only when the code path exists. It is marked **verified** only when this audit executed it. Nothing below is marked verified.

No application code was changed in this phase except this document.

---

## 1. How to read this audit

| Status | Meaning |
| --- | --- |
| Implemented, not executed | The code path exists. This audit did not run it against the database or browser. |
| Partial | Some of the required behavior exists. Important pieces are missing or disconnected. |
| Missing | There is no working implementation. A file may still exist as a placeholder. |
| Risk | A security, data, or demo problem that should be fixed before the feature is treated as complete. |

---

## 2. Project snapshot

CampusConnect is an MCA campus portal with three intended roles: Student, Teacher, and Admin.

| Layer | What exists |
| --- | --- |
| Frontend | Static HTML, CSS, and vanilla JavaScript. Local server: `frontend/dev-server.js`. |
| Backend | Node.js, Express 5, Mongoose 8, JWT, bcryptjs. Entry: `backend/server.js`. |
| Database | MongoDB Atlas, database name `CampusConnect`, configured in `backend/config/db.js`. |
| Auth | Public student registration, login for any stored role, `GET /api/auth/me`. |
| Assignments | Authenticated create, list, update, and delete. No submissions. |
| Events | Placeholder files only. Not connected to the server. |
| Tests | None. |
| Git | This folder is **not** a Git repository. `.gitignore` exists, but there is no commit history to restore. |

The root `README.md` still says the project is structure-only. That is out of date. Login, registration, and assignment APIs are real. Most pages are still placeholders.

### Development URLs in the current code

These are the URLs the code actually uses:

| Service | URL |
| --- | --- |
| Frontend | `http://127.0.0.1:5500/` and `http://localhost:5500/` |
| Login page | `http://127.0.0.1:5500/login.html` |
| Backend | `http://localhost:5000/` |
| Health text | `GET http://localhost:5000/` returns `CampusConnect Backend is Running!` |

`frontend/dev-server.js` serves the `frontend` folder as the site root. The path `http://127.0.0.1:5500/frontend/` is **not** what this server serves.

CORS in `backend/server.js` allows only:

- `http://localhost:5500`
- `http://127.0.0.1:5500`

Requests with no `Origin` header are allowed. That covers tools such as PowerShell. The origin value `"null"` is not on the allow-list, so a `file://` page is rejected. The allow-list is not `*`.

The browser calls `http://localhost:5000` directly from `login.js` and `register.js`. There is no shared API config file.

---

## 3. File map

### Backend — real code

| File | Role |
| --- | --- |
| `backend/server.js` | Express app, CORS, JSON body, auth and assignment routers, root health route. |
| `backend/config/db.js` | Connects with `process.env.MONGO_URI` and database name `CampusConnect`. |
| `backend/models/User.js` | `name`, `email`, `password` (`select: false`), `role` enum `student` / `teacher` / `admin`. |
| `backend/models/Assignment.js` | `title`, `description`, `subject`, `dueDate`, `createdBy`, `status` `draft` / `published`. |
| `backend/controllers/authController.js` | Register (student only) and login. |
| `backend/controllers/assignmentController.js` | Create, list, update, delete. |
| `backend/routes/authRoutes.js` | `/register`, `/login`, `/me`, plus demo role areas. |
| `backend/routes/assignmentRoutes.js` | CRUD routes with `protect` and `authorize`. |
| `backend/middleware/authMiddleware.js` | Bearer JWT, HS256, loads the user from the database. |
| `backend/middleware/roleMiddleware.js` | Checks `req.user.role` from the database user, not from the request body. |
| `backend/scripts/createTestAccounts.js` | Interactive local script for one teacher and one admin. Refuses `NODE_ENV=production`. |
| `backend/scripts/resetStudentPassword.js` | Interactive student password reset. Development only. |
| `backend/testUser.js` | Creates one fixed test student if missing. |

### Backend — placeholders

| File | State |
| --- | --- |
| `backend/models/Event.js` | Comment only. No schema. |
| `backend/models/EventRegistration.js` | Comment only. No schema. |
| `backend/routes/eventRoutes.js` | Comment only. Not mounted in `server.js`. |

There is no Submission, Resource, Notice, Notification, or Grade model. There is no `multer` (or other upload) dependency.

### Frontend — working pages

| File | State |
| --- | --- |
| `frontend/index.html` + `css/style.css` + `js/main.js` | Simple marketing home. Blue theme, not the purple login theme. Footer year works. |
| `frontend/login.html` + `css/login.css` + `js/login.js` | Styled login. Calls the login API. Does not redirect. |
| `frontend/register.html` + `css/register.css` + `js/register.js` | Styled registration. Creates students only. |

`frontend/assets/images/Login vector.png` exists. The login and register illustration panels are empty `<div class="campus-image">` elements, so the image is not shown.

### Frontend — placeholder pages

These files load, then show a heading and the sentence that the page is a placeholder. Their scripts do not call the API.

- `dashboard.html` — intended student dashboard. No teacher dashboard file exists.
- `admin-dashboard.html`
- `assignments.html`
- `assignment-details.html`
- `create-assignment.html`
- `events.html`
- `event-details.html`
- `create-event.html`
- `my-events.html`

`frontend/js/auth.js`, `assignments.js`, and `events.js` are comments only. `main.js` only sets the footer year.

### Documentation and design files

| Path | State |
| --- | --- |
| `README.md` | Stale. Describes the project as placeholders. |
| `docs/figma-designs/` | The seven reference PDFs, plus PNG previews rendered from them on 13 November 2026. |
| `docs/diagrams/`, `docs/screenshots/`, `docs/synopsis/`, `docs/project-report/`, `docs/testing/` | Empty. |
| Figma file `yVisLiNeIdARAraTalUpaF` | Not opened. No Figma tool is available. The PDFs are the design source for the student screens. |

---

## 4. Existing features

### 4.1 Authentication and registration

| Feature | Status | Notes |
| --- | --- | --- |
| Student registration | Implemented, not executed | `POST /api/auth/register`. Name, email, and password checks. Email stored lowercase. Duplicate email returns 409, including the MongoDB duplicate-key case. |
| Password hashing | Implemented, not executed | bcrypt, 12 rounds. Password excluded from normal queries. |
| Public role lock | Implemented, not executed | Any supplied `role` other than `student` returns 403. Omitted role still saves `student`. |
| Teacher tab on register page | Implemented, not executed | UI blocks the submit and tells the user approval is required. The request is not sent. |
| Login API | Implemented, not executed | `POST /api/auth/login`. Same error text for unknown email and bad password. JWT holds only `userId`, expires in 1 hour, algorithm HS256. |
| Teacher and admin login API | Implemented, not executed | Login does not restrict role. Any valid user receives a token and their stored role. |
| Current user | Implemented, not executed | `GET /api/auth/me` requires `Authorization: Bearer`. Role is read from MongoDB on every protected request. |
| Role demo routes | Implemented, not executed | `/api/auth/student-area`, `teacher-area`, `admin-area` return a welcome string. They are not product features. |
| Logout | Missing | No logout API and no logout control. A JWT cannot be revoked. Closing the tab clears `sessionStorage`. |
| Session expiry on the pages | Missing | Login stores the token. No page reads it, checks expiry, or sends the user back to login. |
| Redirect after login | Missing | `login.js` stops on the login page after success. Comment says dashboard navigation is later. |
| Admin login screen | Missing | Radios are Student and Teacher only. An admin who picks either radio is rejected in the browser with “registered as admin” and the token is not stored. |
| Profile edit | Missing | No update route. User fields are name, email, password, and role only. |
| Password change | Missing | `resetStudentPassword.js` is a manual terminal script, not an in-app feature. |
| Forgot password | Missing | Link is `href="#"`. |
| Remember me | Missing | Checkbox is not read. |
| Google sign-in | Intentionally off | Button is `disabled`. Do not treat this as a required feature. |
| Teacher approval workflow | Missing | `createTestAccounts.js` can insert a teacher or admin from the terminal after a typed confirmation and password. There is no pending-teacher state, no admin API, and no admin screen. |

Registration does not return a token. The student must log in afterward. That is acceptable.

The Teacher registration control does **not** grant the teacher role. Admin accounts cannot be created through `POST /api/auth/register`.

### 4.2 Assignments

| Feature | Status | Notes |
| --- | --- | --- |
| Create | Implemented, not executed | `POST /api/assignments`. Teacher or admin. Creator is `req.user._id`. New rows are always `draft`, even if the body asks for `published`. |
| List | Implemented, not executed | Student: published only. Teacher: rows they created, including drafts. Admin: all rows. |
| Update | Implemented, not executed | Teacher or admin. Teacher must own the row. Allowed fields: title, description, subject, dueDate, status (`draft` or `published`). |
| Delete | Implemented, not executed | Teacher owns the row, or admin. No cascade, because submissions do not exist. |
| Single assignment | Missing | No `GET /api/assignments/:id`. The details page cannot load one record. |
| Draft hiding | Implemented in the list filter, not executed | Students have no other assignment read API, so drafts are not exposed through the current routes. |
| Ownership | Implemented, not executed | Update and delete compare `createdBy` with the database user. Admins bypass that check. |
| Frontend assignment pages | Missing | HTML shells only. `assignments.js` does not call the API. |
| Requirements, rubric, marks, resources | Missing | Not on the Assignment schema. |
| File upload and submission | Missing | No model, route, storage, or UI. |
| Grading and feedback | Missing | No fields or routes. |
| Search and filter | Missing | List returns every matching row, newest first. No query parameters. |

Validation that does exist: non-empty strings, title max 150 characters, due date must be a future ISO date-time with a timezone. Description and subject length are not capped beyond MongoDB document limits.

### 4.3 Events, dashboards, notices, progress

| Feature | Status |
| --- | --- |
| Event list, details, create, update, delete | Missing |
| Upcoming / past filter | Missing |
| Registration, cancellation, capacity, duplicate prevention | Missing |
| My Events | Missing |
| Student dashboard data | Missing |
| Teacher dashboard | Missing. There is not even a page file. |
| Admin dashboard | Placeholder HTML only. No user, assignment, or event admin API. |
| Notifications / campus alerts | Missing |
| Academic progress, attendance, transcripts | Missing. Do not invent percentages. |
| Search | Missing |

### 4.4 What was not claimed as working

- Login and registration were **not** clicked in a browser during this audit.
- Assignment routes were **not** called with a token.
- Atlas connectivity was **not** confirmed in this pass. The code will exit if `MONGO_URI` is missing or the connection fails.
- PDF layouts were **not** compared.

---

## 5. API contract that exists today

Base URL in the frontend: `http://localhost:5000`.

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| GET | `/` | Public | Plain text health message. |
| POST | `/api/auth/register` | Public | Body: `name`, `email`, `password`. Optional `role` must be absent or `student`. 201 user without password. 400 validation. 403 non-student role. 409 duplicate email. |
| POST | `/api/auth/login` | Public | Body: `email`, `password`. 200 `{ message, token, user }`. 401 invalid credentials. |
| GET | `/api/auth/me` | Bearer | Current user id, name, email, role. |
| GET | `/api/auth/student-area` | Student | Demo message. |
| GET | `/api/auth/teacher-area` | Teacher | Demo message. |
| GET | `/api/auth/admin-area` | Admin | Demo message. |
| POST | `/api/assignments` | Teacher, admin | Creates a draft. |
| GET | `/api/assignments` | Student, teacher, admin | Role-filtered list and `count`. |
| PUT | `/api/assignments/:id` | Teacher (owner), admin | Partial update of allowed fields. |
| DELETE | `/api/assignments/:id` | Teacher (owner), admin | Deletes the assignment document. |

Error JSON uses `message`. Success JSON also uses `message` plus the payload (`user`, `token`, `assignment`, `assignments`, `count`).

There is no pagination, file response, or event route.

---

## 6. Data model

### User

- `name` (required, trimmed)
- `email` (required, unique, lowercase)
- `password` (required, hidden unless `select('+password')`)
- `role`: `student` (default), `teacher`, `admin`
- `createdAt`, `updatedAt`

Not stored: roll number, course, department, phone, avatar, account status, teacher-approval state, notification preferences.

### Assignment

- `title` (required, max 150)
- `description` (required)
- `subject` (required)
- `dueDate` (required Date)
- `createdBy` (User ObjectId, required)
- `status`: `draft` or `published`
- timestamps

Not stored: max marks, rubric, attachments, allowed file types, late policy, submissions.

### Event and EventRegistration

Files exist. Schemas do not.

---

## 7. Bugs and security risks

Ordered by what should be fixed first.

1. **Secrets are present in files that are easy to share.**  
   `backend/.env` holds `PORT`, `MONGO_URI`, and `JWT_SECRET`. That file is gitignored, which is correct, but this folder is not a Git repo yet.  
   `backend/.env.example` is **not** a safe template. It contains a database username, password, host, and a JWT secret, and the database variable is named `MONGODB_URI`. The application reads `MONGO_URI`. Anyone who copies the example as-is will not connect, and anyone who commits the example will publish credentials.  
   **Action before any remote repository:** replace `.env.example` with empty placeholders and the correct name `MONGO_URI`. Rotate the Atlas database password and stop using the secret that was written in the example file. This audit does not repeat those values.

2. **Hardcoded test password.**  
   `backend/testUser.js` creates `teststudent@campusconnect.example` with a password written in the source file. Remove that password from source before the project is shared. Keep test-account creation interactive, as `createTestAccounts.js` already is.

3. **Admin cannot sign in through the UI.**  
   The API accepts an admin. The login form has no Admin choice, and it discards the token when the selected radio does not match `user.role`.

4. **Login success does not open a dashboard.**  
   The token and role are stored in `sessionStorage` (`campusconnect_token`, `campusconnect_role`). No page reads them.

5. **Token storage is readable by any script on the page.**  
   `sessionStorage` is reasonable for this local college demo because the token dies with the tab and the frontend is same-site static files. It is not an httpOnly cookie. A later XSS bug could read it. There is no server-side logout list. Document this as a development limitation unless the project later moves the token to an httpOnly cookie. Do not also copy the token into `localStorage`.

6. **No rate limit or account lockout** on login and registration.

7. **No security headers** (`helmet` or equivalent) and no request size limit set explicitly on `express.json()`.

8. **Assignment description and subject are unbounded** at the application layer.

9. **Create-assignment logs the whole error object.** Update and delete log the error object too. Responses stay generic, which is good. Logs must not grow to include passwords, tokens, or `MONGO_URI`. Current auth logs print `error.message` only. Keep that pattern.

10. **Dead commented routers** in `authRoutes.js` and `assignmentRoutes.js` duplicate the live routes. They are confusing during handover. Remove them when those files are next edited. Do not change behavior while doing that.

11. **Register navigation opens unfinished pages.** `register.html` links Events and Assignments to placeholder pages with no login check. `login.html` points Events, Assignments, and About at the home features section.

12. **Home branding does not match login.** `style.css` uses blue (`#2563eb`). Login and register use purple (`#4d35b7`) and lavender surfaces. Shared variables for the product brand are not defined.

13. **Illustration asset is unused.** `Login vector.png` is not referenced by the login or register markup.

14. **Frontend server path check** rejects paths that escape the `frontend` folder. It does not hide directory listings in a useful way and has no cache or security headers. Acceptable for local demo. It must not be the production file server for uploads.

15. **No automated tests and no Git history.** A bad edit cannot be rolled back with Git.

Authorization that is already in good shape and should be preserved:

- Registration cannot set `teacher` or `admin`.
- JWT role is not trusted from the browser. `protect` loads the user, then `authorize` checks that role.
- Assignment creator is taken from `req.user`, not the body.
- Students are filtered to `published` on the only list route.
- Teachers cannot update or delete another teacher’s assignment. Admins can.

---

## 8. Design references

The seven PDFs are stored in `docs/figma-designs/`. They describe the **student** experience only. They do not include teacher, admin, login, or registration screens. Login and register stay as they are, with the fixes already listed.

Mockup names, dates, counts, emails, file sizes, and submission IDs are sample art. The app must fill those slots from the signed-in user and the database.

### 8.1 Shared chrome

| Pattern | Desktop | Mobile |
| --- | --- | --- |
| Brand | “CampusConnect” wordmark, purple on white. | Centered wordmark, bell, round avatar. |
| Navigation | Left sidebar: Home, Assignments, Events, My Events, Logout. Active item is a purple pill. | Bottom bar with the same four destinations. Home is the active example. |
| Top bar | Search field (“Search courses, assignments, notices…”), bell, name, and a second line such as “MCA”. | No search field on these screens. |
| Surface | Lavender page, white cards, soft shadow, purple primary buttons. | Same palette, single column, large radius. |

Search in the mockup is a global field. Until notices and courses exist, search should be labeled for what it actually filters (assignments on the dashboard and assignment pages). Do not return fake matches.

The second profile line (“MCA”) has no field on the User model. Show it only after profile data has a course or program value. Until then, show the role.

### 8.2 Student dashboard

Files: `Main_Dashboard.pdf` (desktop), `Main_Dashboard-1.pdf` (mobile).

Desktop content, top to bottom:

1. Greeting: “Hi, {name}!” and a short overview line.
2. Actions in the mockup: **Export Schedule** and **+ New Submission**. Export has no backend. New Submission should go to the student’s pending coursework, not invent a submission.
3. Three stat cards: Upcoming events (count, “N Registered”, “View schedule”), Pending tasks (count, “N Due Soon”, “Go to coursework”), Campus alerts (unread count, “Mark as read”).
4. Upcoming deadlines list with subject, title, relative due label, date, marks, and **View Details**. Filters: All Tasks and Urgent. Link: “View all upcoming course tasks”.
5. Featured upcoming event card: title, tagline, date, place, registration count, **Register**, and a link to the event calendar.
6. Academic progress. The desktop PDF stacks the wide card and the compact `Frame_1` card. That is a component sheet, not two live widgets. Use the wide card on desktop and the compact card on narrow screens.

Mobile replaces the sidebar with the bottom nav and turns the three stats into small tiles labeled ACT / DUE / NEW. It shows one deadline and one event card with **Register Now**. It does not show academic progress on that screen.

### 8.3 Academic progress

File: `Frame_1.pdf`, also embedded in the desktop dashboard.

The card shows Assignment Completion and Attendance Aggregate as percentages, status words (“On Track”, “Eligible”), and **Download Transcript**.

Only assignment completion can be calculated, and only after submissions exist: submitted published assignments divided by published assignments. Attendance and transcripts have no model. Those controls stay unavailable, with that reason visible. Do not display 88% or 94%.

### 8.4 Assignment details and upload

Files: `explore_assignment.pdf` (desktop), `explore_assignment-1.pdf` (mobile).

Both use the same sidebar or bottom nav.

Content the data model does not have yet:

- Breadcrumb or back link: Assignments / subject / title.
- Due date, total marks, and “Individual Submission”.
- Task requirements as parts, each with a point value. Desktop shows three cards. Mobile shows a stacked list and a part count.
- “Updated …” time from the assignment’s `updatedAt`.
- Attached course resources with filename, size, and download. The mockup says “Verified by Department”. Show that only when a teacher or admin actually published the resource.
- Submit panel: accepted types **PDF, ZIP, DOCX**, maximum **25 MB**, drag-and-drop or click, selected filename and size, remove control, **Submit Assignment**.
- “Draft Ready” in the mockup means the student’s file is selected locally. It is not the assignment’s `draft` status. Teachers already use `draft` for unpublished assignments. The student UI should say the file is ready to submit, not reuse the word Draft for that.

### 8.5 Submission success

Files: `Assignment_Submission_Success_Modal-1.pdf` (desktop dialog over a blurred assignment page), `Assignment_Submission_Success_Modal.pdf` (mobile sheet).

Show, from the saved submission:

- Success check.
- Assignment or subject title.
- Submission ID.
- Timestamp in local time.
- Filename and size.
- On-time or late status, based on the due date and the saved timestamp.
- **View Assignment Status** and **Back to Coursework**.

The desktop mockup says the file was “cryptographically hashed” and that a receipt was emailed. The mobile mockup says “Confirmation sent to {email}”. Do not copy those sentences. This project does not hash uploads for verification and does not send mail. The receipt can say the submission was saved and timestamped.

The sample ID `#SUB-2025-8942` is not a format requirement. Use the real database id.

### 8.6 Gap between these screens and the current pages

| Area | Current UI | What the PDFs require |
| --- | --- | --- |
| Login / register | Purple cards, role switch, rounded fields. Not in these PDFs. | Keep them. Show the campus illustration. Redirect after login. Add Admin on the login form only. |
| Home | Separate blue layout. Not in these PDFs. | Leave it as the public landing page. Do not force the dashboard chrome onto it. |
| Student dashboard | One heading. | Shell, greeting, three counts, deadlines, one featured event, progress with real assignment data only. |
| Assignment details | One heading. | Requirements, resources, 25 MB upload, submit. |
| Success receipt | No page. | Desktop dialog and mobile sheet bound to the saved submission. |
| Academic progress | No component. | Assignment completion only. Attendance and transcript unavailable. |
| Teacher dashboard | No page. | Not in the PDFs. Reuse the purple shell and real counts. |
| Admin dashboard | One heading. | Not in the PDFs. Same shell, protected tools. |
| Events pages | Four headings. | Dashboard shows a featured event and registration. Full event pages still need models. |
| Empty, loading, error | Login and register only. | Every new data region needs all four states, including an empty deadline list and an empty event card. |

Hardcoded marketing copy on the login panel (“10,000+ Students Connected”) is decoration, not a dashboard statistic. Do not copy the PDF’s “324 Students Registered” unless that count is the registration collection.

---

## 9. Missing backend work required by the designs

These do not exist and the designs cannot be honest without them:

1. `GET /api/assignments/:id` with the same visibility rules as the list.
2. Submission model: assignment, student, stored file metadata, status, timestamp, submission id.
3. Upload API with server-side type and size checks (25 MB, PDF / DOCX / ZIP unless a later rule changes that), safe filenames, no public static folder for private files.
4. Authorized download for the owner, the assignment’s teacher, and admin.
5. Teacher feedback and grade fields, with a teacher-only write route.
6. Optional assignment fields the submission screens need: instructions already exist as `description`; requirements, max marks, and resource list do not.
7. Event, registration, capacity, and “my events” APIs.
8. Dashboard summary endpoint, or a clear rule that the dashboard calls the list endpoints and counts in the browser. Prefer a small summary API so the student page does not download every row to count them.
9. Notice or notification model if campus alerts are shown. Otherwise the dashboard section should say alerts are not available.
10. Profile update and password change for the signed-in user.
11. Admin: list users, create or approve a teacher, and reject public role escalation. Admin creation stays in the protected script or a protected admin route, never public registration.
12. Shared frontend API helper: base URL, bearer header, 401 redirect.

Attendance and transcripts stay **out of scope** until a real collection and a teacher workflow exist. The audit recommendation is to document them as optional and not to display fake percentages.

---

## 10. Proposed implementation order

Work stops after each phase until you approve the next one. No phase deletes Atlas data.

### Phase 1 — Audit

**Status:** Complete with this document.  
**Approval needed:** Confirm this plan, add the design ZIP if you want pixel matching, and rotate the exposed database password before any Git remote.

### Phase 2 — Authentication completion

**Files:** `login.js`, `login.html`, `register.js`, `auth.js` (replace the stub with a shared session helper), `authController.js` only if a small gap remains, `server.js` only if cookie or CORS details change, `.env.example`.

**Build:**

- After login, send Student to `dashboard.html`, Teacher to a new `teacher-dashboard.html`, Admin to `admin-dashboard.html`.
- Add an Admin control on the **login** form only.
- Keep public registration student-only.
- On 401, clear `sessionStorage` and return to `login.html`.
- Add a logout control that clears the session. A server logout route is optional for a stateless JWT; document that logout is local until a token blocklist exists.
- Replace `.env.example` secrets with blank placeholders and the name `MONGO_URI`.
- Remove the plaintext password from `testUser.js` or stop using that script in favor of the interactive one.

**Do not:** add teacher self-registration, store the token in `localStorage`, or log tokens.

**Acceptance:**

- New student can register and then log in to the student shell.
- Duplicate email shows the server message.
- Teacher role on the register form does not create a user.
- A non-student `role` posted to the API returns 403.
- Teacher and admin can log in only with accounts created by the protected script or a later admin API.
- Wrong password shows “Invalid email or password”.
- Expired or missing token cannot call `/api/auth/me`.
- Logout removes the token and the next protected page send the user to login.

### Phase 3 — Student dashboard shell and navigation

**Files:** `dashboard.html`, new shared layout CSS (extend variables; do not throw away `login.css`), `main.js` or a new `dashboard.js`.

**Build:** greeting from `/api/auth/me`, sidebar, mobile bottom nav, logout, links to assignments and events. Counts stay at real zeros or “unavailable” until later phases supply records. No sample student name.

**Acceptance:** an unsigned visitor is redirected to login. A student sees their own name. Teacher and admin do not use this page as their home.

### Phase 4 — Assignment details and submission backend

**Files:** `Assignment.js` (add only fields the UI needs), new `Submission` model, `assignmentController.js`, `assignmentRoutes.js`, upload storage under `backend/uploads` outside the public frontend folder.

**Build:** get-one, resources metadata, submission create, list own submission, teacher list submissions. Enforce draft invisibility and ownership again on every new route.

**Acceptance:** student receives 404 or 403 for a draft. Student cannot download another student’s file. Teacher cannot grade another teacher’s assignment. A 26 MB file and a `.exe` are rejected by the server even if the browser is bypassed.

### Phase 5 — Assignment UI and receipt

**Files:** `assignments.html`, `assignment-details.html`, `create-assignment.html`, `assignments.js`, a success view matching the PDF once the PDF is in the repo.

**Build:** teacher draft and publish, student details, upload, receipt rendered from the saved submission id, time, filename, size, and status.

**Acceptance:** receipt values match the database document. Refreshing the status page shows the same submission. No email success text.

### Phase 6 — Events

**Files:** `Event.js`, `EventRegistration.js`, new controller and routes mounted from `server.js`, the four event pages, `events.js`.

**Build:** list, detail, create for teacher/admin, register, cancel when the rules allow, capacity, unique `(event, student)` index, My Events.

**Acceptance:** a second register returns a conflict. Dashboard upcoming count uses this API. Cancelled registrations disappear from My Events.

### Phase 7 — Teacher dashboard and grading

**Files:** `teacher-dashboard.html`, teacher section of assignment pages, grade route.

**Build:** draft count, published count, submission queue, edit, publish, feedback.

**Acceptance:** counts match the database for that teacher. A student token cannot open grade or publish APIs.

### Phase 8 — Admin dashboard and teacher provisioning

**Files:** `admin-dashboard.html`, new `userController` and routes, User status field if approval is in-app.

**Build:** list users, approve or create a teacher, view assignments and events. Every route uses `authorize('admin')` after `protect`.

**Acceptance:** a student or teacher token receives 403 on admin routes. Public register still cannot create an admin.

### Phase 9 — Profile, notices, academic metrics

**Build only what has a real source:**

- Profile view and edit of name.
- Password change with the current password checked.
- Notices, if you want alerts; otherwise mark the panel unavailable.
- Progress = submitted published assignments / published assignments, plus graded count when grades exist.

**Acceptance:** no attendance percentage appears.

### Phase 10 — Responsive layout and accessibility

The student screens now have PDFs in `docs/figma-designs/`. Match those layouts on desktop and mobile. Correct the mockup problems listed in section 8: no sample student, no fake counts, no email or hash claims, one progress card per breakpoint, attendance unavailable. Login and register are not in these PDFs and stay on their current design.

### Phase 11 — Security and tests

Add API tests that do not wipe Atlas. Prefer a separate database name if you approve one. Cover the acceptance tests listed in the phases above. Fix XSS by inserting text with `textContent`, not `innerHTML`, for titles, names, and filenames.

### Phase 12 — Documentation

Update `README.md` and add:

- `docs/ARCHITECTURE.md`
- `docs/API_DOCUMENTATION.md`
- `docs/DATABASE_MODELS.md`
- `docs/TEST_REPORT.md`
- `docs/PROJECT_COMPLETION_STATUS.md`

Only after the tested behavior exists. `TEST_REPORT.md` will list commands that were actually run.

---

## 11. Acceptance criteria by module

| Module | Done when |
| --- | --- |
| Auth | Student register and login, teacher login, admin login, 403 on public privilege escalation, `/me`, logout, expiry redirect. All exercised, not only coded. |
| Student dashboard | Name and counts come from APIs. Layout works on a narrow and a wide window. |
| Assignments | CRUD still works. Drafts stay hidden. Owners and admins only. |
| Submissions | Real file, real id, real time, receipt matches the record, illegal upload fails on the server. |
| Events | Create, list, register once, cancel, My Events, capacity. |
| Teacher | Own assignments, publish, see and grade own submissions. |
| Admin | User overview and teacher provisioning. No public admin signup. |
| Profile and progress | Editable safe fields. Progress math explained and based on stored rows. |
| Security | Example env has no secrets. Uploaded files are not world-readable. Roles checked on the server. |
| Docs | A classmate can start both servers from the README without reading this audit. |

---

## 12. Risks of the next edit

- Login and register styling is the only polished UI. Later shared CSS must not break those pages.
- Assignment list rules are the authorization model to copy. Do not add a public assignment route.
- `createTestAccounts.js` writes to the real `CampusConnect` database. Do not run it as part of casual testing without your yes.
- There is no Git safety net until the folder is initialized and the current files are committed.

---

## 13. Recommended first approval

Phase 2 can start when you confirm:

1. This order is accepted.
2. Whether Admin login should be a third radio on the login form, or a separate admin URL. Recommendation: a third radio on the login form only, still ignored by the server, which trusts the account’s stored role.
3. Whether teacher accounts stay on the interactive script until Phase 8, or Phase 2 should also add an admin-only create-teacher API. Recommendation: keep the script for Phase 2 so admin UI is not half-built.
4. The seven student-screen PDFs are now in `docs/figma-designs/`. Phase 5 and Phase 10 should follow section 8 of this audit. Teacher and admin screens are not in those files.
5. That the Atlas password currently written in `.env.example` will be rotated, and that file may be replaced with placeholders in Phase 2.

No further feature work is included in Phase 1.
