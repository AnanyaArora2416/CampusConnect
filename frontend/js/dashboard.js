
(() => {
  "use strict";

  const API_BASE = "http://localhost:5000";

  const $ = (id) => document.getElementById(id);
  const status = $("statusMessage");

  // Find the existing login token.
  // We will adjust this if your login.js uses another key.
  function readSession() {
    for (const store of [sessionStorage, localStorage]) {
      for (const key of [
        "campusconnect_token",
        "campusConnectToken",
        "token",
        "authToken"
      ]) {
        const token = store.getItem(key);
        if (token) return token;
      }

      for (const key of [
        "campusconnect_session",
        "campusConnectSession",
        "auth",
        "userSession"
      ]) {
        try {
          const data = JSON.parse(store.getItem(key) || "null");

          if (data && typeof data.token === "string") {
            return data.token;
          }
        } catch (_) {
          // Ignore invalid saved session.
        }
      }
    }

    return null;
  }

  // Logout from CampusConnect.
  function logout() {
    for (const store of [sessionStorage, localStorage]) {
      for (const key of [
        "campusconnect_token",
        "campusConnectToken",
        "token",
        "authToken",
        "campusconnect_session",
        "campusConnectSession",
        "auth",
        "userSession",
        "campusconnect_user",
        "user"
      ]) {
        store.removeItem(key);
      }
    }

    window.location.replace("login.html");
  }

  // Make an authenticated API request.
  async function api(path, token) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      logout();
      throw new Error("Your session has expired.");
    }

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    return response.json();
  }

  // Read assignment array from backend response.
  function getAssignments(payload) {
    if (Array.isArray(payload)) return payload;

    if (Array.isArray(payload?.assignments)) {
      return payload.assignments;
    }

    return [];
  }

  // Display upcoming assignment deadlines.
  function renderAssignments(assignments) {
    const list = $("deadlineList");
    const now = Date.now();

    const future = assignments
      .filter((assignment) => {
        return (
          assignment &&
          assignment.dueDate &&
          new Date(assignment.dueDate).getTime() >= now
        );
      })
      .sort((a, b) => {
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

    $("tasksCount").textContent = String(future.length);

    $("tasksHint").textContent = future.length
      ? "Upcoming published deadlines"
      : "No upcoming published deadlines";

    list.replaceChildren();

    if (!future.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No upcoming assignments yet.";
      list.appendChild(empty);
      return;
    }

    for (const assignment of future.slice(0, 4)) {
      const item = document.createElement("div");
      item.className = "deadline";

      const info = document.createElement("div");

      const title = document.createElement("h3");
      title.textContent = assignment.title || "Untitled assignment";

      const subject = document.createElement("p");
      subject.textContent =
        assignment.subject || "Course assignment";

      const due = document.createElement("span");
      due.className = "due";

      due.textContent =
        "Due: " +
        new Date(assignment.dueDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        });

      info.append(title, subject, due);

      const link = document.createElement("a");
      link.className = "btn";
      link.textContent = "View Details";

      link.href =
        "assignment-details.html?id=" +
        encodeURIComponent(assignment._id || "");

      item.append(info, link);
      list.appendChild(item);
    }
  }

  // Initialize dashboard.
  async function start() {
    $("logoutButton").addEventListener("click", logout);

    $("searchInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const query = event.target.value.trim();

        window.location.href =
          "assignments.html?q=" + encodeURIComponent(query);
      }
    });

    const token = readSession();

    if (!token) {
      status.textContent =
        "No login session found. Please log in.";
      status.classList.add("error");
      return;
    }

    try {
      // Get authenticated user profile.
      const profile = await api("/api/auth/me", token);
      const user = profile.user || profile;

      // Only students can access this dashboard.
      if (user.role !== "student") {
        status.textContent =
          "This dashboard is for Student accounts only.";
        status.classList.add("error");
        return;
      }

      const firstName = (user.name || "Student")
        .trim()
        .split(/\s+/)[0];

      $("greetingName").textContent = firstName;
      $("headerName").textContent = user.name || "Student";
      $("avatar").textContent =
        firstName.charAt(0).toUpperCase();

      // Load assignments from MongoDB through the API.
      const payload = await api("/api/assignments", token);

      renderAssignments(getAssignments(payload));

      status.textContent = "";

    } catch (error) {
      status.classList.add("error");

      status.textContent =
        error.message === "Failed to fetch"
          ? "Cannot connect to backend. Make sure it is running on port 5000."
          : error.message;

      $("deadlineList").innerHTML =
        '<p class="empty">Assignments could not be loaded.</p>';
    }
  }

  start();
})();
