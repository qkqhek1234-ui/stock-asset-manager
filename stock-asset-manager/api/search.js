export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(200).json([]);
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q.trim())}&quotesCount=10&newsCount=0`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    const quotes = data?.quotes || [];
    const results = quotes
      .filter((item) => item.symbol)
      .map((item) => {
        const sym = item.symbol;
        const name = item.shortname || item.longname || sym;
        const exch = item.exchange || '';
        const isKR = sym.endsWith('.KS') || sym.endsWith('.KQ') || ['KSC', 'KOE', 'KRX'].includes(exch);
        const cleanSymbol = isKR ? sym.replace(/\.(KS|KQ)$/i, '') : sym;

        return {
          symbol: cleanSymbol,
          rawSymbol: sym,
          name,
          exchange: exch,
          market: isKR ? 'KR' : 'US',
          currency: isKR ? 'KRW' : 'USD',
          type: item.quoteType || 'EQUITY'
        };
      });

    return res.status(200).json(results);
  } catch (error) {
    return res.status(200).json([]);
  }
}
