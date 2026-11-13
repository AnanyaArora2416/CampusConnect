
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "campusconnect_demo_registered_events";

  const events = [
    {
      id: "tech-fest-2026",
      title: "Annual Flagship Tech Fest",
      category: "Technology",
      date: "2026-11-20",
      time: "09:00 AM",
      location: "Main Auditorium",
      description: "A celebration of innovation, hackathons, robotics, and emerging technology.",
      icon: "💻"
    },
    {
      id: "ai-workshop-2026",
      title: "AI & Machine Learning Workshop",
      category: "Workshop",
      date: "2026-11-24",
      time: "11:00 AM",
      location: "Computer Lab 2",
      description: "Learn practical machine learning concepts through guided hands-on activities.",
      icon: "🤖"
    },
    {
      id: "cultural-fest-2026",
      title: "Campus Cultural Fest",
      category: "Cultural",
      date: "2026-11-28",
      time: "04:00 PM",
      location: "Open Air Theatre",
      description: "Celebrate music, dance, creativity, and the diverse talents of campus students.",
      icon: "🎭"
    },
    {
      id: "sports-meet-2026",
      title: "Interdepartmental Sports Meet",
      category: "Sports",
      date: "2026-12-02",
      time: "08:30 AM",
      location: "College Sports Ground",
      description: "Compete with fellow students in athletics, football, badminton, and more.",
      icon: "🏆"
    },
    {
      id: "web-dev-2026",
      title: "Modern Web Development Bootcamp",
      category: "Workshop",
      date: "2026-12-05",
      time: "10:00 AM",
      location: "Innovation Lab",
      description: "Explore frontend development, responsive layouts, and real-world web projects.",
      icon: "🧑‍💻"
    },
    {
      id: "hackathon-2026",
      title: "Campus Innovation Hackathon",
      category: "Technology",
      date: "2026-12-10",
      time: "09:00 AM",
      location: "Technology Block",
      description: "Build creative solutions, collaborate with teams, and showcase your ideas.",
      icon: "🚀"
    }
  ];

  let activeFilter = "all";
  let pendingCancelId = null;
  let lastFocusedElement = null;

  function getRegisteredIds() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

      return Array.isArray(saved)
        ? [...new Set(saved.filter((id) => typeof id === "string"))]
        : [];
    } catch {
      return [];
    }
  }

  function saveRegisteredIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      return true;
    } catch {
      return false;
    }
  }

  function getRegisteredEvents() {
    const ids = getRegisteredIds();
    return events.filter((event) => ids.includes(event.id));
  }

  function isPastEvent(event) {
    const endOfEventDay = new Date(`${event.date}T23:59:59`);
    return endOfEventDay.getTime() < Date.now();
  }

  function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function makeElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function createEventCard(event) {
    const card = makeElement("article", "event-card");

    const visual = makeElement(
      "div",
      `event-visual ${event.category.toLowerCase()}`
    );

    visual.appendChild(makeElement("span", "event-icon", event.icon));
    visual.appendChild(
      makeElement("span", "event-category", event.category)
    );

    const body = makeElement("div", "event-body");

    body.appendChild(
      makeElement("span", "event-date", `📅 ${formatDate(event.date)}`)
    );

    body.appendChild(makeElement("h3", "", event.title));

    body.appendChild(
      makeElement("p", "event-description", event.description)
    );

    const meta = makeElement("div", "event-meta");
    meta.appendChild(makeElement("span", "", `🕘 ${event.time}`));
    meta.appendChild(makeElement("span", "", `📍 ${event.location}`));
    body.appendChild(meta);

    const past = isPastEvent(event);

    body.appendChild(
      makeElement(
        "span",
        `status-badge ${past ? "past" : "upcoming"}`,
        past ? "Past Event" : "Upcoming"
      )
    );

    const actions = makeElement("div", "event-actions");

    const details = makeElement("a", "details-link", "View Details");
    details.href =
      `event-details.html?id=${encodeURIComponent(event.id)}`;

    const cancel = makeElement("button", "cancel-btn", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => openCancelModal(event));

    actions.append(details, cancel);
    body.appendChild(actions);
    card.append(visual, body);

    return card;
  }

  function updateStats(registered) {
    const past = registered.filter(isPastEvent).length;

    $("totalCount").textContent = registered.length;
    $("upcomingCount").textContent = registered.length - past;
    $("pastCount").textContent = past;
  }

  function renderEvents() {
    const registered = getRegisteredEvents();
    updateStats(registered);

    const query = $("eventSearch").value.trim().toLowerCase();
    const sort = $("sortEvents").value;

    const filtered = registered.filter((event) => {
      const past = isPastEvent(event);

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "past" && past) ||
        (activeFilter === "upcoming" && !past);

      const text = [
        event.title,
        event.category,
        event.location,
        event.description
      ].join(" ").toLowerCase();

      return matchesFilter && text.includes(query);
    });

    filtered.sort((a, b) => {
      if (sort === "latest") return b.date.localeCompare(a.date);
      if (sort === "name") return a.title.localeCompare(b.title);
      return a.date.localeCompare(b.date);
    });

    $("eventsGrid").replaceChildren(
      ...filtered.map(createEventCard)
    );

    $("visibleCount").textContent =
      `${filtered.length} Event${filtered.length === 1 ? "" : "s"}`;

    const empty = filtered.length === 0;
    $("emptyState").hidden = !empty;

    if (empty) {
      if (registered.length === 0) {
        $("emptyTitle").textContent = "No registered events yet";
        $("emptyDescription").textContent =
          "Explore campus events and register for one that interests you.";
      } else {
        $("emptyTitle").textContent = "No matching events";
        $("emptyDescription").textContent =
          "Try a different search or switch event filters.";
      }
    }
  }

  function showToast(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
  }

  function openCancelModal(event) {
    pendingCancelId = event.id;
    $("cancelEventName").textContent = event.title;

    lastFocusedElement = document.activeElement;
    $("cancelModal").hidden = false;
    document.body.style.overflow = "hidden";
    $("keepBtn").focus();
  }

  function closeCancelModal() {
    $("cancelModal").hidden = true;
    document.body.style.overflow = "";
    pendingCancelId = null;
    lastFocusedElement?.focus();
  }

  $("confirmCancelBtn").addEventListener("click", () => {
    if (!pendingCancelId) return;

    const updatedIds = getRegisteredIds().filter(
      (id) => id !== pendingCancelId
    );

    if (!saveRegisteredIds(updatedIds)) {
      showToast("Unable to update demo registrations.");
      return;
    }

    closeCancelModal();
    renderEvents();
    showToast("Demo registration cancelled.");
  });

  $("keepBtn").addEventListener("click", closeCancelModal);
  $("closeModalBtn").addEventListener("click", closeCancelModal);

  $("cancelModal").addEventListener("click", (event) => {
    if (event.target === $("cancelModal")) closeCancelModal();
  });

  document.addEventListener("keydown", (event) => {
    if ($("cancelModal").hidden) return;

    if (event.key === "Escape") {
      closeCancelModal();
      return;
    }

    if (event.key === "Tab") {
      const focusable = [
        $("closeModalBtn"),
        $("keepBtn"),
        $("confirmCancelBtn")
      ];

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  $("eventSearch").addEventListener("input", renderEvents);
  $("sortEvents").addEventListener("change", renderEvents);

  $("eventTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    activeFilter = button.dataset.filter;

    $("eventTabs").querySelectorAll(".tab").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });

    renderEvents();
  });

  $("menuBtn").addEventListener("click", () => {
    const open = $("sidebar").classList.toggle("open");
    $("menuBtn").setAttribute("aria-expanded", String(open));
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) renderEvents();
  });

  window.addEventListener("pageshow", renderEvents);

  renderEvents();
});
