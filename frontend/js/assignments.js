// Assignment pages behavior for CampusConnect.
// Assignment logic will be added in a later stage.

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // FRONTEND PREVIEW DATA.
  // Replace this with API data during integration.
  const today = new Date();

  function futureDate(days) {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date;
  }

  const assignments = [
    {
      id: "demo-dbms",
      title: "DBMS Assignment",
      subject: "Database Management Systems",
      description: "ER Diagram, normalization, DDL and queries",
      dueDate: futureDate(2),
      marks: 20,
      status: "pending"
    },
    {
      id: "demo-cie",
      title: "CIE Practical Task",
      subject: "Socket Programming & Client-Server IPC",
      description: "Complete the practical exercises",
      dueDate: futureDate(1),
      marks: 20,
      status: "pending"
    },
    {
      id: "demo-ai",
      title: "AI Case Study",
      subject: "Artificial Intelligence",
      description: "Heuristic Search Formulation in Robotics",
      dueDate: futureDate(7),
      marks: 20,
      status: "pending"
    },
    {
      id: "demo-web",
      title: "Web Development Project",
      subject: "Web Technologies",
      description: "Build a responsive frontend interface",
      dueDate: futureDate(12),
      marks: 30,
      status: "submitted"
    },
    {
      id: "demo-python",
      title: "Python Programming Lab",
      subject: "Python Programming",
      description: "Complete the assigned lab exercises",
      dueDate: futureDate(15),
      marks: 25,
      status: "submitted"
    }
  ];

  const list = document.getElementById("assignmentList");
  const search = document.getElementById("assignmentSearch");
  const topSearch = document.getElementById("topSearch");
  const statusFilter = document.getElementById("statusFilter");
  const sortFilter = document.getElementById("sortFilter");

  function isDueSoon(assignment) {
    if (assignment.status === "submitted") return false;

    const days = Math.ceil(
      (assignment.dueDate - today) / (1000 * 60 * 60 * 24)
    );

    return days >= 0 && days <= 3;
  }

  function formatDate(date) {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function setText(id, value) {
    document.getElementById(id).textContent = String(value);
  }

  function updateStats() {
    setText("totalCount", assignments.length);
    setText(
      "pendingCount",
      assignments.filter((item) => item.status === "pending").length
    );
    setText(
      "submittedCount",
      assignments.filter((item) => item.status === "submitted").length
    );
    setText(
      "dueSoonCount",
      assignments.filter(isDueSoon).length
    );
  }

  function renderAssignments() {
    const query = search.value.trim().toLowerCase();
    const filter = statusFilter.value;
    const sort = sortFilter.value;

    let filtered = assignments.filter((assignment) => {
      const matchesText = [
        assignment.title,
        assignment.subject,
        assignment.description
      ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        filter === "all" ||
        (filter === "due-soon" && isDueSoon(assignment)) ||
        assignment.status === filter;

      return matchesText && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sort === "title") {
        return a.title.localeCompare(b.title);
      }

      if (sort === "due-desc") {
        return b.dueDate - a.dueDate;
      }

      return a.dueDate - b.dueDate;
    });

    setText(
      "resultsCount",
      `${filtered.length} assignment${filtered.length === 1 ? "" : "s"}`
    );

    list.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No assignments match your search or filter.";
      list.appendChild(empty);
      return;
    }

    filtered.forEach((assignment) => {
      const card = document.createElement("article");
      card.className = "assignment-card";

      const icon = document.createElement("span");
      icon.className = "assignment-icon";
      icon.textContent = "▤";

      const info = document.createElement("div");
      info.className = "assignment-info";

      const title = document.createElement("h3");
      title.textContent = assignment.title;

      const description = document.createElement("p");
      description.textContent =
        `${assignment.subject} • ${assignment.description}`;

      const meta = document.createElement("div");
      meta.className = "assignment-meta";

      const due = document.createElement("span");
      due.textContent = `📅 Due: ${formatDate(assignment.dueDate)}`;

      const marks = document.createElement("span");
      marks.textContent = `✧ ${assignment.marks} Marks`;

      const badge = document.createElement("span");
      const dueSoon = isDueSoon(assignment);

      badge.className =
        `status ${dueSoon ? "due-soon" : assignment.status}`;

      badge.textContent = dueSoon
        ? "Due Soon"
        : assignment.status === "submitted"
          ? "Submitted"
          : "Pending";

      meta.append(due, marks, badge);
      info.append(title, description, meta);

      const link = document.createElement("a");
      link.className = "details-btn";
      link.href =
        `assignment-details.html?id=${encodeURIComponent(assignment.id)}`;
      link.textContent = "View Details";

      card.append(icon, info, link);
      list.appendChild(card);
    });
  }

  search.addEventListener("input", renderAssignments);

  topSearch.addEventListener("input", () => {
    search.value = topSearch.value;
    renderAssignments();
  });

  statusFilter.addEventListener("change", renderAssignments);
  sortFilter.addEventListener("change", renderAssignments);

  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");

  menuBtn.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });

  // Logout integration is intentionally deferred.
  document.getElementById("logoutBtn").addEventListener("click", () => {
    const toast = document.getElementById("toast");
    toast.textContent =
      "Logout will be connected to the existing authentication helper.";
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 3000);
  });

  updateStats();
  renderAssignments();
});
