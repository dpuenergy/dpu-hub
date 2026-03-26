// Netlify Function: reset-token
// Žádné importy — stejná struktura jako admin-users.mjs

const ALLOWED_EMAIL = 'hridel@dpuenergy.cz';
const IDENTITY_URL  = 'https://dpuhub.netlify.app/.netlify/identity';
const SITE_URL      = 'https://dpuhub.netlify.app';
const TOKEN_TTL     = 24 * 60 * 60 * 1000;

const CORS = {
  'Access-Control-Allow-Origin':  SITE_URL,
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json',
};

function json(status, body) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

async function hmacHex(secret, data) {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const buf = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toB64url(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

async function verifyAdminToken(token) {
  try {
    const res = await fetch(IDENTITY_URL + '/user', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) return null;
    const d = await res.json();
    return d.email || null;
  } catch { return null; }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  // POST — admin vygeneruje reset odkaz
  if (event.httpMethod === 'POST') {
    const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return json(401, { error: 'Chybí token' });
    const email = await verifyAdminToken(token);
    if (!email) return json(401, { error: 'Neplatný token' });
    if (email !== ALLOWED_EMAIL) return json(403, { error: 'Přístup odepřen' });

    const body = JSON.parse(event.body || '{}');
    if (!body.userId) return json(400, { error: 'Chybí userId' });

    const secret  = process.env.NETLIFY_ACCESS_TOKEN;
    const expiry  = Date.now() + TOKEN_TTL;
    const payload = body.userId + ':' + expiry;
    const sig     = await hmacHex(secret, payload);
    const url     = SITE_URL + '/#reset_token=' + toB64url(payload + ':' + sig);
    return json(200, { url });
  }

  // PUT — uživatel nastaví nové heslo
  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body || '{}');
    if (!body.token || !body.password) return json(400, { error: 'Chybí token nebo heslo' });

    let decoded;
    try { decoded = fromB64url(body.token); } catch { return json(400, { error: 'Neplatný token' }); }

    const last2  = decoded.lastIndexOf(':');
    const last1  = decoded.lastIndexOf(':', last2 - 1);
    if (last1 < 0) return json(400, { error: 'Neplatný token' });

    const sig    = decoded.slice(last2 + 1);
    const expiry = decoded.slice(last1 + 1, last2);
    const userId = decoded.slice(0, last1);

    const secret = process.env.NETLIFY_ACCESS_TOKEN;
    if ((await hmacHex(secret, userId + ':' + expiry)) !== sig) return json(401, { error: 'Neplatný token' });
    if (Date.now() > parseInt(expiry)) return json(401, { error: 'Token vypršel' });

    const siteId = process.env.NETLIFY_SITE_ID;
    if (!siteId || !secret) return json(500, { error: 'Chybí konfigurace serveru' });

    const res = await fetch(
      'https://api.netlify.com/api/v1/sites/' + siteId + '/identity/users/' + userId,
      {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: body.password, confirm: true }),
      }
    );
    if (!res.ok) {
      const t = await res.text();
      console.error('Netlify API:', res.status, t.slice(0, 200));
      return json(res.status, { error: 'Chyba při nastavení hesla (' + res.status + ')' });
    }
    return json(200, { ok: true });
  }

  return json(405, { error: 'Nepodporovaná metoda' });
}
