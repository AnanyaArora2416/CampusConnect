
"use strict";

const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");

if (registerForm && registerMessage) {
  const submitButton = registerForm.querySelector(
    'button[type="submit"]'
  );

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document
      .getElementById("registerName")
      .value.trim();

    const email = document
      .getElementById("registerEmail")
      .value.trim();

    const password = document
      .getElementById("registerPassword")
      .value;

    const confirmPassword = document
      .getElementById("confirmPassword")
      .value;

    const selectedRole = registerForm.querySelector(
      'input[name="role"]:checked'
    )?.value;

    // Clear previous message.
    registerMessage.textContent = "";
    registerMessage.style.color = "#b91c1c";

    // Teacher accounts cannot be created publicly.
    if (selectedRole !== "student") {
      registerMessage.textContent =
        "Teacher registration requires administrator approval.";
      return;
    }

    // Check that passwords match.
    if (password !== confirmPassword) {
      registerMessage.textContent =
        "Passwords do not match.";
      return;
    }

    // Match the backend's password rules.
    if (password.length < 8 || password.length > 128) {
      registerMessage.textContent =
        "Password must be 8 to 128 characters.";
      return;
    }

    // Prevent duplicate submissions.
    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";

    try {
      const apiBase = window.campusAuth?.API_BASE;

      if (!apiBase) {
        throw new Error("Registration cannot start because the session script did not load.");
      }

      const response = await fetch(
        `${apiBase}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role: "student"
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed."
        );
      }

      registerMessage.textContent =
        "Account created successfully! You can now log in.";

      registerMessage.style.color = "#15803d";

      // Clear the form after successful registration.
      registerForm.reset();

      // Stay on the page so the user can see the result.
      // We'll add navigation to login after testing.

    } catch (error) {
      registerMessage.textContent =
        error.message || "Unable to register. Please try again.";

      registerMessage.style.color = "#b91c1c";

    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Register →";
    }
  });
}
