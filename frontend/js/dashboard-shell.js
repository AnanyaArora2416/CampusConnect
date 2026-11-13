document.addEventListener("DOMContentLoaded", async () => {
  const expectedRole = document.body.dataset.role;
  const status = document.getElementById("shellStatus");
  const main = document.getElementById("shellMain");
  const logoutButton = document.getElementById("logoutButton");

  logoutButton.addEventListener("click", () => {
    window.campusAuth.logout();
  });

  status.textContent = "Checking your session...";

  try {
    const user = await window.campusAuth.requireRole(expectedRole);

    if (!user) {
      return;
    }

    document.getElementById("shellName").textContent = user.name;
    document.getElementById("shellEmail").textContent = user.email;
    document.getElementById("shellRole").textContent = user.role;
    status.textContent = "";
    main.hidden = false;
  } catch (error) {
    status.textContent = "Unable to reach the server. Check that the backend is running, then refresh.";
  }
});
