// Netlify Function: admin-users
// Proxy pro Netlify Identity admin API — přístupné jen pro ALLOWED_EMAIL

const ALLOWED_EMAIL = 'hridel@dpuenergy.cz';
const IDENTITY_URL  = 'https://dpuhub.netlify.app/.netlify/identity';

const CORS = {
  'Access-Control-Allow-Origin':  'https://dpuhub.netlify.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  // Ověř přihlášení a email
  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return json(401, { error: 'Chybí token' });

  const email = await verifyToken(token);
  if (!email) return json(401, { error: 'Neplatný token' });
  if (email !== ALLOWED_EMAIL) return json(403, { error: 'Přístup odepřen' });

  // Použij service token z Netlify context (automaticky dostupný pro auth requesty)
  const identity = context && context.clientContext && context.clientContext.identity;
  console.log('Identity context:', identity ? 'dostupný, url=' + identity.url : 'nedostupný');
  if (!identity || !identity.token) {
    return json(500, { error: 'Netlify identity context není dostupný. Ujistěte se, že request obsahuje Authorization header.' });
  }

  const serviceUrl = identity.url;
  const adminHeaders = {
    'Authorization': 'Bearer ' + identity.token,
    'Content-Type': 'application/json',
  };

  // GET — seznam uživatelů, nebo jeden uživatel (?userId=...)
  if (event.httpMethod === 'GET') {
    const userId = (event.queryStringParameters || {}).userId;
    const url = userId
      ? serviceUrl + '/admin/users/' + userId
      : serviceUrl + '/admin/users?per_page=100';
    const res = await fetch(url, { headers: adminHeaders });
    const text = await res.text();
    console.log('GET admin/users' + (userId ? '/' + userId : ''), res.status, text.slice(0, 300));
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    return json(res.status, data);
  }

  // POST — pozvat uživatele
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    if (!body.email) return json(400, { error: 'Chybí email' });
    const res = await fetch(serviceUrl + '/admin/users', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ email: body.email, send_invite: true }),
    });
    const text = await res.text();
    console.log('POST admin/users:', res.status, text.slice(0, 300));
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    return json(res.status, data);
  }

  // PUT — aktualizovat uživatele (potvrdit email, nastavit heslo)
  if (event.httpMethod === 'PUT') {
    const userId = (event.queryStringParameters || {}).userId;
    if (!userId) return json(400, { error: 'Chybí userId' });
    const body = JSON.parse(event.body || '{}');
    const res = await fetch(serviceUrl + '/admin/users/' + userId, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('PUT admin/users/' + userId + ':', res.status, text.slice(0, 300));
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    return json(res.status, data);
  }

  // DELETE — smazat uživatele
  if (event.httpMethod === 'DELETE') {
    const userId = (event.queryStringParameters || {}).userId;
    if (!userId) return json(400, { error: 'Chybí userId' });
    const res = await fetch(serviceUrl + '/admin/users/' + userId, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    const text = await res.text();
    console.log('DELETE admin/users/' + userId + ':', res.status, text.slice(0, 200));
    if (res.status === 200 || res.status === 204) return json(200, { ok: true });
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    return json(res.status, data);
  }

  return json(405, { error: 'Nepodporovaná metoda' });
}
