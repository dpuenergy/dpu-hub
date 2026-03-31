/**
 * Netlify Scheduled Function — udržuje Streamlit apps naživu
 * Spouští se každé 3 dny (pod 7denní sleep threshold)
 * Plán: https://docs.netlify.com/functions/scheduled-functions/
 */

export const config = {
  schedule: '0 8 */3 * *',   // každé 3 dny v 8:00 UTC
};

const APPS = [
  { name: 'podklady',  url: 'https://dpuenergy-podklady.streamlit.app/?embed=true' },
  { name: 'komunita',  url: 'https://dpuenergy-komunita.streamlit.app/?embed=true' },
  { name: 'kalkulator', url: 'https://dpu-kalkulator.streamlit.app/?embed=true' },
];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'cs,en;q=0.9',
};

export async function handler() {
  const results = await Promise.all(
    APPS.map(async ({ name, url }) => {
      try {
        const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
        const status = res.status;
        const ok = status >= 200 && status < 400;
        console.log(`[streamlit-ping] ${name}: ${status} ${ok ? '✓' : '✗'}`);
        return { name, status, ok };
      } catch (err) {
        console.error(`[streamlit-ping] ${name}: ERROR — ${err.message}`);
        return { name, status: null, ok: false, error: err.message };
      }
    })
  );

  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.warn('[streamlit-ping] Neodpověděly:', failed.map(r => r.name).join(', '));
  } else {
    console.log('[streamlit-ping] Všechny apps jsou naživu.');
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ timestamp: new Date().toISOString(), results }),
  };
}
