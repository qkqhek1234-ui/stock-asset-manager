/**
 * Stock Asset Manager - Stock Service
 * Live Quote & Exchange Rate Fetcher (US + KR Stocks + USD/KRW)
 * Multi-layer fallback: CORS Proxy -> Local Proxy -> Stored/Manual Quotes
 */

export const StockService = {
  // Built-in fallback database for instant offline/initial previews
  defaultQuotes: {
    '005930': { name: '삼성전자', market: 'KR', currency: 'KRW', price: 78500, changePercent: 1.16 },
    '000660': { name: 'SK하이닉스', market: 'KR', currency: 'KRW', price: 186000, changePercent: -0.53 },
    '035420': { name: 'NAVER', market: 'KR', currency: 'KRW', price: 172000, changePercent: 0.88 },
    'AAPL': { name: 'Apple Inc.', market: 'US', currency: 'USD', price: 224.50, changePercent: 1.42 },
    'TSLA': { name: 'Tesla, Inc.', market: 'US', currency: 'USD', price: 218.80, changePercent: -1.25 },
    'NVDA': { name: 'NVIDIA Corp.', market: 'US', currency: 'USD', price: 128.90, changePercent: 2.75 },
    'QQQ': { name: 'Invesco QQQ Trust', market: 'US', currency: 'USD', price: 482.30, changePercent: 0.65 },
    'VOO': { name: 'Vanguard S&P 500 ETF', market: 'US', currency: 'USD', price: 508.20, changePercent: 0.40 }
  },

  // Popular Korean & US stocks for instant 1ms local search
  popularStocks: [
    { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'US', currency: 'USD', nameKo: '엔비디아' },
    { symbol: 'AAPL', name: 'Apple Inc.', market: 'US', currency: 'USD', nameKo: '애플' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US', currency: 'USD', nameKo: '마이크로소프트' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'US', currency: 'USD', nameKo: '아마존' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', market: 'US', currency: 'USD', nameKo: '구글 알파벳' },
    { symbol: 'META', name: 'Meta Platforms Inc.', market: 'US', currency: 'USD', nameKo: '메타 페이스북' },
    { symbol: 'TSLA', name: 'Tesla Inc.', market: 'US', currency: 'USD', nameKo: '테슬라' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', market: 'US', currency: 'USD', nameKo: '브로드컴' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', market: 'US', currency: 'USD', nameKo: 'AMD 에이엠디' },
    { symbol: 'PLTR', name: 'Palantir Technologies', market: 'US', currency: 'USD', nameKo: '팔란티어' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust (나스닥100)', market: 'US', currency: 'USD', nameKo: 'QQQ 큐큐큐' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', market: 'US', currency: 'USD', nameKo: 'SPY 스파이' },
    { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', market: 'US', currency: 'USD', nameKo: 'SCHD 슈드 배당' },
    { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ (3X)', market: 'US', currency: 'USD', nameKo: 'TQQQ 티큐' },
    { symbol: 'SOXX', name: 'iShares Semiconductor ETF', market: 'US', currency: 'USD', nameKo: 'SOXX 반도체' },
    { symbol: 'NFLX', name: 'Netflix Inc.', market: 'US', currency: 'USD', nameKo: '넷플릭스' },
    { symbol: 'COIN', name: 'Coinbase Global Inc.', market: 'US', currency: 'USD', nameKo: '코인베이스' },
    { symbol: 'ARM', name: 'Arm Holdings plc', market: 'US', currency: 'USD', nameKo: 'ARM 암' },
    { symbol: '005930', name: '삼성전자', market: 'KR', currency: 'KRW', nameKo: '삼성전자 삼전' },
    { symbol: '000660', name: 'SK하이닉스', market: 'KR', currency: 'KRW', nameKo: 'SK하이닉스 하이닉스' },
    { symbol: '373220', name: 'LG에너지솔루션', market: 'KR', currency: 'KRW', nameKo: 'LG에너지솔루션 엔솔' },
    { symbol: '207940', name: '삼성바이오로직스', market: 'KR', currency: 'KRW', nameKo: '삼성바이오로직스 삼바' },
    { symbol: '005380', name: '현대차', market: 'KR', currency: 'KRW', nameKo: '현대자동차 현대차' },
    { symbol: '000270', name: '기아', market: 'KR', currency: 'KRW', nameKo: '기아 기아차' },
    { symbol: '068270', name: '셀트리온', market: 'KR', currency: 'KRW', nameKo: '셀트리온' },
    { symbol: '105560', name: 'KB금융', market: 'KR', currency: 'KRW', nameKo: 'KB금융 국민은행' },
    { symbol: '035420', name: 'NAVER', market: 'KR', currency: 'KRW', nameKo: '네이버 NAVER' },
    { symbol: '035720', name: '카카오', market: 'KR', currency: 'KRW', nameKo: '카카오 Kakao' },
    { symbol: '055550', name: '신한지주', market: 'KR', currency: 'KRW', nameKo: '신한지주 신한은행' },
    { symbol: '051910', name: 'LG화학', market: 'KR', currency: 'KRW', nameKo: 'LG화학' },
    { symbol: '006400', name: '삼성SDI', market: 'KR', currency: 'KRW', nameKo: '삼성SDI SDI' },
    { symbol: '247540', name: '에코프로비엠', market: 'KR', currency: 'KRW', nameKo: '에코프로비엠' },
    { symbol: '086520', name: '에코프로', market: 'KR', currency: 'KRW', nameKo: '에코프로' },
    { symbol: '196170', name: '알테오젠', market: 'KR', currency: 'KRW', nameKo: '알테오젠' },
    { symbol: '005490', name: 'POSCO홀딩스', market: 'KR', currency: 'KRW', nameKo: '포스코 POSCO' },
    { symbol: '012330', name: '현대모비스', market: 'KR', currency: 'KRW', nameKo: '현대모비스' }
  ],

  /**
   * Real-time Stock Search (Local dict + Yahoo finance)
   */
  async searchStocks(keyword) {
    if (!keyword || !keyword.trim()) return [];
    const q = keyword.trim().toLowerCase();

    // 1. Instant local filter
    const localMatches = this.popularStocks.filter((s) => {
      return s.symbol.toLowerCase().includes(q) ||
             s.name.toLowerCase().includes(q) ||
             (s.nameKo && s.nameKo.toLowerCase().includes(q));
    });

    // 2. Fetch from backend /api/search
    let remoteMatches = [];
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(keyword.trim())}`);
        if (res.ok) {
          remoteMatches = await res.json();
        }
      } catch (e) {}
    }

    // Merge and deduplicate
    const seen = new Set();
    const combined = [];

    localMatches.forEach((item) => {
      seen.add(item.symbol.toUpperCase());
      combined.push(item);
    });

    remoteMatches.forEach((item) => {
      const sym = item.symbol.toUpperCase();
      if (!seen.has(sym)) {
        seen.add(sym);
        combined.push(item);
      }
    });

    return combined.slice(0, 8);
  },
  formatYahooTicker(ticker, market = 'US') {
    const cleanTicker = ticker.trim().toUpperCase();
    if (market === 'KR' || /^[0-9]{6}$/.test(cleanTicker)) {
      if (!cleanTicker.includes('.')) {
        return `${cleanTicker}.KS`; // Default to KOSPI, can also match .KQ
      }
    }
    return cleanTicker;
  },

  /**
   * Fetch USD/KRW Exchange Rate
   */
  async fetchExchangeRate() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const localRes = await fetch('/api/exchange-rate');
        if (localRes.ok) {
          const data = await localRes.json();
          if (data && data.rate) return data.rate;
        }
      } catch (e) {
        // Fallback to web proxy
      }
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const meta = data.chart?.result?.[0]?.meta;
        const rate = meta?.regularMarketPrice || meta?.chartPreviousClose;
        if (rate && rate > 500 && rate < 3000) {
          return Math.round(rate * 100) / 100;
        }
      }
    } catch (e) {
      console.warn('Live exchange rate fetch failed, using fallback/stored rate.', e);
    }
    return 1380; // Safe baseline fallback
  },

  /**
   * Fetch quote for a single ticker
   */
  async fetchQuote(ticker, market = 'US') {
    const cleanTicker = ticker.trim().toUpperCase();
    const yahooSymbol = this.formatYahooTicker(cleanTicker, market);

    // 1. Try local proxy if running on local server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const localRes = await fetch(`/api/quote?ticker=${encodeURIComponent(cleanTicker)}`);
        if (localRes.ok) {
          const data = await localRes.json();
          if (data && data.price) {
            return {
              ticker: cleanTicker,
              price: data.price,
              changePercent: data.changePercent || 0,
              currency: data.currency || (market === 'KR' ? 'KRW' : 'USD'),
              lastUpdated: new Date().toISOString()
            };
          }
        }
      } catch (e) {
        // Fallback to web proxy
      }
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const result = data.chart?.result?.[0];
        if (result) {
          const meta = result.meta;
          const currentPrice = meta.regularMarketPrice || meta.chartPreviousClose;
          const prevClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
          const changePercent = prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
          const currency = meta.currency === 'KRW' ? 'KRW' : 'USD';

          return {
            ticker: cleanTicker,
            price: currentPrice,
            changePercent,
            currency,
            lastUpdated: new Date().toISOString()
          };
        }
      }
    } catch (err) {
      console.warn(`Quote fetch failed for ${cleanTicker}:`, err);
    }

    // Fallback to default quote or keep last known price
    const fallback = this.defaultQuotes[cleanTicker];
    if (fallback) {
      return {
        ticker: cleanTicker,
        price: fallback.price,
        changePercent: fallback.changePercent,
        currency: fallback.currency,
        lastUpdated: new Date().toISOString()
      };
    }

    return null;
  },

  /**
   * Batch refresh prices for all tickers
   */
  async refreshAllQuotes(tickers = []) {
    const results = {};
    const promises = tickers.map(async (item) => {
      const ticker = typeof item === 'string' ? item : item.ticker;
      const market = typeof item === 'object' ? item.market : 'US';
      const quote = await this.fetchQuote(ticker, market);
      if (quote) {
        results[ticker.toUpperCase()] = quote;
      }
    });

    await Promise.allSettled(promises);
    return results;
  }
};
