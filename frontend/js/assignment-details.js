
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // Frontend preview data; not MongoDB records.
  const demoAssignments = {
    "demo-dbms": {
      title: "DBMS Assignment",
      course: "CS-301 DBMS",
      phase: "Project Phase 1",
      description: "Complete the database design and implementation tasks.",
      marks: 20,
      requirements: [
        {
          title: "ER Diagram",
          description: "Chen / Crow's Foot specs with cardinality and constraints."
        },
        {
          title: "3NF Normalization",
          description: "Functional dependency report proving 1NF to 3NF/BCNF."
        },
        {
          title: "DDL & Queries",
          description: "PostgreSQL scripts, table constraints and 5 analytic queries."
        }
      ],
      resources: [
        { name: "Sample_Template.pdf", detail: "1.4 MB • Formatting Spec" },
        { name: "Guidelines.docx", detail: "840 KB • Schema Rubric" }
      ]
    },
    "demo-cie": {
      title: "CIE Practical Task",
      course: "CS-302 CIE",
      phase: "Practical Task",
      description: "Complete the client-server programming practical.",
      marks: 20,
      requirements: [
        {
          title: "Client Program",
          description: "Implement the client with appropriate input validation."
        },
        {
          title: "Server Program",
          description: "Implement request handling and response logic."
        },
        {
          title: "Documentation",
          description: "Explain execution steps and attach output screenshots."
        }
      ],
      resources: []
    },
    "demo-ai": {
      title: "AI Case Study",
      course: "CS-303 AI",
      phase: "Case Study",
      description: "Analyze heuristic search formulation in robotics.",
      marks: 20,
      requirements: [
        {
          title: "Problem Definition",
          description: "Define the search space, initial state and goal."
        },
        {
          title: "Search Strategy",
          description: "Describe the heuristic and justify your algorithm."
        },
        {
          title: "Results",
          description: "Present findings, limitations and conclusions."
        }
      ],
      resources: []
    },
    "demo-web": {
      title: "Web Development Project",
      course: "Web Technologies",
      phase: "Frontend Project",
      description: "Build a responsive frontend interface.",
      marks: 30,
      requirements: [
        {
          title: "HTML Structure",
          description: "Create semantic, accessible page layouts."
        },
        {
          title: "CSS Styling",
          description: "Build responsive layouts with consistent styling."
        },
        {
          title: "JavaScript",
          description: "Implement and demonstrate interactive features."
        }
      ],
      resources: []
    },
    "demo-python": {
      title: "Python Programming Lab",
      course: "Python Programming",
      phase: "Lab Exercises",
      description: "Complete the assigned programming exercises.",
      marks: 25,
      requirements: [
        {
          title: "Programs",
          description: "Implement the required Python solutions."
        },
        {
          title: "Outputs",
          description: "Capture and explain execution results."
        },
        {
          title: "Report",
          description: "Submit a structured practical report."
        }
      ],
      resources: []
    }
  };

  const params = new URLSearchParams(window.location.search);
  const assignmentId = params.get("id") || "demo-dbms";
  const assignment = demoAssignments[assignmentId];

  const $ = (id) => document.getElementById(id);

  if (!assignment) {
    $("assignmentTitle").textContent = "Assignment not found";
    $("assignmentDescription").textContent =
      "This preview assignment is unavailable. Return to the assignment list.";
    $("submitBtn").disabled = true;
    return;
  }

  $("assignmentTitle").textContent = assignment.title;
  $("breadcrumbCourse").textContent = assignment.course;
  $("breadcrumbAssignment").textContent = assignment.phase;
  $("assignmentDescription").textContent = assignment.description;
  $("marksBadge").textContent = `${assignment.marks} Marks Total`;
  $("dueBadge").textContent = "Preview Deadline";
  $("receiptCourse").textContent = assignment.course;

  const requirementsGrid = $("requirementsGrid");

  assignment.requirements.forEach((requirement, index) => {
    const card = document.createElement("article");
    card.className = "requirement-card";

    const top = document.createElement("div");
    top.className = "requirement-top";

    const icon = document.createElement("span");
    icon.textContent = "☷";

    const part = document.createElement("span");
    part.className = "part-label";
    part.textContent = `Part ${index + 1}`;

    top.append(icon, part);

    const title = document.createElement("h3");
    title.textContent = requirement.title;

    const description = document.createElement("p");
    description.textContent = requirement.description;

    card.append(top, title, description);
    requirementsGrid.appendChild(card);
  });

  const resourcesGrid = $("resourcesGrid");

  if (!assignment.resources.length) {
    const empty = document.createElement("p");
    empty.className = "section-description";
    empty.textContent = "No course resources attached in this preview.";
    resourcesGrid.appendChild(empty);
  } else {
    assignment.resources.forEach((resource) => {
      const card = document.createElement("div");
      card.className = "resource-card";

      const icon = document.createElement("span");
      icon.className = "resource-icon";
      icon.textContent = "▣";

      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = resource.name;

      const detail = document.createElement("small");
      detail.textContent = `${resource.detail} • Preview only`;

      info.append(name, detail);
      card.append(icon, info);
      resourcesGrid.appendChild(card);
    });
  }

  // File selection is local to the browser preview.
  const maxBytes = 25 * 1024 * 1024;
  const allowedExtensions = ["pdf", "zip", "docx"];
  let selectedFile = null;
  let lastFocusedElement = null;

  function showMessage(message, type = "") {
    const element = $("uploadMessage");
    element.textContent = message;
    element.className = `upload-message ${type}`;
  }

  function formatSize(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function handleFile(file) {
    if (!file) return;

    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      showMessage("Please choose a PDF, ZIP or DOCX file.", "error");
      return;
    }

    if (file.size > maxBytes) {
      showMessage("The file must not exceed 25 MB.", "error");
      return;
    }

    if (file.size === 0) {
      showMessage("The selected file is empty.", "error");
      return;
    }

    selectedFile = file;
    $("fileName").textContent = file.name;
    $("fileSize").textContent = `${formatSize(file.size)} • Ready to submit`;
    $("filePreview").hidden = false;
    $("submissionBadge").textContent = "Draft Ready";
    showMessage("File selected successfully.", "success");
  }

  $("dropzone").addEventListener("click", () => $("fileInput").click());

  $("dropzone").addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      $("fileInput").click();
    }
  });

  $("fileInput").addEventListener("change", (event) => {
    handleFile(event.target.files[0]);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    $("dropzone").addEventListener(eventName, (event) => {
      event.preventDefault();
      $("dropzone").classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    $("dropzone").addEventListener(eventName, (event) => {
      event.preventDefault();
      $("dropzone").classList.remove("dragover");
    });
  });

  $("dropzone").addEventListener("drop", (event) => {
    handleFile(event.dataTransfer.files[0]);
  });

  $("removeFileBtn").addEventListener("click", () => {
    selectedFile = null;
    $("fileInput").value = "";
    $("filePreview").hidden = true;
    showMessage("Selected file removed.");
  });

  function closeModal() {
    $("successModal").hidden = true;
    document.body.style.overflow = "";
    lastFocusedElement?.focus();
  }

  $("submitBtn").addEventListener("click", () => {
    if (!selectedFile) {
      showMessage("Please select a file before submitting.", "error");
      return;
    }

    // Preview only: no server upload or verification.
    const reference = `DEMO-${Date.now().toString(36).toUpperCase()}`;

    $("receiptId").textContent = reference;
    $("receiptTime").textContent = new Date().toLocaleString("en-IN");
    $("receiptFileName").textContent = selectedFile.name;
    $("submissionBadge").textContent = "Preview Submitted";

    lastFocusedElement = document.activeElement;
    $("successModal").hidden = false;
    document.body.style.overflow = "hidden";
    $("closeModalBtn").focus();
  });

  $("closeModalBtn").addEventListener("click", closeModal);

  $("successModal").addEventListener("click", (event) => {
    if (event.target === $("successModal")) closeModal();
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
        $("viewStatusBtn"),
        ...$("successModal").querySelectorAll(".modal-actions a")
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

  $("viewStatusBtn").addEventListener("click", () => {
    closeModal();
    showMessage(
      "Preview submission recorded for this page only. No server status exists.",
      "success"
    );
  });

  $("menuBtn").addEventListener("click", () => {
    const open = $("sidebar").classList.toggle("open");
    $("menuBtn").setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".sidebar-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      $("sidebar").classList.remove("open");
      $("menuBtn").setAttribute("aria-expanded", "false");
    });
  });

  // Keep the existing authentication helper intact until integration.
  $("logoutBtn").addEventListener("click", () => {
    showMessage(
      "Logout will be connected to the shared authentication helper."
    );
  });
});
