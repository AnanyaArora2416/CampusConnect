# CampusConnect

MCA final-year project. CampusConnect is a campus web app for assignments and events.

This folder currently holds the project structure only. Pages, styles, server logic, and database models are placeholders and will be built in later stages.

## Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB Atlas with Mongoose

## Folders

- `frontend` — pages the user opens in the browser
- `frontend/assets` — images and icons
- `frontend/css` — shared styles
- `frontend/js` — browser JavaScript
- `backend` — Node.js and Express server
- `backend/config` — database connection setup
- `backend/models` — Mongoose data shapes
- `backend/routes` — API URL paths
- `backend/controllers` — functions that handle each request
- `backend/middleware` — checks that run before a request is handled, such as login checks
- `docs` — project documents, designs, diagrams, screenshots, and testing notes

Copy `backend/.env.example` to `backend/.env` when the backend stage starts. Put your own MongoDB Atlas connection string in `.env`. Do not commit `.env`.
