// Same-origin API by default. No secrets belong in browser configuration.
window.CAMPUS_API_BASE = location.port === '5500' ? `${location.protocol}//${location.hostname}:5000` : '';
