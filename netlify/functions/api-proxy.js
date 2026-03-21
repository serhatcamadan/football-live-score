/**
 * CamoGoal — API Proxy (Netlify Function)
 *
 * API key hiçbir zaman frontend'e gitmez.
 * Tüm API-Football istekleri buradan geçer.
 * Key sadece Netlify Environment Variables'da yaşar.
 */

const BASE_URL = 'https://v3.football.api-sports.io';

// İzin verilen endpoint'ler (güvenlik için whitelist)
const ALLOWED_ENDPOINTS = [
  '/fixtures',
  '/standings',
  '/players/topscorers',
  '/fixtures/statistics',
  '/fixtures/events',
  '/fixtures/headtohead',
];

exports.handler = async (event) => {
  // Sadece GET isteği
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const endpoint = event.queryStringParameters?.endpoint;
  if (!endpoint) {
    return { statusCode: 400, body: 'Missing endpoint parameter' };
  }

  // Whitelist kontrolü
  const isAllowed = ALLOWED_ENDPOINTS.some(a => endpoint.startsWith(a));
  if (!isAllowed) {
    return { statusCode: 403, body: 'Endpoint not permitted' };
  }

  const apiKey = process.env.APISPORTS_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'API key not configured' };
  }

  try {
    // Query string'i al (endpoint dışındaki tüm parametreler)
    const params = { ...event.queryStringParameters };
    delete params.endpoint;
    const qs = new URLSearchParams(params).toString();
    const url = `${BASE_URL}${endpoint}${qs ? '?' + qs : ''}`;

    const res = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });

    const data = await res.json();

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30', // 30s cache
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Upstream API error', message: err.message }),
    };
  }
};
