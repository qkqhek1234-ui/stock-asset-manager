/**
 * Vercel Serverless Function: /api/cron-snapshot
 * Daily Portfolio Balance Snapshot Cron Job
 * Schedule: 0 23 * * * (08:00 AM KST / 23:00 UTC)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  const now = new Date();
  // Format KST Date: YYYY-MM-DD
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  const todayStr = kstDate.toISOString().slice(0, 10);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = dayNames[kstDate.getUTCDay()];

  try {
    // 1. Fetch latest USD/KRW exchange rate
    let exchangeRate = 1380;
    try {
      const rateRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        const r = rateData?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (r && r > 500 && r < 3000) exchangeRate = Math.round(r * 100) / 100;
      }
    } catch (e) {}

    // 2. If Vercel KV is configured, update snapshots for stored portfolios
    let updatedKeysCount = 0;
    if (kvUrl && kvToken) {
      try {
        // Query keys list if available, or update specific keys
        const keysRes = await fetch(`${kvUrl.replace(/\/$/, '')}/keys/*`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        
        let keys = [];
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          keys = Array.isArray(keysData?.result) ? keysData.result : [];
        }

        for (const key of keys) {
          try {
            const getRes = await fetch(`${kvUrl.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`, {
              headers: { Authorization: `Bearer ${kvToken}` }
            });
            if (!getRes.ok) continue;

            const getData = await getRes.json();
            let payload = getData?.result;
            if (typeof payload === 'string') {
              try { payload = JSON.parse(payload); } catch (e) {}
            }
            if (!payload || !payload.transactions) continue;

            // Compute holdings from transactions
            const transactions = payload.transactions || [];
            const holdingsMap = {};
            transactions.forEach((tx) => {
              const ticker = (tx.ticker || '').toUpperCase();
              const qty = parseFloat(tx.quantity) || 0;
              const price = parseFloat(tx.price) || 0;
              const fee = parseFloat(tx.fee) || 0;
              const currency = tx.currency || 'USD';
              const market = tx.market || (currency === 'USD' ? 'US' : 'KR');

              if (!holdingsMap[ticker]) {
                holdingsMap[ticker] = { ticker, market, currency, quantity: 0, totalInvested: 0, avgPrice: 0 };
              }
              const item = holdingsMap[ticker];
              if (tx.type === 'BUY' || tx.type === 'DEPOSIT') {
                item.quantity += qty;
                item.totalInvested += (qty * price) + fee;
                item.avgPrice = item.quantity > 0 ? item.totalInvested / item.quantity : 0;
              } else if (tx.type === 'SELL' || tx.type === 'WITHDRAW') {
                const actualQty = Math.min(qty, item.quantity);
                const actualCost = actualQty * item.avgPrice;
                item.quantity -= actualQty;
                item.totalInvested -= actualCost;
                if (item.quantity <= 0) { item.quantity = 0; item.totalInvested = 0; item.avgPrice = 0; }
              }
            });

            // Calculate total net worth
            let totalMarketValueKRW = 0;
            let totalInvestedKRW = 0;

            for (const item of Object.values(holdingsMap)) {
              if (item.quantity <= 0) continue;
              const isCash = item.market === 'CASH';
              let currentPrice = item.avgPrice;

              if (!isCash) {
                try {
                  const sym = (item.market === 'KR' || /^\d{6}$/.test(item.ticker)) ? `${item.ticker}.KS` : item.ticker;
                  const qRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                  });
                  if (qRes.ok) {
                    const qData = await qRes.json();
                    const p = qData?.chart?.result?.[0]?.meta?.regularMarketPrice;
                    if (p) currentPrice = p;
                  }
                } catch (e) {}
              } else {
                currentPrice = 1;
              }

              const rate = item.currency === 'USD' ? exchangeRate : 1;
              const mv = (item.quantity * currentPrice) * rate;
              const inv = (item.quantity * item.avgPrice) * rate;
              totalMarketValueKRW += mv;
              totalInvestedKRW += inv;
            }

            const totalMarketValueUSD = exchangeRate > 0 ? totalMarketValueKRW / exchangeRate : 0;
            const totalInvestedUSD = exchangeRate > 0 ? totalInvestedKRW / exchangeRate : 0;
            const unrealizedProfitKRW = totalMarketValueKRW - totalInvestedKRW;
            const unrealizedProfitUSD = totalMarketValueUSD - totalInvestedUSD;
            const returnRate = totalInvestedKRW > 0 ? (unrealizedProfitKRW / totalInvestedKRW) * 100 : 0;

            const history = Array.isArray(payload.balanceHistory) ? payload.balanceHistory : [];
            const prevSnapshot = history[history.length - 1] || null;
            const dailyChangeKRW = prevSnapshot ? (totalMarketValueKRW - prevSnapshot.totalMarketValueKRW) : 0;
            const dailyChangeUSD = prevSnapshot ? (totalMarketValueUSD - prevSnapshot.totalMarketValueUSD) : 0;
            const dailyChangePercent = (prevSnapshot && prevSnapshot.totalMarketValueKRW > 0)
              ? (dailyChangeKRW / prevSnapshot.totalMarketValueKRW) * 100
              : 0;

            const newSnapshot = {
              date: todayStr,
              dayOfWeek,
              timestamp: now.toISOString(),
              exchangeRate,
              totalMarketValueKRW: Math.round(totalMarketValueKRW),
              totalMarketValueUSD: Math.round(totalMarketValueUSD * 100) / 100,
              totalInvestedKRW: Math.round(totalInvestedKRW),
              totalInvestedUSD: Math.round(totalInvestedUSD * 100) / 100,
              unrealizedProfitKRW: Math.round(unrealizedProfitKRW),
              unrealizedProfitUSD: Math.round(unrealizedProfitUSD * 100) / 100,
              returnRate: Math.round(returnRate * 100) / 100,
              dailyChangeKRW: Math.round(dailyChangeKRW),
              dailyChangeUSD: Math.round(dailyChangeUSD * 100) / 100,
              dailyChangePercent: Math.round(dailyChangePercent * 100) / 100
            };

            // Update or append today's snapshot
            const existingIdx = history.findIndex(h => h.date === todayStr);
            if (existingIdx >= 0) {
              history[existingIdx] = newSnapshot;
            } else {
              history.push(newSnapshot);
            }

            payload.balanceHistory = history;
            payload.updatedAt = now.toISOString();

            // Save back to KV
            await fetch(`${kvUrl.replace(/\/$/, '')}/set/${encodeURIComponent(key)}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${kvToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            updatedKeysCount++;
          } catch (e) {
            console.error(`Failed to process cron snapshot for key: ${key}`, e);
          }
        }
      } catch (err) {
        console.error('Cron KV iteration error:', err);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Daily snapshot cron completed successfully',
      date: todayStr,
      dayOfWeek,
      exchangeRate,
      updatedKeysCount,
      timestamp: now.toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
