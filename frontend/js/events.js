// Event pages behavior for CampusConnect.
// Event logic will be added in a later stage.

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // Demo events for frontend development.
  // Replace these with backend API data during integration.
  const events = [
    {
      id: "tech-fest-2026",
      title: "Annual Flagship Tech Fest",
      category: "Technology",
      date: "2026-11-20",
      time: "09:00 AM",
      location: "Main Auditorium",
      description:
        "A celebration of innovation, hackathons, robotics, and emerging technology.",
      icon: "💻"
    },
    {
      id: "ai-workshop-2026",
      title: "AI & Machine Learning Workshop",
      category: "Workshop",
      date: "2026-11-24",
      time: "11:00 AM",
      location: "Computer Lab 2",
      description:
        "Learn practical machine learning concepts through guided hands-on activities.",
      icon: "🤖"
    },
    {
      id: "cultural-fest-2026",
      title: "Campus Cultural Fest",
      category: "Cultural",
      date: "2026-11-28",
      time: "04:00 PM",
      location: "Open Air Theatre",
      description:
        "Celebrate music, dance, creativity, and the diverse talents of campus students.",
      icon: "🎭"
    },
    {
      id: "sports-meet-2026",
      title: "Interdepartmental Sports Meet",
      category: "Sports",
      date: "2026-12-02",
      time: "08:30 AM",
      location: "College Sports Ground",
      description:
        "Compete with fellow students in athletics, football, badminton, and more.",
      icon: "🏆"
    },
    {
      id: "web-dev-2026",
      title: "Modern Web Development Bootcamp",
      category: "Workshop",
      date: "2026-12-05",
      time: "10:00 AM",
      location: "Innovation Lab",
      description:
        "Explore frontend development, responsive layouts, and real-world web projects.",
      icon: "🧑‍💻"
    },
    {
      id: "hackathon-2026",
      title: "Campus Innovation Hackathon",
      category: "Technology",
      date: "2026-12-10",
      time: "09:00 AM",
      location: "Technology Block",
      description:
        "Build creative solutions, collaborate with teams, and showcase your ideas.",
      icon: "🚀"
    }
  ];

  const storageKey = "campusconnect_demo_registered_events";

  let selectedCategory = "All";
  let lastFocusedElement = null;

  function getRegisteredIds() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");

      return Array.isArray(stored)
        ? stored.filter((id) => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  }

  function saveRegisteredIds(ids) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
      return true;
    } catch {
      return false;
    }
  }

  function isRegistered(id) {
    return getRegisteredIds().includes(id);
  }

  function formatDate(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function createElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function createEventCard(event) {
    const card = createElement("article", "event-card");

    const visual = createElement(
      "div",
      `event-image ${event.category.toLowerCase()}`
    );

    visual.appendChild(
      createElement("span", "event-image-icon", event.icon)
    );

    visual.appendChild(
      createElement("span", "image-category", event.category)
    );

    const body = createElement("div", "event-body");

    body.appendChild(
      createElement(
        "div",
        "event-date",
        `📅 ${formatDate(event.date)}`
      )
    );

    body.appendChild(createElement("h3", "", event.title));

    body.appendChild(
      createElement("p", "event-description", event.description)
    );

    const meta = createElement("div", "event-meta");

    meta.appendChild(
      createElement("span", "", `🕘 ${event.time}`)
    );

    meta.appendChild(
      createElement("span", "", `📍 ${event.location}`)
    );

    body.appendChild(meta);

    const footer = createElement("div", "event-footer");

    const details = createElement(
      "button",
      "outline-btn",
      "View Details"
    );

    details.type = "button";
    details.addEventListener("click", () => {
      // Demo detail navigation.
      // The detail page can read this selected event.
      sessionStorage.setItem(
        "campusconnect_selected_event",
        JSON.stringify(event)
      );

      window.location.href =
        `event-details.html?id=${encodeURIComponent(event.id)}`;
    });

    const register = createElement(
      "button",
      isRegistered(event.id)
        ? "primary-btn registered-btn"
        : "primary-btn",
      isRegistered(event.id) ? "✓ Registered" : "Register →"
    );

    register.type = "button";
    register.disabled = isRegistered(event.id);

    register.addEventListener("click", () => {
      registerForEvent(event.id);
    });

    footer.append(details, register);
    body.appendChild(footer);
    card.append(visual, body);

    return card;
  }

  function getFilteredEvents() {
    const query = $("eventSearch").value.trim().toLowerCase();
    const sort = $("sortEvents").value;

    const filtered = events.filter((event) => {
      const matchesCategory =
        selectedCategory === "All" ||
        event.category === selectedCategory;

      const searchableText = [
        event.title,
        event.category,
        event.description,
        event.location
      ].join(" ").toLowerCase();

      return matchesCategory && searchableText.includes(query);
    });

    filtered.sort((a, b) => {
      if (sort === "latest") {
        return b.date.localeCompare(a.date);
      }

      if (sort === "name") {
        return a.title.localeCompare(b.title);
      }

      return a.date.localeCompare(b.date);
    });

    return filtered;
  }

  function renderEvents() {
    const filtered = getFilteredEvents();

    $("eventsGrid").replaceChildren(
      ...filtered.map(createEventCard)
    );

    $("eventCount").textContent =
      `${filtered.length} Event${filtered.length === 1 ? "" : "s"}`;

    $("emptyState").hidden = filtered.length > 0;

    const featuredButton = $("featuredRegisterBtn");

    if (isRegistered("tech-fest-2026")) {
      featuredButton.textContent = "✓ Registered";
      featuredButton.disabled = true;
      featuredButton.classList.add("registered-btn");
    } else {
      featuredButton.textContent = "Register Now →";
      featuredButton.disabled = false;
      featuredButton.classList.remove("registered-btn");
    }
  }

  function showToast(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
  }

  function closeModal() {
    $("registrationModal").hidden = true;
    document.body.style.overflow = "";
    lastFocusedElement?.focus();
  }

  function registerForEvent(id) {
    const event = events.find((item) => item.id === id);

    if (!event) {
      showToast("Event not found.");
      return;
    }

    if (isRegistered(id)) {
      showToast("This event is already in your demo registrations.");
      return;
    }

    const registeredIds = getRegisteredIds();
    registeredIds.push(id);

    if (!saveRegisteredIds(registeredIds)) {
      showToast("Unable to save this demo registration.");
      return;
    }

    renderEvents();

    $("modalEventName").textContent = event.title;

    $("modalDescription").textContent =
      "Your demo registration was saved in this browser only. " +
      "It has not been submitted to the CampusConnect backend.";

    lastFocusedElement = document.activeElement;
    $("registrationModal").hidden = false;
    document.body.style.overflow = "hidden";
    $("closeModalBtn").focus();
  }

  $("eventSearch").addEventListener("input", renderEvents);

  $("sortEvents").addEventListener("change", renderEvents);

  $("categoryFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");

    if (!button) return;

    selectedCategory = button.dataset.category;

    $("categoryFilters")
      .querySelectorAll(".filter-btn")
      .forEach((item) => {
        item.classList.toggle("active", item === button);
      });

    renderEvents();
  });

  $("clearFiltersBtn").addEventListener("click", () => {
    selectedCategory = "All";
    $("eventSearch").value = "";
    $("sortEvents").value = "soonest";

    $("categoryFilters")
      .querySelectorAll(".filter-btn")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.category === "All"
        );
      });

    renderEvents();
  });

  $("featuredRegisterBtn").addEventListener("click", () => {
    registerForEvent("tech-fest-2026");
  });

  $("closeModalBtn").addEventListener("click", closeModal);
  $("modalDoneBtn").addEventListener("click", closeModal);

  $("registrationModal").addEventListener("click", (event) => {
    if (event.target === $("registrationModal")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if ($("registrationModal").hidden) return;

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key === "Tab") {
      const focusable = [
        $("closeModalBtn"),
        $("modalDoneBtn"),
        $("registrationModal").querySelector(".primary-link")
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

  $("menuBtn").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });

  renderEvents();
});
