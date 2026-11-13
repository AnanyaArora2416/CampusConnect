// Shared session helper for CampusConnect.
// The JWT is kept in sessionStorage for this local demo.
// Any script on the page can read it. Logout only removes it
// from this browser tab. The server does not keep a blocklist,
// so a copied token stays valid until it expires (1 hour).

const API_BASE = "http://localhost:5000";
const TOKEN_KEY = "campusconnect_token";
const ROLE_KEY = "campusconnect_role";

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function saveSession(token, role) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(ROLE_KEY, role);
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}

function dashboardPath(role) {
  if (role === "teacher") {
    return "teacher-dashboard.html";
  }

  if (role === "admin") {
    return "admin-dashboard.html";
  }

  if (role === "student") {
    return "dashboard.html";
  }

  return "login.html";
}

function onLoginPage() {
  return /\/login\.html$/i.test(window.location.pathname);
}

function logout() {
  clearSession();
  window.location.replace("login.html");
}

async function fetchWithAuth(path, options = {}, config = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearSession();

    if (config.redirectOnUnauthorized !== false && !onLoginPage()) {
      window.location.replace("login.html");
    }
  }

  return response;
}

async function currentUser() {
  if (!getToken()) {
    return null;
  }

  const response = await fetchWithAuth(
    "/api/auth/me",
    {},
    { redirectOnUnauthorized: false }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!data?.user?.role) {
    clearSession();
    return null;
  }

  saveSession(getToken(), data.user.role);
  return data.user;
}

async function requireRole(expectedRole) {
  if (!getToken()) {
    window.location.replace("login.html");
    return null;
  }

  const response = await fetchWithAuth("/api/auth/me");

  if (response.status === 401) {
    return null;
  }

  const data = await response.json().catch(() => null);
  const user = data?.user;

  if (!response.ok || !user?.role) {
    clearSession();
    window.location.replace("login.html");
    return null;
  }

  saveSession(getToken(), user.role);

  if (user.role !== expectedRole) {
    window.location.replace(dashboardPath(user.role));
    return null;
  }

  return user;
}

window.campusAuth = {
  API_BASE,
  getToken,
  saveSession,
  clearSession,
  dashboardPath,
  logout,
  fetchWithAuth,
  currentUser,
  requireRole
};
