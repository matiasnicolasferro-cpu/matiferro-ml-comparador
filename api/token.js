export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const APP_ID = process.env.ML_APP_ID;
  const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

  try {
    // Step 1: get token
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: `grant_type=client_credentials&client_id=${APP_ID}&client_secret=${CLIENT_SECRET}`,
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.status(tokenRes.status).json({ error: tokenData });

    const token = tokenData.access_token;

    // Step 2: if query provided, also search
    const body = req.body;
    const query = typeof body === 'string' ? JSON.parse(body).query : body?.query;

    if (!query) {
      return res.status(200).json({ access_token: token, expires_in: tokenData.expires_in });
    }

    const searchRes = await fetch(
      `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const searchData = await searchRes.json();
    if (!searchRes.ok) return res.status(searchRes.status).json({ error: searchData });

    return res.status(200).json(searchData);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
