(function () {
  var script = document.currentScript;
  var toolName = (script && script.getAttribute('data-tool')) || document.title;
  var hubUrl = (script && script.getAttribute('data-hub')) || 'https://calm-cocada-79e019.netlify.app/';

  var userEmail = '';
  try {
    // 1) Try URL param (for cross-origin tools like Vercel/HF)
    userEmail = new URLSearchParams(window.location.search).get('dpu_user') || '';
    // 2) Fall back to hub localStorage JWT
    if (!userEmail) {
      var sess = JSON.parse(localStorage.getItem('dpu_user') || 'null');
      if (sess && sess.access_token) {
        var payload = JSON.parse(atob(sess.access_token.split('.')[1]));
        userEmail = payload.email || '';
      }
    }
  } catch (e) {}

  var css = document.createElement('style');
  css.textContent = [
    '#dpu-nav{',
      'position:fixed;top:0;left:0;right:0;height:48px;',
      'background:#1b3280;color:#fff;',
      'display:flex;align-items:center;padding:0 20px;gap:10px;',
      'z-index:999999;',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;',
      'font-size:14px;',
      'box-shadow:0 2px 12px rgba(0,0,0,.28);',
    '}',
    '#dpu-nav a{color:#fff;text-decoration:none;}',
    '#dpu-nav .dpu-back{',
      'display:flex;align-items:center;gap:5px;',
      'opacity:.70;transition:opacity .15s;white-space:nowrap;',
    '}',
    '#dpu-nav .dpu-back:hover{opacity:1;}',
    '#dpu-nav .dpu-sep{opacity:.25;font-size:18px;line-height:1;}',
    '#dpu-nav .dpu-mark{',
      'width:26px;height:26px;background:#2e8cff;border-radius:6px;',
      'display:flex;align-items:center;justify-content:center;',
      'font-weight:800;font-size:11px;letter-spacing:-.5px;flex-shrink:0;',
    '}',
    '#dpu-nav .dpu-name{font-weight:600;letter-spacing:-.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#dpu-nav .dpu-user{',
      'margin-left:auto;font-size:12px;opacity:.60;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;',
    '}',
    '#dpu-nav-sp{height:48px;}'
  ].join('');
  document.head.appendChild(css);

  var userHtml = userEmail
    ? '<span class="dpu-user">' + userEmail + '</span>'
    : '';

  var bar = document.createElement('div');
  bar.id = 'dpu-nav';
  bar.innerHTML =
    '<a href="' + hubUrl + '" class="dpu-back">&#8592; Hub</a>' +
    '<span class="dpu-sep">|</span>' +
    '<div class="dpu-mark">DE</div>' +
    '<span class="dpu-name">' + toolName + '</span>' +
    userHtml;

  var sp = document.createElement('div');
  sp.id = 'dpu-nav-sp';

  var body = document.body;
  body.insertBefore(sp, body.firstChild);
  body.insertBefore(bar, body.firstChild);
})();
