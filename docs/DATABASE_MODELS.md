# Database models

All models use ObjectIds and timestamps. Indexes initialize before normal server startup. Existing records must satisfy unique constraints; no Atlas migration was performed.

| Model             | Fields                                                                                                               | Relationships / indexes                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| User              | name, email, password hash, role, status, tokenVersion                                                               | Unique normalized email. Password/tokenVersion omitted from normal queries.                                   |
| Assignment        | title, description, subject, dueDate, maxMarks, requirements, resourceNotes, resources, status, createdBy, deletedAt | Creator → User. Indexes for creator/deletedAt/createdAt and status/deletedAt/dueDate. Optimistic concurrency. |
| Submission        | assignment, student, file metadata, submittedAt, late, grade, feedback, gradedBy, gradedAt                           | Unique assignment/student. Student/submittedAt index. References Assignment/User.                             |
| Event             | title, description, category, location, startsAt, endsAt, capacity, registrationCount, status, createdBy             | Creator → User. Status/startsAt and creator/startsAt indexes.                                                 |
| EventRegistration | event, student                                                                                                       | Unique event/student; student/createdAt index. References Event/User.                                         |

Resource subdocuments and submission file metadata store display name, random stored filename, size and MIME type. API serializers omit stored filenames. Resources also have IDs/timestamps. Downloads use record-based authorization.

Roles: student/teacher/admin. User status: active/disabled. Assignment status: draft/published. Event status: draft/published/cancelled. Archival sets assignment.deletedAt and hides its resources/submissions, retaining underlying records/files. User deletion is not exposed; disabling preserves relationships.

Student completion = submitted non-archived published assignments divided by all non-archived published assignments, rounded to whole percentage; zero when none exist. Pending includes all unsubmitted published work, including overdue work. Upcoming deadlines exclude past and already submitted work. Teacher counts restrict coursework/events to their own; admin counts cover the campus. No attendance/transcript statistics are invented.

MongoDB transactions require a replica set. Back up the private file directory and database together. No automatic archival purge, file quota or orphan-file reconciliation job is implemented.
