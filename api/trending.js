// Vercel Serverless Function: Get trending clicked movies via Appwrite REST
// Env vars (configure in Vercel project settings - NOT exposed to client):
// APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
// APPWRITE_PROJECT_ID=xxxx
// APPWRITE_API_KEY=xxxx (server API key)
// APPWRITE_DATABASE_ID=xxxx
// APPWRITE_CLICKS_COLLECTION_ID=movie_clicks

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const {
      APPWRITE_ENDPOINT,
      APPWRITE_PROJECT_ID,
      APPWRITE_API_KEY,
      APPWRITE_DATABASE_ID,
      APPWRITE_CLICKS_COLLECTION_ID
    } = process.env;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const url = new URL(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}/collections/${APPWRITE_CLICKS_COLLECTION_ID}/documents`);
    // queries[]= JSON strings
    url.searchParams.append('queries[]', JSON.stringify({ method: 'orderDesc', attribute: 'count' }));
    url.searchParams.append('queries[]', JSON.stringify({ method: 'limit', values: [5] }));

    const fetchRes = await fetch(url.toString(), {
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!fetchRes.ok) {
      const text = await fetchRes.text();
      return res.status(fetchRes.status).json({ error: 'Appwrite error', details: text });
    }

    const data = await fetchRes.json();
    return res.status(200).json(data.documents || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
