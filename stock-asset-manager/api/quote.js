export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { ticker } = req.query;
  if (!ticker) {
    return res.status(400).json({ error: 'Missing ticker parameter' });
  }

  try {
    let symbol = ticker.trim().toUpperCase();
    if (/^\d{6}$/.test(symbol)) {
      symbol = `${symbol}.KS`;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch quote from Yahoo Finance' });
    }

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta || {};
    const currentPrice = meta.regularMarketPrice || meta.chartPreviousClose || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || 0;

    let changePercent = 0;
    if (prevClose > 0 && currentPrice) {
      changePercent = Math.round(((currentPrice - prevClose) / prevClose) * 10000) / 100;
    }

    return res.status(200).json({
      ticker: ticker.toUpperCase(),
      price: currentPrice,
      changePercent,
      previousClose: prevClose,
      currency: meta.currency || 'USD'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
