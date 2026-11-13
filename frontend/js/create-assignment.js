
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("assignmentForm");
  const requirementsContainer = $("requirementsContainer");

  let requirementCount = 0;
  let lastFocusedElement = null;

  function createRequirement(title = "", description = "") {
    if (requirementsContainer.children.length >= 10) {
      showMessage("Maximum 10 requirements allowed.", "error");
      return;
    }

    requirementCount++;

    const item = document.createElement("div");
    item.className = "requirement-item";

    item.innerHTML = `
      <div class="requirement-header">
        <strong class="requirement-number"></strong>
        <button type="button" class="remove-task-btn">
          Remove
        </button>
      </div>

      <div class="form-group">
        <label>Requirement Title</label>
        <input
          type="text"
          class="requirement-title"
          maxlength="120"
          placeholder="e.g. ER Diagram">
      </div>

      <div class="form-group">
        <label>Requirement Description</label>
        <textarea
          class="requirement-description"
          rows="3"
          maxlength="1000"
          placeholder="Describe what students must complete..."></textarea>
      </div>
    `;

    item.querySelector(".requirement-title").value = title;
    item.querySelector(".requirement-description").value = description;

    item.querySelector(".remove-task-btn").addEventListener("click", () => {
      if (requirementsContainer.children.length === 1) {
        showMessage(
          "At least one requirement section must remain.",
          "error"
        );
        return;
      }

      item.remove();
      renumberRequirements();
      updateSummary();
    });

    item.addEventListener("input", updateSummary);

    requirementsContainer.appendChild(item);

    renumberRequirements();
    updateSummary();
  }

  function renumberRequirements() {
    const items = requirementsContainer.querySelectorAll(".requirement-item");

    items.forEach((item, index) => {
      item.querySelector(".requirement-number").textContent =
        `Requirement ${index + 1}`;
    });
  }

  function getStatus() {
    return form.querySelector('input[name="status"]:checked').value;
  }

  function updateSummary() {
    $("summaryTitle").textContent =
      $("title").value.trim() || "Not entered";

    $("summarySubject").textContent =
      $("subject").value.trim() || "Not selected";

    const deadline = $("dueDate").value;

    $("summaryDeadline").textContent = deadline
      ? new Date(deadline).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short"
        })
      : "Not selected";

    $("summaryTasks").textContent =
      requirementsContainer.children.length;

    const status = getStatus();

    $("summaryStatus").textContent =
      status === "published" ? "Published" : "Draft";

    $("saveBtn").textContent =
      status === "published" ? "Publish Assignment" : "Save Draft";

    $("draftOption").classList.toggle(
      "selected",
      status === "draft"
    );

    $("publishOption").classList.toggle(
      "selected",
      status === "published"
    );
  }

  function showMessage(message, type = "") {
    const element = $("formMessage");
    element.textContent = message;
    element.className = `form-message ${type}`;
  }

  function validateForm() {
    const title = $("title").value.trim();
    const subject = $("subject").value.trim();
    const description = $("description").value.trim();
    const dueDate = $("dueDate").value;

    if (!title || !subject || !description || !dueDate) {
      return "Please complete all required assignment fields.";
    }

    if (title.length > 150) {
      return "Assignment title is too long.";
    }

    const deadline = new Date(dueDate);

    if (
      Number.isNaN(deadline.getTime()) ||
      deadline.getTime() <= Date.now()
    ) {
      return "Please select a valid future deadline.";
    }

    const requirementItems = [
      ...requirementsContainer.querySelectorAll(".requirement-item")
    ];

    const incompleteRequirement = requirementItems.some((item) => {
      const taskTitle =
        item.querySelector(".requirement-title").value.trim();

      const taskDescription =
        item.querySelector(".requirement-description").value.trim();

      return !taskTitle || !taskDescription;
    });

    if (incompleteRequirement) {
      return "Please complete every requirement title and description.";
    }

    return null;
  }

  function getAssignmentData() {
    const requirements = [
      ...requirementsContainer.querySelectorAll(".requirement-item")
    ].map((item) => ({
      title: item.querySelector(".requirement-title").value.trim(),
      description: item.querySelector(".requirement-description").value.trim()
    }));

    return {
      title: $("title").value.trim(),
      subject: $("subject").value.trim(),
      description: $("description").value.trim(),
      dueDate: new Date($("dueDate").value).toISOString(),
      status: getStatus(),
      requirements,
      resourceNotes: $("resources").value.trim()
    };
  }

  function closeModal() {
    $("successModal").hidden = true;
    document.body.style.overflow = "";
    lastFocusedElement?.focus();
  }

  function resetForm() {
    form.reset();
    requirementsContainer.replaceChildren();

    createRequirement();
    $("descriptionCount").textContent = "0 / 5000";
    showMessage("");
    updateSummary();
  }

  $("addTaskBtn").addEventListener("click", () => {
    createRequirement();
  });

  $("description").addEventListener("input", () => {
    $("descriptionCount").textContent =
      `${$("description").value.length} / 5000`;
  });

  ["title", "subject", "dueDate"].forEach((id) => {
    $(id).addEventListener("input", updateSummary);
  });

  form.querySelectorAll('input[name="status"]').forEach((radio) => {
    radio.addEventListener("change", updateSummary);
  });

  $("resetBtn").addEventListener("click", () => {
    if (window.confirm("Clear all assignment information?")) {
      resetForm();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const error = validateForm();

    if (error) {
      showMessage(error, "error");
      return;
    }

    const assignment = getAssignmentData();

    // Frontend preview only.
    // The assignment is not sent to the backend yet.
    // We keep a temporary copy in sessionStorage for this browser tab.
    try {
      sessionStorage.setItem(
        "campusconnect_assignment_preview",
        JSON.stringify(assignment)
      );
    } catch {
      // The preview modal still works if storage is unavailable.
    }

    $("modalAssignmentTitle").textContent = assignment.title;
    $("modalStatus").textContent =
      assignment.status === "published"
        ? "Published (Preview)"
        : "Draft (Preview)";

    $("successTitle").textContent =
      assignment.status === "published"
        ? "Assignment Preview Ready!"
        : "Draft Preview Saved!";

    $("successDescription").textContent =
      "This is a frontend preview only. No assignment has been saved to MongoDB or published to students.";

    lastFocusedElement = document.activeElement;
    $("successModal").hidden = false;
    document.body.style.overflow = "hidden";
    $("closeModalBtn").focus();

    showMessage(
      "Preview saved locally. Backend integration is pending.",
      "success"
    );
  });

  $("closeModalBtn").addEventListener("click", closeModal);

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
        $("createAnotherBtn"),
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

  $("createAnotherBtn").addEventListener("click", () => {
    closeModal();
    resetForm();
    $("title").focus();
  });

  $("menuBtn").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });

  // Initial form state
  createRequirement();
  updateSummary();
});
