
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const REGISTRATION_KEY = "campusconnect_demo_registered_events";
  const SELECTED_EVENT_KEY = "campusconnect_selected_event";

  let currentEvent = null;
  let lastFocusedElement = null;

  // Matches the demo events in events.js.
  // This fallback allows event-details.html?id=... to work
  // even when opened directly from the browser.
  const demoEvents = [
    {
      id: "tech-fest-2026",
      title: "Annual Flagship Tech Fest",
      category: "Technology",
      date: "2026-11-20",
      time: "09:00 AM",
      location: "Main Auditorium",
      description:
        "Join an exciting celebration of technology, innovation, hackathons, robotics, and student creativity."
    },
    {
      id: "ai-workshop-2026",
      title: "AI & Machine Learning Workshop",
      category: "Workshop",
      date: "2026-11-24",
      time: "11:00 AM",
      location: "Computer Lab 2",
      description:
        "Learn practical machine learning concepts through guided hands-on activities."
    },
    {
      id: "cultural-fest-2026",
      title: "Campus Cultural Fest",
      category: "Cultural",
      date: "2026-11-28",
      time: "04:00 PM",
      location: "Open Air Theatre",
      description:
        "Celebrate music, dance, creativity, and the diverse talents of campus students."
    },
    {
      id: "sports-meet-2026",
      title: "Interdepartmental Sports Meet",
      category: "Sports",
      date: "2026-12-02",
      time: "08:30 AM",
      location: "College Sports Ground",
      description:
        "Compete with fellow students in athletics, football, badminton, and more."
    },
    {
      id: "web-dev-2026",
      title: "Modern Web Development Bootcamp",
      category: "Workshop",
      date: "2026-12-05",
      time: "10:00 AM",
      location: "Innovation Lab",
      description:
        "Explore frontend development, responsive layouts, and real-world web projects."
    },
    {
      id: "hackathon-2026",
      title: "Campus Innovation Hackathon",
      category: "Technology",
      date: "2026-12-10",
      time: "09:00 AM",
      location: "Technology Block",
      description:
        "Build creative solutions, collaborate with teams, and showcase your ideas."
    }
  ];

  function getSelectedEvent() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("id");

    if (!eventId) return null;

    // Use the known event catalog as the source of truth.
    // Do not trust arbitrary sessionStorage data for rendering.
    return demoEvents.find((event) => event.id === eventId) || null;
  }

  function getRegisteredIds() {
    try {
      const data = JSON.parse(
        localStorage.getItem(REGISTRATION_KEY) || "[]"
      );

      return Array.isArray(data)
        ? data.filter((id) => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  }

  function saveRegisteredIds(ids) {
    try {
      localStorage.setItem(
        REGISTRATION_KEY,
        JSON.stringify(ids)
      );
      return true;
    } catch {
      return false;
    }
  }

  function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function renderEvent(event) {
    document.title = `${event.title} | CampusConnect`;

    $("eventTitle").textContent = event.title;
    $("heroCategory").textContent = event.category;
    $("heroDescription").textContent = event.description;

    $("heroDate").textContent = `📅 ${formatDate(event.date)}`;
    $("heroTime").textContent = `🕘 ${event.time}`;
    $("heroLocation").textContent = `📍 ${event.location}`;

    $("eventDescription").textContent = event.description;

    $("infoCategory").textContent = event.category;
    $("infoDate").textContent = formatDate(event.date);
    $("infoTime").textContent = event.time;
    $("infoLocation").textContent = event.location;

    $("registerDate").textContent = formatDate(event.date);
    $("registerTime").textContent = event.time;
    $("registerLocation").textContent = event.location;

    $("eventContent").hidden = false;

    updateRegistrationButton();
  }

  function updateRegistrationButton() {
    if (!currentEvent) return;

    const registered = getRegisteredIds().includes(currentEvent.id);
    const button = $("registerBtn");

    button.disabled = registered;
    button.classList.toggle("registered", registered);

    button.textContent = registered
      ? "✓ Registered (Demo)"
      : "Register for Event →";
  }

  function registerForEvent() {
    if (!currentEvent) return;

    const ids = getRegisteredIds();

    if (ids.includes(currentEvent.id)) {
      updateRegistrationButton();
      return;
    }

    ids.push(currentEvent.id);

    if (!saveRegisteredIds(ids)) {
      $("registrationMessage").textContent =
        "Unable to save the demo registration.";
      return;
    }

    $("registrationMessage").textContent = "";
    updateRegistrationButton();

    $("modalEventName").textContent = currentEvent.title;

    lastFocusedElement = document.activeElement;
    $("successModal").hidden = false;
    document.body.style.overflow = "hidden";
    $("closeModalBtn").focus();
  }

  function closeModal() {
    $("successModal").hidden = true;
    document.body.style.overflow = "";
    lastFocusedElement?.focus();
  }

  $("registerBtn").addEventListener("click", registerForEvent);

  $("closeModalBtn").addEventListener("click", closeModal);
  $("continueBtn").addEventListener("click", closeModal);

  $("successModal").addEventListener("click", (event) => {
    if (event.target === $("successModal")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if ($("successModal").hidden) return;

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key === "Tab") {
      const focusable = [
        $("closeModalBtn"),
        $("continueBtn"),
        $("successModal").querySelector(".primary-link")
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

  currentEvent = getSelectedEvent();

  if (currentEvent) {
    renderEvent(currentEvent);
  } else {
    $("notFound").hidden = false;
  }
});
