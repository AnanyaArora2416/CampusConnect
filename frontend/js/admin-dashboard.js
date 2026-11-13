
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // FRONTEND PREVIEW DATA ONLY.
  // Replace with authenticated Admin API responses later.
  const sampleUsers = [
    {
      name: "Aarav Sharma",
      email: "aarav@example.com",
      role: "student",
      department: "MCA",
      status: "Active"
    },
    {
      name: "Priya Mehta",
      email: "priya@example.com",
      role: "student",
      department: "BCA",
      status: "Active"
    },
    {
      name: "Dr. Neha Verma",
      email: "neha@example.com",
      role: "teacher",
      department: "Computer Science",
      status: "Active"
    },
    {
      name: "Prof. Rahul Singh",
      email: "rahul@example.com",
      role: "teacher",
      department: "Information Technology",
      status: "Active"
    }
  ];

  const usersTableBody =
    document.getElementById("usersTableBody");

  const searchInput =
    document.getElementById("userSearch");

  const roleFilter =
    document.getElementById("roleFilter");

  const toast =
    document.getElementById("toast");

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timeout);

    showToast.timeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  function renderUsers() {
    const query = searchInput.value.trim().toLowerCase();
    const role = roleFilter.value;

    const filtered = sampleUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);

      const matchesRole =
        role === "all" || user.role === role;

      return matchesSearch && matchesRole;
    });

    usersTableBody.replaceChildren();

    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 5;
      cell.textContent = "No matching users found.";
      cell.style.textAlign = "center";

      row.appendChild(cell);
      usersTableBody.appendChild(row);
      return;
    }

    filtered.forEach((user) => {
      const row = document.createElement("tr");

      const userCell = document.createElement("td");
      const userWrap = document.createElement("div");
      userWrap.className = "user-cell";

      const avatar = document.createElement("span");
      avatar.className = "user-avatar";
      avatar.textContent = user.name.charAt(0);

      const details = document.createElement("div");

      const name = document.createElement("strong");
      name.textContent = user.name;

      const email = document.createElement("small");
      email.textContent = user.email;

      details.append(name, email);
      userWrap.append(avatar, details);
      userCell.appendChild(userWrap);

      const roleCell = document.createElement("td");
      const roleBadge = document.createElement("span");
      roleBadge.className = "status-badge role-badge";
      roleBadge.textContent = user.role;
      roleCell.appendChild(roleBadge);

      const departmentCell = document.createElement("td");
      departmentCell.textContent = user.department;

      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = "status-badge published";
      statusBadge.textContent = user.status;
      statusCell.appendChild(statusBadge);

      const actionCell = document.createElement("td");
      const button = document.createElement("button");
      button.className = "action-btn";
      button.type = "button";
      button.textContent = "View";
      button.addEventListener("click", () => {
        showToast(
          "User details will be connected to the Admin API later."
        );
      });

      actionCell.appendChild(button);

      row.append(
        userCell,
        roleCell,
        departmentCell,
        statusCell,
        actionCell
      );

      usersTableBody.appendChild(row);
    });
  }

  searchInput.addEventListener("input", renderUsers);
  roleFilter.addEventListener("change", renderUsers);

  document.querySelectorAll(".preview-action").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(
        "User creation will be enabled after Admin API integration."
      );
    });
  });

  const sidebar = document.querySelector(".sidebar");
  const menuToggle = document.getElementById("menuToggle");

  menuToggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      sidebar.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  document.getElementById("logoutBtn").addEventListener(
    "click",
    () => {
      showToast(
        "Logout will be connected to the existing authentication helper."
      );
    }
  );

  renderUsers();
});
