const AIRTABLE_TOKEN = 'jouw_token_hier';
const BASE_ID = 'appDtb4Fe6IW3EZDx';
const TABLE = 'Gyms';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function geocode(adres) {
  const url = 'https://nominatim.openstreetmap.org/search?q='
    + encodeURIComponent(adres) + '&format=json&limit=1';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Gymfinder/1.0', 'Accept-Language': 'nl' }
  });
  const data = await res.json();
  if (data && data[0]) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

async function getAllRecords() {
  let records = [];
  let offset = null;

  do {
    let url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE}?fields[]=Adres&fields[]=Lat&fields[]=Lng`;
    if (offset) url += `&offset=${offset}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const data = await res.json();

    records = records.concat(data.records || []);
    offset = data.offset || null;

    if (offset) {
      console.log(`${records.length} records geladen, volgende pagina ophalen...`);
      await sleep(200);
    }
  } while (offset);

  return records;
}

async function run() {
  const records = await getAllRecords();
  console.log(`Totaal ${records.length} gyms gevonden`);

  let gedaan = 0;
  let overgeslagen = 0;
  let nietGevonden = 0;

  for (const record of records) {
    const adres = record.fields['Adres'];
    const hasCoords = record.fields['Lat'] && record.fields['Lng'];

    if (!adres || hasCoords) {
      overgeslagen++;
      continue;
    }

    const coords = await geocode(adres);
    if (!coords) {
      console.log(`❌ Niet gevonden: ${adres}`);
      nietGevonden++;
      await sleep(1000);
      continue;
    }

    const updateRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}/${record.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: { Lat: coords.lat, Lng: coords.lng } })
    });
    const updateData = await updateRes.json();

    if (updateData.error) {
      console.log(`⚠️ Fout bij ${adres}: ${updateData.error.message}`);
    } else {
      console.log(`✅ ${adres} → ${coords.lat}, ${coords.lng}`);
      gedaan++;
    }

    await sleep(1100);
  }

  console.log(`\nKlaar! ✅ ${gedaan} geocodet | ⏭ ${overgeslagen} overgeslagen | ❌ ${nietGevonden} niet gevonden`);
}

run();