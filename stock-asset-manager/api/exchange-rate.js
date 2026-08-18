export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(200).json({ rate: 1380.0 });
    }

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta || {};
    const rate = meta.regularMarketPrice || meta.chartPreviousClose || 1380.0;

    return res.status(200).json({ rate: Math.round(rate * 100) / 100 });
  } catch (error) {
    return res.status(200).json({ rate: 1380.0 });
  }
}
