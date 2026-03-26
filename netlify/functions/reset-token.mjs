// Netlify Function: reset-token
// Generuje podepsaný reset odkaz (admin) a zpracovává změnu hesla (uživatel bez auth)

import { createHmac } from 'crypto';

const ALLOWED_EMAIL = 'hridel@dpuenergy.cz';
const IDENTITY_URL  = 'https://dpuhub.netlify.app/.netlify/identity';
const SITE_URL      = 'https://dpuhub.netlify.app';
const TOKEN_TTL     = 24 * 60 * 60 * 1000; // 24 hodin

const CORS = {
  'Access-Control-Allow-Origin':  SITE_URL,
  'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Content-Type': 'application/json',
};

function json(status, body) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

function sign(data) {
  return createHmac('sha256', process.env.NETLIFY_ACCESS_TOKEN).update(data).digest('hex');
}

async function verifyAdminToken(token) {
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

  // POST — admin vygeneruje reset token pro daného uživatele
  if (event.httpMethod === 'POST') {
    const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return json(401, { error: 'Chybí token' });

    const email = await verifyAdminToken(token);
    if (!email) return json(401, { error: 'Neplatný token' });
    if (email !== ALLOWED_EMAIL) return json(403, { error: 'Přístup odepřen' });

    const body = JSON.parse(event.body || '{}');
    if (!body.userId) return json(400, { error: 'Chybí userId' });

    const expiry = Date.now() + TOKEN_TTL;
    const payload = body.userId + ':' + expiry;
    const sig = sign(payload);
    const resetToken = Buffer.from(payload + ':' + sig).toString('base64url');
    const url = SITE_URL + '/#reset_token=' + resetToken;

    return json(200, { url });
  }

  // PUT — uživatel nastaví nové heslo pomocí reset tokenu
  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body || '{}');
    if (!body.token || !body.password) return json(400, { error: 'Chybí token nebo heslo' });

    let decoded;
    try {
      decoded = Buffer.from(body.token, 'base64url').toString('utf8');
    } catch {
      return json(400, { error: 'Neplatný token' });
    }

    // Format: userId:expiry:hmac_signature
    const lastColon = decoded.lastIndexOf(':');
    const secondLastColon = decoded.lastIndexOf(':', lastColon - 1);
    if (lastColon < 0 || secondLastColon < 0) return json(400, { error: 'Neplatný token' });

    const sig    = decoded.slice(lastColon + 1);
    const expiry = decoded.slice(secondLastColon + 1, lastColon);
    const userId = decoded.slice(0, secondLastColon);

    // Ověř HMAC podpis
    const payload = userId + ':' + expiry;
    if (sign(payload) !== sig) return json(401, { error: 'Neplatný token' });

    // Ověř expiraci
    if (Date.now() > parseInt(expiry)) return json(401, { error: 'Token vypršel (platnost 24 hodin)' });

    // Nastav heslo přes Netlify API
    const siteId      = process.env.NETLIFY_SITE_ID;
    const accessToken = process.env.NETLIFY_ACCESS_TOKEN;
    if (!siteId || !accessToken) return json(500, { error: 'Chybí konfigurace serveru' });

    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/identity/users/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: body.password, confirm: true }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Netlify API error:', res.status, text.slice(0, 300));
      return json(res.status, { error: 'Chyba při nastavení hesla (' + res.status + ')' });
    }

    return json(200, { ok: true });
  }

  return json(405, { error: 'Nepodporovaná metoda' });
}
