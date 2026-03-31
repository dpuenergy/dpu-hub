// Netlify function: stáhne hodinové teploty pro ČHMÚ stanici z Open-Meteo historical API
// Parametry: lat, lon, year

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS };

  const { lat, lon, year, name } = event.queryStringParameters || {};
  if (!lat || !lon || !year) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: 'lat, lon a year jsou povinné parametry' }),
    };
  }

  const yr = parseInt(year);
  if (isNaN(yr) || yr < 1950 || yr > new Date().getFullYear()) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: `Neplatný rok: ${year}` }),
    };
  }

  try {
    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${lat}&longitude=${lon}` +
      `&start_date=${yr}-01-01&end_date=${yr}-12-31` +
      `&hourly=temperature_2m&timezone=UTC`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();

    const temps = (data.hourly?.temperature_2m || []).map(v => v ?? null);
    const valid = temps.filter(v => v !== null);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        temps_c: temps,
        count: valid.length,
        t_min: valid.length ? Math.min(...valid).toFixed(1) : null,
        t_max: valid.length ? Math.max(...valid).toFixed(1) : null,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
