const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const submitButton = loginForm.querySelector('button[type="submit"]');

if (!window.campusAuth) {
  showLoginMessage(
    "Sign-in cannot start because the session script did not load.",
    "#b91c1c"
  );
}

function showLoginMessage(text, color) {
  loginMessage.textContent = text;
  loginMessage.style.color = color;
}

async function redirectIfAlreadySignedIn() {
  if (!window.campusAuth) {
    return;
  }

  const user = await window.campusAuth.currentUser();

  if (user) {
    window.location.replace(window.campusAuth.dashboardPath(user.role));
  }
}

redirectIfAlreadySignedIn();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const selectedRole = loginForm.querySelector(
    'input[name="role"]:checked'
  )?.value;

  if (!selectedRole) {
    showLoginMessage("Choose Student, Teacher, or Admin.", "#b91c1c");
    return;
  }

  if (!window.campusAuth?.API_BASE) {
    showLoginMessage(
      "Sign-in cannot start because the session script did not load.",
      "#b91c1c"
    );
    return;
  }

  showLoginMessage("Logging in...", "#4d35b7");
  submitButton.disabled = true;

  try {
    const response = await fetch(
      `${window.campusAuth.API_BASE}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    const actualRole = data.user?.role;

    if (actualRole !== selectedRole) {
      showLoginMessage(
        `This account is registered as ${actualRole || "another role"}. Choose that role and try again.`,
        "#b91c1c"
      );
      return;
    }

    if (!data.token) {
      throw new Error("No authentication token received");
    }

    window.campusAuth.saveSession(data.token, actualRole);
    showLoginMessage("Login successful!", "#15803d");
    window.location.assign(window.campusAuth.dashboardPath(actualRole));
  } catch (error) {
    showLoginMessage(error.message || "Unable to login. Please try again.", "#b91c1c");
  } finally {
    submitButton.disabled = false;
  }
});
