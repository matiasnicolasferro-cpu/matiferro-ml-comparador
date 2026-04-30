export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const APP_ID = process.env.ML_APP_ID;
  const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

  if (!APP_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Missing env vars', APP_ID: !!APP_ID, CLIENT_SECRET: !!CLIENT_SECRET });
  }

  try {
    const body = req.body;
    const query = typeof body === 'string' ? JSON.parse(body).query : body?.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    // Step 1: get token
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: `grant_type=client_credentials&client_id=${APP_ID}&client_secret=${CLIENT_SECRET}`,
    });

    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
      return res.status(500).json({ step: 'token', status: tokenRes.status, body: tokenText });
    }

    const token = JSON.parse(tokenText).access_token;

    // Step 2: search
    const searchUrl = `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=20`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const searchText = await searchRes.text();
    if (!searchRes.ok) {
      return res.status(500).json({ step: 'search', status: searchRes.status, body: searchText, token_preview: token.substring(0, 20) });
    }

    return res.status(200).json(JSON.parse(searchText));

  } catch (err) {
    return res.status(500).json({ step: 'exception', error: err.message, stack: err.stack });
  }
}
