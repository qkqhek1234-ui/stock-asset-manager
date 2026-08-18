/**
 * Vercel Serverless API: /api/sync
 * Multi-Device Sync Key Storage (Zero-Config for User)
 * Supports GET (fetch data) and POST (save data)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Handle GET: Fetch data by sync key
  if (req.method === 'GET') {
    const key = (req.query.key || req.headers['x-sync-key'] || '').trim().toUpperCase();
    if (!key) {
      return res.status(400).json({ error: 'Sync Key is required' });
    }

    try {
      // Fetch from KV / Cloud Storage endpoint
      const remoteUrl = `https://kvdb.io/4yKqP3kU7x5E9Z8mY2A1wN/${encodeURIComponent(key)}`;
      const response = await fetch(remoteUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.status === 404) {
        return res.status(404).json({ error: '해당 동기화 키에 저장된 데이터가 없습니다.' });
      }

      if (!response.ok) {
        return res.status(500).json({ error: '클라우드 데이터를 불러오는데 실패했습니다.' });
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // 2. Handle POST: Save data by sync key
  if (req.method === 'POST') {
    const { key, payload } = req.body || {};
    const cleanKey = (key || '').trim().toUpperCase();

    if (!cleanKey) {
      return res.status(400).json({ error: 'Sync Key is required' });
    }

    if (!payload) {
      return res.status(400).json({ error: 'Payload data is required' });
    }

    try {
      const remoteUrl = `https://kvdb.io/4yKqP3kU7x5E9Z8mY2A1wN/${encodeURIComponent(cleanKey)}`;
      const response = await fetch(remoteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        // Fallback with PUT
        const putRes = await fetch(remoteUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, updatedAt: new Date().toISOString() })
        });
        if (!putRes.ok) {
          return res.status(500).json({ error: '클라우드 저장에 실패했습니다.' });
        }
      }

      return res.status(200).json({ success: true, key: cleanKey, savedAt: new Date().toISOString() });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
