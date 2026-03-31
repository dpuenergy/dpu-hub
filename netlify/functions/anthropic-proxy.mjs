// Netlify Function: anthropic-proxy
// Proxuje požadavky na Anthropic API — API klíč je uložen v env proměnné ANTHROPIC_API_KEY

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(status, body) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Health check (GET) — vrátí stav konfigurace
  if (event.httpMethod === 'GET') {
    if (!apiKey) return json(503, { status: 'error', message: 'ANTHROPIC_API_KEY není nastavena v Netlify env' });
    return json(200, { status: 'ok' });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!apiKey) {
    return json(503, { error: 'ANTHROPIC_API_KEY není nastavena v Netlify prostředí' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Neplatné JSON tělo požadavku' });
  }

  try {
    const resp = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    return { statusCode: resp.status, headers: CORS, body: JSON.stringify(data) };
  } catch (err) {
    return json(502, { error: 'Chyba při volání Anthropic API: ' + err.message });
  }
}
