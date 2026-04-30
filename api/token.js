export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const APP_ID = process.env.ML_APP_ID;
  const CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
  let userToken = process.env.ML_USER_TOKEN;
  const refreshToken = process.env.ML_REFRESH_TOKEN;

  try {
    const body = req.body;
    const query = typeof body === 'string' ? JSON.parse(body).query : body?.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    // Try search with current user token
    let searchRes = await fetch(
      `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=20`,
      { headers: { 'Authorization': `Bearer ${userToken}` } }
    );

    // If token expired, refresh it
    if (searchRes.status === 401 && refreshToken) {
      const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&client_id=${APP_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${refreshToken}`,
      });
      const refreshData = await refreshRes.json();
      if (!refreshRes.ok) return res.status(500).json({ step: 'refresh', error: refreshData });
      userToken = refreshData.access_token;

      // Retry search with new token
      searchRes = await fetch(
        `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=20`,
        { headers: { 'Authorization': `Bearer ${userToken}` } }
      );
    }

    const searchText = await searchRes.text();
    if (!searchRes.ok) {
      return res.status(500).json({ step: 'search', status: searchRes.status, body: searchText });
    }

    return res.status(200).json(JSON.parse(searchText));

  } catch (err) {
    return res.status(500).json({ step: 'exception', error: err.message });
  }
}
