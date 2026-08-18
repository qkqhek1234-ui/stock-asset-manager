/**
 * Vercel Serverless Function: /api/sync
 * Multi-Device Sync Key Storage
 * Uses Vercel KV / Upstash Redis for high-speed, private, 100% reliable cloud storage.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Read Vercel KV / Upstash credentials from environment
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. GET: Fetch data by sync key
  if (req.method === 'GET') {
    const key = (req.query.key || req.headers['x-sync-key'] || '').trim().toUpperCase();
    if (!key) {
      return res.status(400).json({ error: '동기화 키가 필요합니다.' });
    }

    if (!kvUrl || !kvToken) {
      // Guide user to connect Vercel KV in dashboard
      return res.status(503).json({
        error: 'Vercel KV 스토리지가 연결되지 않았습니다. Vercel 대시보드의 [Storage] 탭에서 무료 KV 데이터베이스를 프로젝트에 연결해주세요.'
      });
    }

    try {
      const fetchUrl = `${kvUrl.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`;
      const response = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bearer ${kvToken}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: '클라우드 데이터를 불러오는데 실패했습니다.' });
      }

      const result = await response.json();
      if (!result || result.result === null || result.result === undefined) {
        return res.status(404).json({ error: '해당 키에 저장된 백업 데이터가 없습니다.' });
      }

      let payload = result.result;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) {}
      }

      return res.status(200).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // 2. POST: Save data by sync key
  if (req.method === 'POST') {
    const { key, payload } = req.body || {};
    const cleanKey = (key || '').trim().toUpperCase();

    if (!cleanKey) {
      return res.status(400).json({ error: '동기화 키가 필요합니다.' });
    }
    if (!payload) {
      return res.status(400).json({ error: '저장할 데이터가 없습니다.' });
    }

    if (!kvUrl || !kvToken) {
      return res.status(503).json({
        error: 'Vercel KV 스토리지가 연결되지 않았습니다. Vercel 대시보드의 [Storage] 탭에서 무료 KV 데이터베이스를 프로젝트에 연결해주세요.'
      });
    }

    try {
      const dataToSave = JSON.stringify({
        ...payload,
        updatedAt: new Date().toISOString()
      });

      const setUrl = `${kvUrl.replace(/\/$/, '')}/set/${encodeURIComponent(cleanKey)}`;
      const response = await fetch(setUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json'
        },
        body: dataToSave
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: '클라우드 저장에 실패했습니다.' });
      }

      return res.status(200).json({ success: true, key: cleanKey, savedAt: new Date().toISOString() });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
