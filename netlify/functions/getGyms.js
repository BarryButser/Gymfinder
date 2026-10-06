/**
 * GET /.netlify/functions/getGyms
 * Loads every record from the Airtable "Gyms" table.
 * AIRTABLE_TOKEN must be set in the Netlify environment (never in the browser).
 */

const BASE_ID = 'appDtb4Fe6IW3EZDx';
const TABLE_NAME = 'Gyms';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    },
    body: JSON.stringify(body)
  };
}

async function fetchAllRecords(token) {
  const records = [];
  let offset;

  do {
    const url = new URL(
      'https://api.airtable.com/v0/' + BASE_ID + '/' + encodeURIComponent(TABLE_NAME)
    );
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = (data && data.error && data.error.message) || 'Airtable request failed';
      const error = new Error(message);
      error.statusCode = response.status;
      throw error;
    }

    if (Array.isArray(data.records)) {
      records.push.apply(records, data.records);
    }
    offset = data.offset;
  } while (offset);

  return records;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return json(500, { error: 'AIRTABLE_TOKEN is not configured' });
  }

  try {
    const records = await fetchAllRecords(token);
    return json(200, { records: records });
  } catch (err) {
    console.error('getGyms failed:', err.message);
    const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 502;
    return json(statusCode, { error: 'Gyms konden niet geladen worden' });
  }
};
