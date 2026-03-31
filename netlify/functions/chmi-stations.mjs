// Netlify function: vrátí seznam aktivních ČHMÚ meteorologických stanic
// Zdroj: opendata.chmi.cz/meteorology/climate/historical_csv/metadata/meta1.csv
// Formát: WSI,GH_ID,BEGIN_DATE,END_DATE,FULL_NAME,GEOGR1(lon),GEOGR2(lat),ELEVATION

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: HEADERS };

  try {
    const res = await fetch(
      'https://opendata.chmi.cz/meteorology/climate/historical_csv/metadata/meta1.csv'
    );
    if (!res.ok) throw new Error(`ČHMÚ metadata HTTP ${res.status}`);

    const text = await res.text();
    const lines = text.split('\n');
    const today = new Date().toISOString();
    const seen = new Set();
    const stations = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 7) continue;
      const wsi  = parts[0]?.trim();
      const end  = parts[3]?.trim();
      const name = parts[4]?.trim();
      const lon  = parseFloat(parts[5]);
      const lat  = parseFloat(parts[6]);

      if (!wsi || !name || isNaN(lat) || isNaN(lon)) continue;
      if (end && end < today) continue; // inactive period
      if (seen.has(wsi)) continue;
      seen.add(wsi);
      stations.push({ wsi, name, lat: +lat.toFixed(5), lon: +lon.toFixed(5) });
    }

    stations.sort((a, b) => a.name.localeCompare(b.name, 'cs'));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ stations }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
