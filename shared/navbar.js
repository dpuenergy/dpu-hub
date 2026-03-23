(function () {
  var HUB = 'https://calm-cocada-79e019.netlify.app';
  var SECRET = 'DPU2025int';

  var script = document.currentScript;
  var toolName = (script && script.getAttribute('data-tool')) || document.title;
  var hubUrl = (script && script.getAttribute('data-hub')) || HUB + '/';

  // ── Auth ──────────────────────────────────────────────────────────────────
  var onHub = window.location.origin === HUB;
  var isHubRoot = onHub && (
    window.location.pathname === '/' ||
    window.location.pathname === '/index.html' ||
    window.location.pathname === ''
  );

  if (isHubRoot) {
    // Hub root handles its own auth (login form) — skip
  } else if (onHub) {
    // Same-origin subpage: protect via localStorage session
    var valid = false;
    try {
      var stored = JSON.parse(localStorage.getItem('dpu_user') || 'null');
      if (stored && stored.expires_at > Date.now()) valid = true;
    } catch(e) {}
    if (!valid) { window.location.replace(HUB + '/'); return; }
  } else {
    // Cross-origin tool: check access_token URL param → sessionStorage
    var params = new URLSearchParams(window.location.search);
    var token = params.get('access_token');
    if (token) {
      try { sessionStorage.setItem('dpu_access', token); } catch(e) {}
    } else {
      try { token = sessionStorage.getItem('dpu_access'); } catch(e) {}
    }
    var crossValid = false;
    if (token) {
      try { crossValid = atob(token).indexOf(':' + SECRET) > 0; } catch(e) {}
    }
    if (!crossValid) { window.location.replace(HUB + '/'); return; }
  }

  // ── User email ────────────────────────────────────────────────────────────
  var userEmail = '';
  try {
    userEmail = new URLSearchParams(window.location.search).get('dpu_user') || '';
    if (!userEmail) {
      var sess = JSON.parse(localStorage.getItem('dpu_user') || 'null');
      if (sess && sess.access_token) {
        var payload = JSON.parse(atob(sess.access_token.split('.')[1]));
        userEmail = payload.email || '';
      }
    }
  } catch (e) {}

  // ── Styles ────────────────────────────────────────────────────────────────
  var css = document.createElement('style');
  css.textContent = [
    '#dpu-nav{position:fixed;top:0;left:0;right:0;height:48px;',
      'background:#1b3280;color:#fff;',
      'display:flex;align-items:center;padding:0 20px;gap:10px;',
      'z-index:999999;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;',
      'font-size:14px;box-shadow:0 2px 12px rgba(0,0,0,.28);}',
    '#dpu-nav a{color:#fff;text-decoration:none;}',
    '#dpu-nav .dpu-back{display:flex;align-items:center;gap:5px;opacity:.70;transition:opacity .15s;white-space:nowrap;}',
    '#dpu-nav .dpu-back:hover{opacity:1;}',
    '#dpu-nav .dpu-sep{opacity:.25;font-size:18px;line-height:1;}',
    '#dpu-nav .dpu-mark{width:26px;height:26px;background:#2e8cff;border-radius:6px;',
      'display:flex;align-items:center;justify-content:center;',
      'font-weight:800;font-size:11px;letter-spacing:-.5px;flex-shrink:0;}',
    '#dpu-nav .dpu-name{font-weight:600;letter-spacing:-.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#dpu-nav .dpu-user{margin-left:auto;font-size:12px;opacity:.60;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;}',
    '#dpu-nav-sp{height:48px;}'
  ].join('');
  document.head.appendChild(css);

  // ── Render ────────────────────────────────────────────────────────────────
  var bar = document.createElement('div');
  bar.id = 'dpu-nav';
  bar.innerHTML =
    '<a href="' + hubUrl + '" class="dpu-back">&#8592; Hub</a>' +
    '<span class="dpu-sep">|</span>' +
    '<div class="dpu-mark">DE</div>' +
    '<span class="dpu-name">' + toolName + '</span>' +
    (userEmail ? '<span class="dpu-user">' + userEmail + '</span>' : '');

  var sp = document.createElement('div');
  sp.id = 'dpu-nav-sp';

  document.body.insertBefore(sp, document.body.firstChild);
  document.body.insertBefore(bar, document.body.firstChild);
})();
