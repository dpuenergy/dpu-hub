// Netlify Function: admin-users
// Proxy pro Netlify Identity admin API — přístupné jen pro ALLOWED_EMAIL

const ALLOWED_EMAIL = 'hridel@dpuenergy.cz';
const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
const SITE_ID       = process.env.NETLIFY_SITE_ID;
const IDENTITY_URL  = `https://calm-cocada-79e019.netlify.app/.netlify/identity`;

const CORS = {
  'Access-Control-Allow-Origin':  'https://calm-cocada-79e019.netlify.app',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json',
};

function json(status, body) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

// Ověří JWT přes Netlify Identity /user endpoint — vrátí email nebo null
async function verifyToken(token) {
  try {
    const res = await fetch(IDENTITY_URL + '/user', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || null;
  } catch { return null; }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  // Ověř přihlášení a email
  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return json(401, { error: 'Chybí token' });

  const email = await verifyToken(token);
  if (!email) return json(401, { error: 'Neplatný token' });
  if (email !== ALLOWED_EMAIL) return json(403, { error: 'Přístup odepřen' });

  if (!NETLIFY_TOKEN || !SITE_ID) {
    return json(500, { error: 'Chybí environment proměnné NETLIFY_ACCESS_TOKEN nebo NETLIFY_SITE_ID' });
  }

  const netlifyHeaders = {
    'Authorization': 'Bearer ' + NETLIFY_TOKEN,
    'Content-Type': 'application/json',
  };

  // Získej ID identity instance
  const identityRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/identity`, { headers: netlifyHeaders });
  const identityText = await identityRes.text();
  console.log('Identity response:', identityRes.status, identityText.slice(0, 400));
  if (!identityRes.ok) return json(identityRes.status, { error: 'Identity instance error ' + identityRes.status + ': ' + identityText.slice(0, 200) });
  let identityData;
  try { identityData = JSON.parse(identityText); } catch(e) { return json(502, { error: 'Identity response not JSON: ' + identityText.slice(0, 200) }); }

  const instanceId = identityData.id;
  console.log('Instance ID:', instanceId);
  if (!instanceId) return json(502, { error: 'Identity instance ID not found in: ' + identityText.slice(0, 200) });
  const apiBase = `https://api.netlify.com/api/v1/sites/${SITE_ID}/identity/${instanceId}`;

  // GET — seznam uživatelů
  if (event.httpMethod === 'GET') {
    const url = apiBase + '/users?per_page=100';
    console.log('GET', url);
    const res = await fetch(url, { headers: netlifyHeaders });
    const text = await res.text();
    console.log('Response', res.status, text.slice(0, 300));
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    return json(res.status, data);
  }

  // POST — pozvat uživatele
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.email) return json(400, { error: 'Chybí email' });
    const url = apiBase + '/users';
    console.log('POST', url, body.email);
    const res = await fetch(url, {
      method: 'POST',
      headers: netlifyHeaders,
      body: JSON.stringify({ email: body.email, send_invite: true }),
    });
    const text = await res.text();
    console.log('Response', res.status, text.slice(0, 300));
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    return json(res.status, data);
  }

  return json(405, { error: 'Nepodporovaná metoda' });
}
