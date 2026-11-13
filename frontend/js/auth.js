(() => {
  'use strict';
  const KEY = 'campusconnect_token',
    base = (window.CAMPUS_API_BASE || '').replace(/\/$/, '');
  const getToken = () => sessionStorage.getItem(KEY);
  const clearSession = () => {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem('campusconnect_role');
  };
  const dashboardPath = (role) =>
    role === 'admin'
      ? 'admin-dashboard.html'
      : role === 'teacher'
        ? 'teacher-dashboard.html'
        : 'dashboard.html';
  function saveSession(token, role) {
    sessionStorage.setItem(KEY, token);
    sessionStorage.setItem('campusconnect_role', role);
  }
  async function fetchWithAuth(path, options = {}, config = {}) {
    const headers = new Headers(options.headers || {});
    if (getToken()) headers.set('Authorization', `Bearer ${getToken()}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type'))
      headers.set('Content-Type', 'application/json');
    let res;
    try {
      res = await fetch(base + path, { ...options, headers });
    } catch {
      throw Error('Cannot reach CampusConnect. Check your connection and server.');
    }
    if (res.status === 401) {
      clearSession();
      if (
        config.redirectOnUnauthorized !== false &&
        !/\/(login|register)\.html$/.test(location.pathname)
      )
        location.replace('login.html?expired=1');
    }
    return res;
  }
  async function request(path, options = {}, config = {}) {
    const res = await fetchWithAuth(path, options, config),
      data = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(data.message || `Request failed (${res.status})`);
    return data;
  }
  async function currentUser() {
    if (!getToken()) return null;
    const res = await fetchWithAuth('/api/auth/me', {}, { redirectOnUnauthorized: false });
    if (res.status === 401) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(data.message || 'Could not check your session');
    return data.user;
  }
  async function requireRole(roles) {
    if (!getToken()) {
      location.replace('login.html');
      return null;
    }
    const user = await currentUser();
    if (!user) {
      location.replace('login.html?expired=1');
      return null;
    }
    if (roles && ![].concat(roles).includes(user.role)) {
      location.replace(dashboardPath(user.role));
      return null;
    }
    return user;
  }
  async function logout() {
    if (getToken()) await request('/api/auth/logout', { method: 'POST' });
    clearSession();
    location.replace('login.html');
  }
  async function download(path, name) {
    const res = await fetchWithAuth(path);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Error(data.message || 'Download failed');
    }
    const url = URL.createObjectURL(await res.blob()),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.campusAuth = {
    API_BASE: base,
    getToken,
    clearSession,
    saveSession,
    dashboardPath,
    fetchWithAuth,
    request,
    currentUser,
    requireRole,
    logout,
    download,
  };
})();
