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

  const apiBase = `https://api.netlify.com/api/v1/sites/${SITE_ID}/identity`;
  const netlifyHeaders = {
    'Authorization': 'Bearer ' + NETLIFY_TOKEN,
    'Content-Type': 'application/json',
  };

  // GET — seznam uživatelů
  if (event.httpMethod === 'GET') {
    const res = await fetch(apiBase + '/users?per_page=100', { headers: netlifyHeaders });
    const data = await res.json();
    return json(res.status, data);
  }

  // POST — pozvat uživatele
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.email) return json(400, { error: 'Chybí email' });
    const res = await fetch(apiBase + '/users', {
      method: 'POST',
      headers: netlifyHeaders,
      body: JSON.stringify({ email: body.email, send_invite: true }),
    });
    const data = await res.json();
    return json(res.status, data);
  }

  return json(405, { error: 'Nepodporovaná metoda' });
}
