
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // Preview data only. No API requests are made here.
  const assignments = [
    {
      title: "DBMS Assignment",
      subject: "Database Management Systems",
      dueDate: "2026-11-25",
      status: "published"
    },
    {
      title: "CIE Practical Task",
      subject: "Computer Networks",
      dueDate: "2026-11-28",
      status: "published"
    },
    {
      title: "AI Case Study",
      subject: "Artificial Intelligence",
      dueDate: "2026-12-04",
      status: "draft"
    },
    {
      title: "Web Development Project",
      subject: "Web Technologies",
      dueDate: "2026-12-10",
      status: "published"
    }
  ];

  const events = [
    {
      id: "tech-fest-2026",
      title: "Annual Flagship Tech Fest",
      location: "Main Auditorium",
      date: "2026-11-20"
    },
    {
      id: "ai-workshop-2026",
      title: "AI & Machine Learning Workshop",
      location: "Computer Lab 2",
      date: "2026-11-24"
    },
    {
      id: "cultural-fest-2026",
      title: "Campus Cultural Fest",
      location: "Open Air Theatre",
      date: "2026-11-28"
    }
  ];

  const activities = [
    {
      title: "Assignment prepared",
      description: "DBMS coursework added to the preview dashboard.",
      time: "Sample activity"
    },
    {
      title: "Event planned",
      description: "Annual Tech Fest listed in sample events.",
      time: "Sample activity"
    },
    {
      title: "Coursework updated",
      description: "AI case study marked as a draft.",
      time: "Sample activity"
    }
  ];

  function makeElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function createAssignmentRow(assignment) {
    const row = makeElement("article", "assignment-row");

    const icon = makeElement("div", "assignment-icon", "▤");

    const info = makeElement("div", "assignment-info");
    info.appendChild(makeElement("h3", "", assignment.title));
    info.appendChild(makeElement("p", "", assignment.subject));

    const side = makeElement("div", "assignment-side");
    side.appendChild(
      makeElement("small", "", `Due ${formatDate(assignment.dueDate)}`)
    );

    side.appendChild(
      makeElement(
        "span",
        `status-tag ${assignment.status}`,
        assignment.status === "published" ? "Published" : "Draft"
      )
    );

    row.append(icon, info, side);
    return row;
  }

  function createEventRow(event) {
    const row = makeElement("article", "event-row");

    const dateBox = makeElement("div", "event-date-box");

    const date = new Date(`${event.date}T12:00:00`);

    dateBox.appendChild(
      makeElement("strong", "", String(date.getDate()))
    );

    dateBox.appendChild(
      makeElement(
        "small",
        "",
        date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()
      )
    );

    const info = makeElement("div", "event-info");
    info.appendChild(makeElement("h3", "", event.title));
    info.appendChild(makeElement("p", "", event.location));

    const link = makeElement("a", "event-details-link", "Details →");
    link.href = `event-details.html?id=${encodeURIComponent(event.id)}`;

    row.append(dateBox, info, link);
    return row;
  }

  function renderAssignments(query = "") {
    const filtered = assignments.filter((assignment) => {
      const searchable = [
        assignment.title,
        assignment.subject,
        assignment.status
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });

    $("assignmentList").replaceChildren(
      ...filtered.map(createAssignmentRow)
    );

    $("assignmentEmpty").hidden = filtered.length > 0;
  }

  function renderEvents(query = "") {
    const filtered = events.filter((event) => {
      return [
        event.title,
        event.location
      ].join(" ").toLowerCase().includes(query);
    });

    $("eventList").replaceChildren(
      ...filtered.map(createEventRow)
    );

    $("eventEmpty").hidden = filtered.length > 0;
  }

  function renderActivity() {
    $("activityList").replaceChildren(
      ...activities.map((activity) => {
        const item = makeElement("div", "activity-item");
        const dot = makeElement("span", "activity-dot");

        const info = makeElement("div", "");
        info.appendChild(makeElement("strong", "", activity.title));
        info.appendChild(makeElement("p", "", activity.description));
        info.appendChild(makeElement("small", "", activity.time));

        item.append(dot, info);
        return item;
      })
    );
  }

  function updateStats() {
    $("totalAssignments").textContent = assignments.length;
    $("pendingReviews").textContent = "8";
    $("upcomingEvents").textContent = events.length;
    $("studentsEngaged").textContent = "124";
  }

  function searchDashboard() {
    const query = $("dashboardSearch").value.trim().toLowerCase();
    renderAssignments(query);
    renderEvents(query);
  }

  function showToast(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
  }

  $("dashboardSearch").addEventListener("input", searchDashboard);

  $("menuBtn").addEventListener("click", () => {
    const open = $("sidebar").classList.toggle("open");
    $("menuBtn").setAttribute("aria-expanded", String(open));
  });

  $("logoutBtn").addEventListener("click", () => {
    showToast(
      "Logout will use the existing authentication helper during integration."
    );
  });

  renderAssignments();
  renderEvents();
  renderActivity();
  updateStats();
});
