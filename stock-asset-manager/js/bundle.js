/**
 * Stock Asset Manager - Standalone Production Bundle (Optimized & Clean)
 * Zero-dependency, ultra-fast financial manager for Mobile & Desktop.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. CALCULATOR SERVICE (Financial Math & Currency Engine)
  // =========================================================================
  const CalculatorService = {
    computePortfolio(transactions = [], currentPrices = {}, exchangeRate = 1380) {
      const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      const holdingsMap = {};
      const realizedPnLList = [];
      const dividendList = [];

      sortedTx.forEach((tx) => {
        const ticker = (tx.ticker || '').trim().toUpperCase();
        if (!ticker) return;

        const type = tx.type; // 'BUY', 'SELL', 'DIVIDEND'
        const qty = parseFloat(tx.quantity) || 0;
        const price = parseFloat(tx.price) || 0;
        const fee = parseFloat(tx.fee) || 0;
        const currency = tx.currency || (tx.market === 'US' ? 'USD' : 'KRW');
        const name = tx.name || ticker;
        const market = tx.market || (currency === 'USD' ? 'US' : 'KR');

        if (!holdingsMap[ticker]) {
          holdingsMap[ticker] = { ticker, name, market, currency, quantity: 0, totalInvested: 0, avgPrice: 0, totalDividends: 0 };
        }

        const item = holdingsMap[ticker];
        item.name = name || item.name;
        item.market = market;
        item.currency = currency;

        if (type === 'BUY') {
          item.quantity += qty;
          item.totalInvested += (qty * price) + fee;
          item.avgPrice = item.quantity > 0 ? item.totalInvested / item.quantity : 0;
        } else if (type === 'SELL') {
          const explicitBuyPrice = parseFloat(tx.buyPrice);
          const effectiveBuyPrice = !isNaN(explicitBuyPrice) && explicitBuyPrice > 0 
            ? explicitBuyPrice 
            : (item.avgPrice > 0 ? item.avgPrice : price);

          const sellQty = qty;
          const costBasis = sellQty * effectiveBuyPrice;
          const proceeds = (sellQty * price) - fee;
          const realizedProfit = proceeds - costBasis;
          const returnRate = costBasis > 0 ? (realizedProfit / costBasis) * 100 : 0;

          realizedPnLList.push({
            id: tx.id,
            date: tx.date,
            ticker,
            name: tx.name || item.name || ticker,
            currency,
            quantity: sellQty,
            sellPrice: price,
            avgBuyPrice: effectiveBuyPrice,
            realizedProfit,
            returnRate
          });

          if (item.quantity > 0) {
            const actualQty = Math.min(sellQty, item.quantity);
            const actualCost = actualQty * item.avgPrice;
            item.quantity -= actualQty;
            item.totalInvested -= actualCost;
            if (item.quantity <= 0) {
              item.quantity = 0;
              item.totalInvested = 0;
              item.avgPrice = 0;
            }
          }
        } else if (type === 'DIVIDEND') {
          const dividendAmount = (parseFloat(tx.amount) || (qty * price)) - fee;
          item.totalDividends += dividendAmount;
          dividendList.push({
            id: tx.id,
            date: tx.date,
            ticker,
            name: item.name,
            currency,
            amount: dividendAmount
          });
        }
      });

      const holdings = [];
      let totalInvestedKRW = 0;
      let totalMarketValueKRW = 0;
      let totalRealizedProfitKRW = 0;
      let totalDividendsKRW = 0;

      Object.values(holdingsMap).forEach((item) => {
        if (item.quantity <= 0) return;

        const priceInfo = currentPrices[item.ticker] || {};
        const currentPrice = priceInfo.price || item.avgPrice;
        const rate = item.currency === 'USD' ? exchangeRate : 1;

        const marketValue = item.quantity * currentPrice;
        const invested = item.totalInvested;
        const profit = marketValue - invested;
        const returnRate = invested > 0 ? (profit / invested) * 100 : 0;

        const marketValueKRW = marketValue * rate;
        const investedKRW = invested * rate;
        const profitKRW = profit * rate;

        totalInvestedKRW += investedKRW;
        totalMarketValueKRW += marketValueKRW;

        holdings.push({
          ...item,
          currentPrice,
          marketValue,
          profit,
          returnRate,
          marketValueKRW,
          investedKRW,
          profitKRW,
          changePercent: priceInfo.changePercent || 0
        });
      });

      realizedPnLList.forEach((r) => {
        totalRealizedProfitKRW += r.realizedProfit * (r.currency === 'USD' ? exchangeRate : 1);
      });

      dividendList.forEach((d) => {
        totalDividendsKRW += d.amount * (d.currency === 'USD' ? exchangeRate : 1);
      });

      const totalUnrealizedProfitKRW = totalMarketValueKRW - totalInvestedKRW;
      const totalReturnRate = totalInvestedKRW > 0 ? (totalUnrealizedProfitKRW / totalInvestedKRW) * 100 : 0;

      const totalMarketValueUSD = exchangeRate > 0 ? totalMarketValueKRW / exchangeRate : 0;
      const totalInvestedUSD = exchangeRate > 0 ? totalInvestedKRW / exchangeRate : 0;
      const totalUnrealizedProfitUSD = totalMarketValueUSD - totalInvestedUSD;
      const totalRealizedProfitUSD = exchangeRate > 0 ? totalRealizedProfitKRW / exchangeRate : 0;
      const totalDividendsUSD = exchangeRate > 0 ? totalDividendsKRW / exchangeRate : 0;

      holdings.forEach((h) => {
        h.weightPercent = totalMarketValueKRW > 0 ? (h.marketValueKRW / totalMarketValueKRW) * 100 : 0;
      });
      holdings.sort((a, b) => b.marketValueKRW - a.marketValueKRW);

      return {
        summary: {
          totalMarketValueKRW,
          totalInvestedKRW,
          totalUnrealizedProfitKRW,
          totalReturnRate,
          totalRealizedProfitKRW,
          totalDividendsKRW,
          totalMarketValueUSD,
          totalInvestedUSD,
          totalUnrealizedProfitUSD,
          totalRealizedProfitUSD,
          totalDividendsUSD,
          exchangeRate
        },
        holdings,
        realizedPnLList: realizedPnLList.reverse(),
        dividendList: dividendList.reverse()
      };
    },

    formatCurrency(val, cur = 'KRW') {
      if (val === null || val === undefined || isNaN(val)) return '0';
      if (cur === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
      }
      return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(Math.round(val));
    },

    formatNumber(val, decimals = 2) {
      if (val === null || val === undefined || isNaN(val)) return '0';
      return Number(val).toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    },

    formatPercent(val) {
      if (val === null || val === undefined || isNaN(val)) return '0.00%';
      return `${val > 0 ? '+' : ''}${Number(val).toFixed(2)}%`;
    }
  };

  // =========================================================================
  // 2. STORAGE SERVICE
  // =========================================================================
  const STORAGE_KEYS = { TRANSACTIONS: 'sam_transactions_v1', SETTINGS: 'sam_settings_v1', QUOTES: 'sam_quotes_v1' };

  const DEFAULT_SETTINGS = { theme: 'dark', colorStyle: 'global', exchangeRate: 1380, autoRefreshQuotes: true };

  const SAMPLE_TRANSACTIONS = [
    { id: 'tx_1', date: '2024-01-15', type: 'BUY', ticker: '005930', name: '삼성전자', market: 'KR', currency: 'KRW', quantity: 50, price: 72000, fee: 1500, memo: '국내 대형주 적립식 매수' },
    { id: 'tx_2', date: '2024-03-10', type: 'BUY', ticker: '005930', name: '삼성전자', market: 'KR', currency: 'KRW', quantity: 30, price: 74500, fee: 900, memo: '추가 매수' },
    { id: 'tx_3', date: '2024-02-05', type: 'BUY', ticker: 'AAPL', name: 'Apple Inc.', market: 'US', currency: 'USD', quantity: 15, price: 185.50, fee: 2.0, memo: '미국 빅테크 우량주' },
    { id: 'tx_4', date: '2024-04-20', type: 'BUY', ticker: 'NVDA', name: 'NVIDIA Corp.', market: 'US', currency: 'USD', quantity: 20, price: 95.00, fee: 2.5, memo: 'AI 반도체 성장주' },
    { id: 'tx_5', date: '2024-05-15', type: 'DIVIDEND', ticker: '005930', name: '삼성전자', market: 'KR', currency: 'KRW', quantity: 80, price: 361, amount: 28880, fee: 4440, memo: '1분기 분기 배당금' },
    { id: 'tx_6', date: '2024-06-10', type: 'SELL', ticker: 'AAPL', name: 'Apple Inc.', market: 'US', currency: 'USD', quantity: 5, price: 215.00, fee: 1.5, memo: '일부 수익 실현' }
  ];

  const StorageService = {
    getTransactions() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        if (!data) {
          this.saveTransactions(SAMPLE_TRANSACTIONS);
          return SAMPLE_TRANSACTIONS;
        }
        return JSON.parse(data);
      } catch (e) {
        return SAMPLE_TRANSACTIONS;
      }
    },
    saveTransactions(list) {
      try { localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list)); } catch (e) {}
    },
    addTransaction(tx) {
      const list = this.getTransactions();
      const newTx = { id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, ...tx };
      list.push(newTx);
      this.saveTransactions(list);
      return newTx;
    },
    deleteTransaction(id) {
      this.saveTransactions(this.getTransactions().filter((t) => t.id !== id));
    },
    deleteHolding(ticker) {
      const clean = ticker.trim().toUpperCase();
      this.saveTransactions(this.getTransactions().filter((t) => (t.ticker || '').trim().toUpperCase() !== clean));
    },
    adjustHolding(ticker, newQty, newAvgPrice, name, market, currency) {
      const clean = ticker.trim().toUpperCase();
      const list = this.getTransactions().filter((t) => (t.ticker || '').trim().toUpperCase() !== clean);
      if (newQty > 0) {
        list.push({
          id: `tx_adj_${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          type: 'BUY',
          ticker: clean,
          name: name || clean,
          market: market || (currency === 'USD' ? 'US' : 'KR'),
          currency: currency || (market === 'US' ? 'USD' : 'KRW'),
          quantity: newQty,
          price: newAvgPrice,
          fee: 0,
          memo: '수량 및 평단가 수동 조정'
        });
      }
      this.saveTransactions(list);
    },
    getSettings() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
      } catch (e) {
        return { ...DEFAULT_SETTINGS };
      }
    },
    saveSettings(s) {
      try { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s)); } catch (e) {}
    },
    getCachedQuotes() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.QUOTES);
        return data ? JSON.parse(data) : {};
      } catch (e) {
        return {};
      }
    },
    saveCachedQuotes(q) {
      try { localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(q)); } catch (e) {}
    },
    resetAllData() {
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.QUOTES);
    }
  };

  // =========================================================================
  // 3. STOCK SERVICE
  // =========================================================================
  const StockService = {
    defaultQuotes: {
      '005930': { name: '삼성전자', market: 'KR', currency: 'KRW', price: 78500, changePercent: 1.16 },
      '000660': { name: 'SK하이닉스', market: 'KR', currency: 'KRW', price: 186000, changePercent: -0.53 },
      'AAPL': { name: 'Apple Inc.', market: 'US', currency: 'USD', price: 224.50, changePercent: 1.42 },
      'TSLA': { name: 'Tesla, Inc.', market: 'US', currency: 'USD', price: 218.80, changePercent: -1.25 },
      'NVDA': { name: 'NVIDIA Corp.', market: 'US', currency: 'USD', price: 128.90, changePercent: 2.75 }
    },

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

    async fetchExchangeRate() {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
          const res = await fetch('/api/exchange-rate');
          if (res.ok) {
            const data = await res.json();
            if (data?.rate) return data.rate;
          }
        } catch (e) {}
      }
      try {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d')}`);
        if (res.ok) {
          const data = await res.json();
          const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (rate) return Math.round(rate * 100) / 100;
        }
      } catch (e) {}
      return 1380;
    },

    async fetchQuote(ticker, market = 'US') {
      const clean = ticker.trim().toUpperCase();
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
          const res = await fetch(`/api/quote?ticker=${encodeURIComponent(clean)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.price) return { ticker: clean, price: data.price, changePercent: data.changePercent || 0, currency: data.currency || (market === 'KR' ? 'KRW' : 'USD') };
          }
        } catch (e) {}
      }

      try {
        const yahooSymbol = (clean.length === 6 && !isNaN(clean)) ? `${clean}.KS` : clean;
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2d`)}`);
        if (res.ok) {
          const data = await res.json();
          const meta = data.chart?.result?.[0]?.meta;
          const cur = meta?.regularMarketPrice || meta?.chartPreviousClose;
          const prev = meta?.chartPreviousClose || meta?.previousClose;
          const changePercent = (prev && cur) ? ((cur - prev) / prev) * 100 : 0;
          if (cur) {
            return {
              ticker: clean,
              price: cur,
              changePercent: Math.round(changePercent * 100) / 100,
              currency: meta?.currency === 'KRW' ? 'KRW' : 'USD'
            };
          }
        }
      } catch (e) {}

      const fb = this.defaultQuotes[clean];
      return fb ? { ticker: clean, price: fb.price, changePercent: fb.changePercent, currency: fb.currency } : null;
    },

    async refreshAllQuotes(tickers = []) {
      const results = {};
      const promises = tickers.map(async (item) => {
        const t = typeof item === 'string' ? item : item.ticker;
        const m = typeof item === 'object' ? item.market : 'US';
        const q = await this.fetchQuote(t, m);
        if (q) results[t.toUpperCase()] = q;
      });
      await Promise.allSettled(promises);
      return results;
    }
  };

  // =========================================================================
  // 4. EXPORT SERVICE
  // =========================================================================
  const ExportService = {
    exportToCSV(transactions = []) {
      if (!transactions?.length) throw new Error('내보낼 거래 내역이 없습니다.');
      const headers = ['거래일자', '유형', '종목코드', '종목명', '시장', '통화', '수량', '단가', '수수료', '총금액', '메모'];
      const rows = transactions.map((t) => {
        const typeLabel = t.type === 'BUY' ? '매수' : (t.type === 'SELL' ? '매도' : '배당');
        const total = t.type === 'DIVIDEND' ? (t.amount || (t.quantity * t.price)) : (t.quantity * t.price);
        return [
          t.date, typeLabel, t.ticker, `"${(t.name || '').replace(/"/g, '""')}"`,
          t.market, t.currency, t.quantity, t.price, t.fee || 0, total, `"${(t.memo || '').replace(/"/g, '""')}"`
        ].join(',');
      });
      const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      this.download(blob, `주식매매일지_${new Date().toISOString().slice(0, 10)}.csv`);
    },
    exportToJSON(data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      this.download(blob, `주식자산_백업_${new Date().toISOString().slice(0, 10)}.json`);
    },
    download(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // =========================================================================
  // 5. MAIN APPLICATION CONTROLLER
  // =========================================================================
  class StockManagerApp {
    constructor() {
      this.currentView = 'dashboard';
      this.portfolioFilter = 'ALL';
      this.portfolioSort = 'weight';
      this.txFilter = 'ALL';
      this.txPeriod = 'ALL';
      this.txSort = 'date_desc';
      this.txSearch = '';
      this.analyticsPeriod = 'ALL';
      this.analyticsSort = 'date_desc';

      this.transactions = StorageService.getTransactions();
      this.settings = StorageService.getSettings();
      this.cachedQuotes = StorageService.getCachedQuotes();

      this.init();
    }

    init() {
      this.applyTheme();
      this.setupDOMEvents();
      this.render();
      setTimeout(() => this.refreshQuotes(true), 500);
    }

    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.settings.theme || 'dark');
      document.documentElement.setAttribute('data-color-style', this.settings.colorStyle || 'global');
    }

    setupDOMEvents() {
      document.querySelectorAll('.nav-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const view = e.currentTarget.dataset.view;
          if (view) this.switchView(view);
        });
      });

      const modal = document.getElementById('app-modal');
      document.getElementById('modal-close-btn')?.addEventListener('click', () => modal.classList.remove('active'));
      modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    }

    switchView(viewName) {
      this.currentView = viewName;
      document.querySelectorAll('.nav-item').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
      });
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    getPortfolioData() {
      return CalculatorService.computePortfolio(this.transactions, this.cachedQuotes, this.settings.exchangeRate || 1380);
    }

    render() {
      const container = document.getElementById('view-content');
      if (!container) return;

      const pData = this.getPortfolioData();
      switch (this.currentView) {
        case 'dashboard': this.renderDashboard(container, pData); break;
        case 'portfolio': this.renderPortfolio(container, pData); break;
        case 'transactions': this.renderTransactions(container); break;
        case 'analytics': this.renderAnalytics(container, pData); break;
        case 'settings': this.renderSettings(container); break;
      }
    }

    // --- VIEW 1: DASHBOARD ---
    renderDashboard(container, { summary, holdings }) {
      const isProfit = summary.totalUnrealizedProfitKRW >= 0;
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;">자산 총괄 대시보드</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">적용 환율: 1 USD = <strong>${CalculatorService.formatNumber(summary.exchangeRate, 2)}원</strong></p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-quick-refresh" class="btn btn-secondary btn-sm"><span>🔄</span> 시세 갱신</button>
            <button id="btn-quick-add" class="btn btn-primary btn-sm"><span>➕</span> 기록 추가</button>
          </div>
        </div>

        <div class="grid-cards">
          <!-- 1. 총 평가 자산 (KRW) -->
          <div class="card metric-card order-krw-1">
            <span class="metric-label">총 평가 자산 (KRW)</span>
            <span class="metric-value">${CalculatorService.formatCurrency(summary.totalMarketValueKRW, 'KRW')}</span>
            <div class="metric-sub">
              <span class="${isProfit ? 'profit-badge' : 'loss-badge'}">${isProfit ? '▲' : '▼'} ${CalculatorService.formatPercent(summary.totalReturnRate)}</span>
              <span class="${isProfit ? 'profit-text' : 'loss-text'}">${isProfit ? '+' : ''}${CalculatorService.formatCurrency(summary.totalUnrealizedProfitKRW, 'KRW')}</span>
            </div>
          </div>

          <!-- 2. 총 평가 자산 (USD) -->
          <div class="card metric-card order-usd-1">
            <span class="metric-label">총 평가 자산 (USD 달러)</span>
            <span class="metric-value" style="color: #38bdf8;">${CalculatorService.formatCurrency(summary.totalMarketValueUSD, 'USD')}</span>
            <div class="metric-sub">
              <span class="${isProfit ? 'profit-badge' : 'loss-badge'}">${isProfit ? '▲' : '▼'} ${CalculatorService.formatPercent(summary.totalReturnRate)}</span>
              <span class="${isProfit ? 'profit-text' : 'loss-text'}">${isProfit ? '+' : ''}${CalculatorService.formatCurrency(summary.totalUnrealizedProfitUSD, 'USD')}</span>
            </div>
          </div>

          <!-- 3. 총 투자 원금 (KRW) -->
          <div class="card metric-card order-krw-2">
            <span class="metric-label">총 투자 원금 (KRW)</span>
            <span class="metric-value">${CalculatorService.formatCurrency(summary.totalInvestedKRW, 'KRW')}</span>
            <div class="metric-sub" style="color: var(--text-muted);">보유 종목수: <strong style="color: var(--text-main);">${holdings.length}개</strong></div>
          </div>

          <!-- 4. 총 투자 원금 (USD) -->
          <div class="card metric-card order-usd-2">
            <span class="metric-label">총 투자 원금 (USD 달러)</span>
            <span class="metric-value">${CalculatorService.formatCurrency(summary.totalInvestedUSD, 'USD')}</span>
            <div class="metric-sub" style="color: var(--text-muted);">적용 환율: 1 USD = <strong>${CalculatorService.formatNumber(summary.exchangeRate, 1)}원</strong></div>
          </div>

          <!-- 5. 누적 실현 손익 (KRW) -->
          <div class="card metric-card order-krw-3">
            <span class="metric-label">누적 실현 손익 (KRW)</span>
            <span class="metric-value ${summary.totalRealizedProfitKRW >= 0 ? 'profit-text' : 'loss-text'}">
              ${summary.totalRealizedProfitKRW >= 0 ? '+' : ''}${CalculatorService.formatCurrency(summary.totalRealizedProfitKRW, 'KRW')}
            </span>
            <div class="metric-sub" style="color: var(--text-muted);">원화 확정 손익</div>
          </div>

          <!-- 6. 누적 실현 손익 (USD) -->
          <div class="card metric-card order-usd-3">
            <span class="metric-label">누적 실현 손익 (USD 달러)</span>
            <span class="metric-value ${summary.totalRealizedProfitUSD >= 0 ? 'profit-text' : 'loss-text'}">
              ${summary.totalRealizedProfitUSD >= 0 ? '+' : ''}${CalculatorService.formatCurrency(summary.totalRealizedProfitUSD, 'USD')}
            </span>
            <div class="metric-sub" style="color: var(--text-muted);">달러 확정 손익 ($)</div>
          </div>
        </div>

        <div class="grid-2col">
          <div class="card">
            <div class="card-header"><span class="card-title">📊 종목별 자산 비중</span></div>
            <div class="chart-container">
              <canvas id="allocation-canvas" width="260" height="260" style="max-width: 100%; height: auto;"></canvas>
              <div id="chart-legend" class="chart-legend"></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title">🏆 보유 비중 상위 종목</span></div>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${holdings.length === 0 ? '<p style="text-align: center; color: var(--text-dim); padding: 2rem;">보유 종목이 없습니다.</p>' : ''}
              ${holdings.slice(0, 5).map((h) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.75rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                      <span class="badge ${h.market === 'US' ? 'badge-us' : 'badge-kr'}">${h.market}</span>
                      <strong style="font-size: 0.92rem;">${h.name}</strong>
                      <span style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono);">${h.ticker}</span>
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
                      보유 ${CalculatorService.formatNumber(h.quantity, h.market === 'US' ? 2 : 0)}주 · 비중 ${h.weightPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 0.95rem; font-weight: 700; font-family: var(--font-mono);">${CalculatorService.formatCurrency(h.marketValueKRW, 'KRW')}</div>
                    <div style="font-size: 0.8rem; font-weight: 600;" class="${h.profit >= 0 ? 'profit-text' : 'loss-text'}">${CalculatorService.formatPercent(h.returnRate)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      container.querySelector('#btn-quick-refresh')?.addEventListener('click', () => this.refreshQuotes());
      container.querySelector('#btn-quick-add')?.addEventListener('click', () => this.openAddModal());
      this.drawDonutChart(container, holdings);
    }

    drawDonutChart(container, holdings) {
      const canvas = container.querySelector('#allocation-canvas');
      const legendEl = container.querySelector('#chart-legend');
      if (!canvas || !holdings.length) return;

      const ctx = canvas.getContext('2d');
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'];
      const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 15, ir = r * 0.62;

      let startAngle = -Math.PI / 2, legendHtml = '';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      holdings.forEach((item, idx) => {
        const color = colors[idx % colors.length];
        const endAngle = startAngle + (item.weightPercent / 100) * (Math.PI * 2);

        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.arc(cx, cy, ir, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#151e2d';
        ctx.lineWidth = 2;
        ctx.stroke();

        startAngle = endAngle;
        legendHtml += `<div class="legend-item"><span class="legend-color" style="background-color: ${color};"></span><span>${item.name} (${item.weightPercent.toFixed(1)}%)</span></div>`;
      });

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('총 자산 비중', cx, cy - 8);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${holdings.length}개 종목`, cx, cy + 12);

      if (legendEl) legendEl.innerHTML = legendHtml;
    }

    // --- VIEW 2: PORTFOLIO ---
    renderPortfolio(container, { holdings }) {
      let filtered = holdings.filter((h) => {
        if (this.portfolioFilter === 'KR') return h.market === 'KR';
        if (this.portfolioFilter === 'US') return h.market === 'US';
        return true;
      });

      filtered.sort((a, b) => {
        if (this.portfolioSort === 'profit') return b.profitKRW - a.profitKRW;
        if (this.portfolioSort === 'returnRate') return b.returnRate - a.returnRate;
        if (this.portfolioSort === 'name') return a.name.localeCompare(b.name, 'ko');
        return b.weightPercent - a.weightPercent;
      });

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;">보유 종목 포트폴리오</h2>
            <button id="btn-port-add" class="btn btn-primary btn-sm"><span>➕</span> 매수/매도 기록</button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; background: var(--bg-card); padding: 0.6rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-sm ${this.portfolioFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}" data-pfilter="ALL">전체 (${holdings.length})</button>
              <button class="btn btn-sm ${this.portfolioFilter === 'KR' ? 'btn-primary' : 'btn-secondary'}" data-pfilter="KR">국내 (${holdings.filter(h => h.market === 'KR').length})</button>
              <button class="btn btn-sm ${this.portfolioFilter === 'US' ? 'btn-primary' : 'btn-secondary'}" data-pfilter="US">미국 (${holdings.filter(h => h.market === 'US').length})</button>
            </div>

            <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--text-muted);">
              <span>정렬:</span>
              <select id="select-port-sort" class="form-select" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">
                <option value="weight" ${this.portfolioSort === 'weight' ? 'selected' : ''}>자산 비중순</option>
                <option value="profit" ${this.portfolioSort === 'profit' ? 'selected' : ''}>평가손익순</option>
                <option value="returnRate" ${this.portfolioSort === 'returnRate' ? 'selected' : ''}>수익률순</option>
                <option value="name" ${this.portfolioSort === 'name' ? 'selected' : ''}>종목명순</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Desktop Table View (768px 이상) -->
        <div class="desktop-only-table card table-responsive" style="padding: 0;">
          <table class="stock-table">
            <thead>
              <tr>
                <th>종목 / 티커</th>
                <th class="text-right">보유수량</th>
                <th class="text-right">평균단가</th>
                <th class="text-right">현재가 (전일대비)</th>
                <th class="text-right">평가금액</th>
                <th class="text-right">평가손익 (수익률)</th>
                <th class="text-right">비중</th>
                <th class="text-right" style="min-width: 140px;">관리</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">보유 중인 종목이 없습니다.</td></tr>' : ''}
              ${filtered.map((h) => {
                const isP = h.profit >= 0;
                const change = parseFloat(h.changePercent) || 0;
                const isDayP = change >= 0;
                const daySign = change > 0 ? '+' : '';
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.4rem;">
                        <span class="badge ${h.market === 'US' ? 'badge-us' : 'badge-kr'}">${h.market}</span>
                        <strong>${h.name}</strong>
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 0.15rem;">${h.ticker}</div>
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${CalculatorService.formatNumber(h.quantity, h.market === 'US' ? 2 : 0)}주</td>
                    <td class="text-right" style="font-family: var(--font-mono);">${CalculatorService.formatCurrency(h.avgPrice, h.currency)}</td>
                    <td class="text-right" style="font-family: var(--font-mono);">
                      <div style="font-weight: 600;">${CalculatorService.formatCurrency(h.currentPrice, h.currency)}</div>
                      <div style="font-size: 0.76rem; font-weight: 600;" class="${isDayP ? 'profit-text' : 'loss-text'}">
                        ${daySign}${change.toFixed(2)}% ${isDayP ? '▲' : '▼'}
                      </div>
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono); font-weight: 700;">${CalculatorService.formatCurrency(h.marketValueKRW, 'KRW')}</td>
                    <td class="text-right" style="font-family: var(--font-mono);">
                      <div class="${isP ? 'profit-text' : 'loss-text'}" style="font-weight: 700;">${isP ? '+' : ''}${CalculatorService.formatCurrency(h.profitKRW, 'KRW')}</div>
                      <div class="${isP ? 'profit-badge' : 'loss-badge'}" style="font-size: 0.72rem; margin-top: 0.15rem;">${CalculatorService.formatPercent(h.returnRate)}</div>
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${h.weightPercent.toFixed(1)}%</td>
                    <td class="text-right">
                      <div style="display: flex; justify-content: flex-end; gap: 0.35rem;">
                        <button class="btn btn-sm btn-sell-stock" 
                          style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600;"
                          data-ticker="${h.ticker}" data-price="${h.currentPrice}" data-name="${h.name}" data-qty="${h.quantity}" data-avg="${h.avgPrice}" data-currency="${h.currency}" data-market="${h.market}">
                          📉 매도
                        </button>
                        <button class="btn btn-secondary btn-sm btn-edit-stock" 
                          data-ticker="${h.ticker}" data-price="${h.currentPrice}" data-name="${h.name}" data-qty="${h.quantity}" data-avg="${h.avgPrice}" data-currency="${h.currency}" data-market="${h.market}">
                          ✏️ 수정
                        </button>
                        <button class="btn btn-danger btn-sm btn-del-stock" data-ticker="${h.ticker}" data-name="${h.name}">
                          🗑️ 삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards View (스마트폰 / Galaxy S26 Ultra 등) -->
        <div class="mobile-only-cards mobile-stock-list" style="display: none; flex-direction: column; gap: 0.65rem;">
          ${filtered.length === 0 ? '<div class="card" style="text-align: center; padding: 2rem; color: var(--text-dim);">보유 중인 종목이 없습니다.</div>' : ''}
          ${filtered.map((h) => {
            const isP = h.profit >= 0;
            const change = parseFloat(h.changePercent) || 0;
            const isDayP = change >= 0;
            const daySign = change > 0 ? '+' : '';
            return `
              <div class="card mobile-stock-card" style="padding: 0.95rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                      <span class="badge ${h.market === 'US' ? 'badge-us' : 'badge-kr'}">${h.market}</span>
                      <strong style="font-size: 1rem; letter-spacing: -0.01em;">${h.name}</strong>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 0.15rem;">
                      ${h.ticker} · 비중 <strong>${h.weightPercent.toFixed(1)}%</strong>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 1.08rem; font-family: var(--font-mono);">${CalculatorService.formatCurrency(h.currentPrice, h.currency)}</div>
                    <div style="font-size: 0.78rem; font-weight: 600;" class="${isDayP ? 'profit-text' : 'loss-text'}">
                      ${daySign}${change.toFixed(2)}% ${isDayP ? '▲' : '▼'}
                    </div>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem 0.6rem; background: var(--bg-secondary); padding: 0.65rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 0.75rem;">
                  <div>
                    <div style="color: var(--text-muted); font-size: 0.72rem;">보유 / 평단가</div>
                    <div style="font-weight: 600; font-family: var(--font-mono); font-size: 0.84rem;">
                      ${CalculatorService.formatNumber(h.quantity, h.market === 'US' ? 2 : 0)}주 · ${CalculatorService.formatCurrency(h.avgPrice, h.currency)}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="color: var(--text-muted); font-size: 0.72rem;">평가금액 (KRW)</div>
                    <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.88rem;">
                      ${CalculatorService.formatCurrency(h.marketValueKRW, 'KRW')}
                    </div>
                  </div>
                  <div>
                    <div style="color: var(--text-muted); font-size: 0.72rem;">평가손익</div>
                    <div class="${isP ? 'profit-text' : 'loss-text'}" style="font-weight: 700; font-family: var(--font-mono); font-size: 0.88rem;">
                      ${isP ? '+' : ''}${CalculatorService.formatCurrency(h.profitKRW, 'KRW')}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="color: var(--text-muted); font-size: 0.72rem;">수익률</div>
                    <div>
                      <span class="${isP ? 'profit-badge' : 'loss-badge'}" style="font-size: 0.76rem; padding: 0.1rem 0.45rem;">
                        ${CalculatorService.formatPercent(h.returnRate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 0.4rem;">
                  <button class="btn btn-sm btn-sell-stock" 
                    style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 700; padding: 0.45rem 0.4rem; font-size: 0.8rem;"
                    data-ticker="${h.ticker}" data-price="${h.currentPrice}" data-name="${h.name}" data-qty="${h.quantity}" data-avg="${h.avgPrice}" data-currency="${h.currency}" data-market="${h.market}">
                    📉 매도
                  </button>
                  <button class="btn btn-secondary btn-sm btn-edit-stock" 
                    style="padding: 0.45rem 0.4rem; font-size: 0.8rem;"
                    data-ticker="${h.ticker}" data-price="${h.currentPrice}" data-name="${h.name}" data-qty="${h.quantity}" data-avg="${h.avgPrice}" data-currency="${h.currency}" data-market="${h.market}">
                    ✏️ 수정
                  </button>
                  <button class="btn btn-danger btn-sm btn-del-stock" 
                    style="padding: 0.45rem 0.4rem; font-size: 0.8rem;"
                    data-ticker="${h.ticker}" data-name="${h.name}">
                    🗑️ 삭제
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      container.querySelector('#btn-port-add')?.addEventListener('click', () => this.openAddModal());
      container.querySelectorAll('[data-pfilter]').forEach(btn => btn.addEventListener('click', e => { this.portfolioFilter = e.currentTarget.dataset.pfilter; this.render(); }));
      container.querySelector('#select-port-sort')?.addEventListener('change', e => { this.portfolioSort = e.target.value; this.render(); });

      // Quick Sell Handler
      container.querySelectorAll('.btn-sell-stock').forEach(btn => {
        btn.addEventListener('click', e => {
          const d = e.currentTarget.dataset;
          this.openSellStockModal({
            ticker: d.ticker,
            name: d.name,
            price: parseFloat(d.price),
            quantity: parseFloat(d.qty),
            avgPrice: parseFloat(d.avg),
            currency: d.currency,
            market: d.market
          });
        });
      });

      // Edit stock handler
      container.querySelectorAll('.btn-edit-stock').forEach(btn => {
        btn.addEventListener('click', e => {
          const d = e.currentTarget.dataset;
          this.openEditStockModal({ ticker: d.ticker, name: d.name, price: parseFloat(d.price), quantity: parseFloat(d.qty), avgPrice: parseFloat(d.avg), currency: d.currency, market: d.market });
        });
      });

      // Delete stock handler
      container.querySelectorAll('.btn-del-stock').forEach(btn => {
        btn.addEventListener('click', e => {
          const { ticker, name } = e.currentTarget.dataset;
          if (confirm(`[${name || ticker}] 종목을 포트폴리오에서 삭제하시겠습니까?\n(해당 종목의 모든 거래 기록이 정리됩니다)`)) {
            StorageService.deleteHolding(ticker);
            this.transactions = StorageService.getTransactions();
            this.showToast(`[${name || ticker}] 종목이 삭제되었습니다.`, 'info');
            this.render();
          }
        });
      });
    }

    // --- VIEW 3: TRANSACTIONS ---
    renderTransactions(container) {
      // 1. Collect unique years and months from transactions
      const yearsSet = new Set();
      const monthsSet = new Set();
      this.transactions.forEach(t => {
        if (t.date) {
          const yr = t.date.slice(0, 4);
          const ym = t.date.slice(0, 7);
          if (yr.length === 4) yearsSet.add(yr);
          if (ym.length === 7) monthsSet.add(ym);
        }
      });
      const sortedYears = Array.from(yearsSet).sort().reverse();
      const sortedMonths = Array.from(monthsSet).sort().reverse();

      // 2. Filter list
      let list = [...this.transactions];

      // Type Filter
      if (this.txFilter !== 'ALL') {
        list = list.filter(t => t.type === this.txFilter);
      }

      // Period Filter (Year / Year+Month)
      if (this.txPeriod && this.txPeriod !== 'ALL') {
        if (this.txPeriod.startsWith('Y_')) {
          const year = this.txPeriod.replace('Y_', '');
          list = list.filter(t => t.date && t.date.startsWith(year));
        } else if (this.txPeriod.startsWith('M_')) {
          const ym = this.txPeriod.replace('M_', '');
          list = list.filter(t => t.date && t.date.startsWith(ym));
        }
      }

      // Search Filter
      if (this.txSearch.trim()) {
        const term = this.txSearch.trim().toLowerCase();
        list = list.filter(t => 
          (t.name && t.name.toLowerCase().includes(term)) || 
          (t.ticker && t.ticker.toLowerCase().includes(term)) || 
          (t.memo && t.memo.toLowerCase().includes(term))
        );
      }

      // 3. Sorting
      const rate = this.settings.exchangeRate || 1380;
      list.sort((a, b) => {
        if (this.txSort === 'date_asc') return new Date(a.date) - new Date(b.date);
        if (this.txSort === 'amount_desc') {
          const totA = (a.quantity * a.price) * (a.currency === 'USD' ? rate : 1);
          const totB = (b.quantity * b.price) * (b.currency === 'USD' ? rate : 1);
          return totB - totA;
        }
        if (this.txSort === 'amount_asc') {
          const totA = (a.quantity * a.price) * (a.currency === 'USD' ? rate : 1);
          const totB = (b.quantity * b.price) * (b.currency === 'USD' ? rate : 1);
          return totA - totB;
        }
        if (this.txSort === 'name_asc') {
          return (a.name || a.ticker).localeCompare(b.name || b.ticker, 'ko');
        }
        return new Date(b.date) - new Date(a.date); // default date_desc
      });

      // Calculate totals for filtered list
      let buyTotalKRW = 0, buyTotalUSD = 0;
      let sellTotalKRW = 0, sellTotalUSD = 0;
      list.forEach(tx => {
        const amt = tx.quantity * tx.price;
        if (tx.type === 'BUY') {
          if (tx.currency === 'USD') buyTotalUSD += amt;
          else buyTotalKRW += amt;
        } else if (tx.type === 'SELL') {
          if (tx.currency === 'USD') sellTotalUSD += amt;
          else sellTotalKRW += amt;
        }
      });

      const buySummaryParts = [];
      if (buyTotalKRW > 0) buySummaryParts.push(CalculatorService.formatCurrency(buyTotalKRW, 'KRW'));
      if (buyTotalUSD > 0) buySummaryParts.push(CalculatorService.formatCurrency(buyTotalUSD, 'USD'));
      const buySummaryText = buySummaryParts.length > 0 ? buySummaryParts.join(' + ') : '₩0';

      const sellSummaryParts = [];
      if (sellTotalKRW > 0) sellSummaryParts.push(CalculatorService.formatCurrency(sellTotalKRW, 'KRW'));
      if (sellTotalUSD > 0) sellSummaryParts.push(CalculatorService.formatCurrency(sellTotalUSD, 'USD'));
      const sellSummaryText = sellSummaryParts.length > 0 ? sellSummaryParts.join(' + ') : '₩0';

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;">📜 매매 거래 일지</h2>
            <button id="btn-tx-add-main" class="btn btn-primary btn-sm"><span>➕</span> 기록 추가</button>
          </div>

          <!-- Top Filter & Sort Bar -->
          <div style="display: flex; flex-direction: column; gap: 0.55rem; background: var(--bg-card); padding: 0.65rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <!-- Row 1: Type Filters -->
            <div style="display: flex; gap: 0.35rem; width: 100%;">
              <button class="btn btn-sm ${this.txFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}" data-tfilter="ALL" style="flex: 1; padding: 0.35rem 0.2rem; font-size: 0.8rem; white-space: nowrap; word-break: keep-all;">전체 (${this.transactions.length})</button>
              <button class="btn btn-sm ${this.txFilter === 'BUY' ? 'btn-primary' : 'btn-secondary'}" data-tfilter="BUY" style="flex: 1; padding: 0.35rem 0.2rem; font-size: 0.8rem; white-space: nowrap; word-break: keep-all;">매수 (${this.transactions.filter(t => t.type === 'BUY').length})</button>
              <button class="btn btn-sm ${this.txFilter === 'SELL' ? 'btn-primary' : 'btn-secondary'}" data-tfilter="SELL" style="flex: 1; padding: 0.35rem 0.2rem; font-size: 0.8rem; white-space: nowrap; word-break: keep-all;">매도 (${this.transactions.filter(t => t.type === 'SELL').length})</button>
            </div>

            <!-- Row 2: Period + Sort -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; width: 100%;">
              <select id="select-tx-period" class="form-select" style="padding: 0.32rem 0.5rem; font-size: 0.8rem; width: 100%;">
                <option value="ALL" ${this.txPeriod === 'ALL' ? 'selected' : ''}>📅 전체 기간</option>
                ${sortedYears.length > 0 ? `
                  <optgroup label="── 🗓️ 연도별 ──">
                    ${sortedYears.map(y => `<option value="Y_${y}" ${this.txPeriod === `Y_${y}` ? 'selected' : ''}>${y}년 전체</option>`).join('')}
                  </optgroup>
                ` : ''}
                ${sortedMonths.length > 0 ? `
                  <optgroup label="── 📆 년도 + 월별 ──">
                    ${sortedMonths.map(m => {
                      const [yr, mo] = m.split('-');
                      return `<option value="M_${m}" ${this.txPeriod === `M_${m}` ? 'selected' : ''}>${yr}년 ${mo}월</option>`;
                    }).join('')}
                  </optgroup>
                ` : ''}
              </select>

              <select id="select-tx-sort" class="form-select" style="padding: 0.32rem 0.5rem; font-size: 0.8rem; width: 100%;">
                <option value="date_desc" ${this.txSort === 'date_desc' ? 'selected' : ''}>최신순 (날짜 ↓)</option>
                <option value="date_asc" ${this.txSort === 'date_asc' ? 'selected' : ''}>과거순 (날짜 ↑)</option>
                <option value="amount_desc" ${this.txSort === 'amount_desc' ? 'selected' : ''}>거래금액 큰순 ↓</option>
                <option value="amount_asc" ${this.txSort === 'amount_asc' ? 'selected' : ''}>거래금액 작은순 ↑</option>
                <option value="name_asc" ${this.txSort === 'name_asc' ? 'selected' : ''}>종목명순</option>
              </select>
            </div>

            <!-- Row 3: Search Box -->
            <div style="width: 100%;">
              <input type="text" id="tx-search-box" class="form-input" placeholder="🔍 종목명, 티커, 매매 메모 검색..." value="${this.txSearch}" style="padding: 0.35rem 0.65rem; font-size: 0.82rem; width: 100%;">
            </div>
          </div>

          <!-- Active Filter Result Summary Info -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-muted); padding: 0.4rem 0.6rem; background: var(--bg-secondary); border-radius: var(--radius-sm); flex-wrap: wrap; gap: 0.4rem;">
            <div>
              조회: <strong style="color: var(--text-main);">${list.length}건</strong>
              ${this.txPeriod !== 'ALL' ? `<span class="badge" style="margin-left: 0.25rem; font-size: 0.7rem; background: var(--bg-card);">${this.txPeriod.startsWith('Y_') ? `${this.txPeriod.replace('Y_', '')}년` : `${this.txPeriod.replace('M_', '').replace('-', '년 ')}월`}</span>` : ''}
            </div>
            <div style="display: flex; gap: 0.65rem; font-size: 0.76rem;">
              <span>매수: <strong style="color: #60a5fa; font-family: var(--font-mono);">${buySummaryText}</strong></span>
              <span>매도: <strong style="color: #f87171; font-family: var(--font-mono);">${sellSummaryText}</strong></span>
            </div>
          </div>
        </div>

        <!-- Transactions List -->
        <div style="display: flex; flex-direction: column; gap: 0.55rem;">
          ${list.length === 0 ? '<div class="card" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">해당 조건의 거래 내역이 없습니다.</div>' : ''}
          ${list.map((tx) => {
            let badge = tx.type === 'BUY' 
              ? '<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 0.18rem 0.45rem; font-size: 0.75rem; white-space: nowrap; flex-shrink: 0; min-width: 36px; text-align: center; display: inline-flex; justify-content: center;">매수</span>'
              : '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 0.18rem 0.45rem; font-size: 0.75rem; white-space: nowrap; flex-shrink: 0; min-width: 36px; text-align: center; display: inline-flex; justify-content: center;">매도</span>';
            const tot = (tx.quantity * tx.price) + (tx.type === 'BUY' ? (tx.fee || 0) : -(tx.fee || 0));

            return `
              <div class="card" style="padding: 0.75rem 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
                <!-- Line 1: Badge + Name/Ticker --- Amount + Delete -->
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem;">
                  <div style="display: flex; align-items: center; gap: 0.4rem; min-width: 0; flex: 1;">
                    ${badge}
                    <strong style="font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;">${tx.name || tx.ticker}</strong>
                    <span style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono); flex-shrink: 0;">${tx.ticker}</span>
                  </div>

                  <div style="display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0;">
                    <span style="font-size: 0.92rem; font-weight: 700; font-family: var(--font-mono); color: ${tx.type === 'BUY' ? '#60a5fa' : '#f87171'};">
                      ${tx.type === 'BUY' ? '-' : '+'}${CalculatorService.formatCurrency(tot, tx.currency)}
                    </span>
                    <button class="btn-icon btn-del-tx" data-id="${tx.id}" title="삭제" style="padding: 0.25rem 0.4rem; font-size: 0.75rem; border-radius: var(--radius-sm); color: var(--text-dim);">🗑️</button>
                  </div>
                </div>

                <!-- Line 2: Date · Qty @ Price · Fee · Memo -->
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); padding-top: 0.3rem; border-top: 1px dashed var(--border-subtle); flex-wrap: wrap; gap: 0.25rem;">
                  <div>
                    <span>📅 ${tx.date}</span>
                    <span style="margin: 0 0.25rem; color: var(--border-active);">·</span>
                    <span style="font-family: var(--font-mono);">${CalculatorService.formatNumber(tx.quantity, tx.currency === 'USD' ? 2 : 0)}주 @ ${CalculatorService.formatCurrency(tx.price, tx.currency)}</span>
                    ${tx.fee ? `<span style="color: var(--text-dim); margin-left: 0.25rem;">(수수료 ${CalculatorService.formatCurrency(tx.fee, tx.currency)})</span>` : ''}
                  </div>
                  ${tx.memo ? `<div style="color: var(--text-dim); font-size: 0.72rem; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">💬 ${tx.memo}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      container.querySelector('#btn-tx-add-main')?.addEventListener('click', () => this.openAddModal());
      container.querySelectorAll('[data-tfilter]').forEach(btn => btn.addEventListener('click', e => { this.txFilter = e.currentTarget.dataset.tfilter; this.render(); }));
      container.querySelector('#select-tx-period')?.addEventListener('change', e => { this.txPeriod = e.target.value; this.render(); });
      container.querySelector('#select-tx-sort')?.addEventListener('change', e => { this.txSort = e.target.value; this.render(); });
      container.querySelector('#tx-search-box')?.addEventListener('input', e => { this.txSearch = e.target.value; this.render(); });
      container.querySelectorAll('.btn-del-tx').forEach(btn => btn.addEventListener('click', e => {
        if (confirm('이 기록을 삭제하시겠습니까?')) {
          StorageService.deleteTransaction(e.currentTarget.dataset.id);
          this.transactions = StorageService.getTransactions();
          this.showToast('기록이 삭제되었습니다.', 'info');
          this.render();
        }
      }));
    }

    // --- VIEW 4: ANALYTICS ---
    renderAnalytics(container, { summary, realizedPnLList }) {
      // 1. Collect unique years and months from realizedPnLList
      const yearsSet = new Set();
      const monthsSet = new Set();
      realizedPnLList.forEach(r => {
        if (r.date) {
          const yr = r.date.slice(0, 4);
          const ym = r.date.slice(0, 7);
          if (yr.length === 4) yearsSet.add(yr);
          if (ym.length === 7) monthsSet.add(ym);
        }
      });
      const sortedYears = Array.from(yearsSet).sort().reverse();
      const sortedMonths = Array.from(monthsSet).sort().reverse();

      // 2. Filter list by selected period
      let list = [...realizedPnLList];
      if (this.analyticsPeriod && this.analyticsPeriod !== 'ALL') {
        if (this.analyticsPeriod.startsWith('Y_')) {
          const year = this.analyticsPeriod.replace('Y_', '');
          list = list.filter(r => r.date && r.date.startsWith(year));
        } else if (this.analyticsPeriod.startsWith('M_')) {
          const ym = this.analyticsPeriod.replace('M_', '');
          list = list.filter(r => r.date && r.date.startsWith(ym));
        }
      }

      // 3. Sort list
      const rate = summary.exchangeRate || 1380;
      list.sort((a, b) => {
        if (this.analyticsSort === 'date_asc') return new Date(a.date) - new Date(b.date);
        if (this.analyticsSort === 'profit_desc') {
          const aProf = a.realizedProfit * (a.currency === 'USD' ? rate : 1);
          const bProf = b.realizedProfit * (b.currency === 'USD' ? rate : 1);
          return bProf - aProf;
        }
        if (this.analyticsSort === 'profit_asc') {
          const aProf = a.realizedProfit * (a.currency === 'USD' ? rate : 1);
          const bProf = b.realizedProfit * (b.currency === 'USD' ? rate : 1);
          return aProf - bProf;
        }
        if (this.analyticsSort === 'return_desc') return b.returnRate - a.returnRate;
        if (this.analyticsSort === 'return_asc') return a.returnRate - b.returnRate;
        if (this.analyticsSort === 'name_asc') return (a.name || a.ticker).localeCompare(b.name || b.ticker, 'ko');
        return new Date(b.date) - new Date(a.date); // default: date_desc
      });

      // 4. Calculate period-specific profit & counts
      let periodProfitKRW = 0;
      let winCount = 0;
      let lossCount = 0;

      list.forEach(r => {
        const pKRW = r.realizedProfit * (r.currency === 'USD' ? rate : 1);
        periodProfitKRW += pKRW;
        if (r.realizedProfit > 0) winCount++;
        else if (r.realizedProfit < 0) lossCount++;
      });
      const periodProfitUSD = rate > 0 ? periodProfitKRW / rate : 0;

      const isProfitKRW = periodProfitKRW >= 0;
      const isProfitUSD = periodProfitUSD >= 0;

      const periodLabel = this.analyticsPeriod === 'ALL' 
        ? '전체 기간' 
        : (this.analyticsPeriod.startsWith('Y_') ? `${this.analyticsPeriod.replace('Y_', '')}년` : `${this.analyticsPeriod.replace('M_', '').replace('-', '년 ')}월`);

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;">📈 매도 실현 손익 분석</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">선택한 기간의 확정 매도 수익금 및 거래 내역을 집중 분석합니다.</p>
          </div>

          <!-- Filter & Sort Bar -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; background: var(--bg-card); padding: 0.45rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <!-- Period Filter -->
            <div style="display: flex; align-items: center; gap: 0.3rem;">
              <span style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">기간:</span>
              <select id="select-analytics-period" class="form-select" style="padding: 0.32rem 0.65rem; font-size: 0.8rem; min-width: 140px;">
                <option value="ALL" ${this.analyticsPeriod === 'ALL' ? 'selected' : ''}>📅 전체 기간</option>
                ${sortedYears.length > 0 ? `
                  <optgroup label="── 🗓️ 연도별 ──">
                    ${sortedYears.map(y => `<option value="Y_${y}" ${this.analyticsPeriod === `Y_${y}` ? 'selected' : ''}>${y}년 전체</option>`).join('')}
                  </optgroup>
                ` : ''}
                ${sortedMonths.length > 0 ? `
                  <optgroup label="── 📆 년도 + 월별 ──">
                    ${sortedMonths.map(m => {
                      const [yr, mo] = m.split('-');
                      return `<option value="M_${m}" ${this.analyticsPeriod === `M_${m}` ? 'selected' : ''}>${yr}년 ${mo}월</option>`;
                    }).join('')}
                  </optgroup>
                ` : ''}
              </select>
            </div>

            <!-- Sorting Option -->
            <div style="display: flex; align-items: center; gap: 0.3rem;">
              <span style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">정렬:</span>
              <select id="select-analytics-sort" class="form-select" style="padding: 0.32rem 0.65rem; font-size: 0.8rem;">
                <option value="date_desc" ${this.analyticsSort === 'date_desc' ? 'selected' : ''}>최신순 (날짜 ↓)</option>
                <option value="date_asc" ${this.analyticsSort === 'date_asc' ? 'selected' : ''}>과거순 (날짜 ↑)</option>
                <option value="profit_desc" ${this.analyticsSort === 'profit_desc' ? 'selected' : ''}>수익금 큰순 ↓</option>
                <option value="profit_asc" ${this.analyticsSort === 'profit_asc' ? 'selected' : ''}>손실 큰순 ↑</option>
                <option value="return_desc" ${this.analyticsSort === 'return_desc' ? 'selected' : ''}>수익률 높은순 ↓</option>
                <option value="return_asc" ${this.analyticsSort === 'return_asc' ? 'selected' : ''}>수익률 낮은순 ↑</option>
                <option value="name_asc" ${this.analyticsSort === 'name_asc' ? 'selected' : ''}>종목명순</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 3 Dynamic Metric Cards (Period Specific) -->
        <div class="grid-cards" style="margin-bottom: 1.25rem;">
          <div class="card metric-card">
            <span class="metric-label">[${periodLabel}] 실현 손익 (KRW)</span>
            <span class="metric-value ${isProfitKRW ? 'profit-text' : 'loss-text'}">
              ${isProfitKRW ? '+' : ''}${CalculatorService.formatCurrency(periodProfitKRW, 'KRW')}
            </span>
            <div class="metric-sub" style="color: var(--text-muted);">해당 기간 원화 확정 손익</div>
          </div>

          <div class="card metric-card">
            <span class="metric-label">[${periodLabel}] 실현 손익 (USD)</span>
            <span class="metric-value ${isProfitUSD ? 'profit-text' : 'loss-text'}">
              ${isProfitUSD ? '+' : ''}${CalculatorService.formatCurrency(periodProfitUSD, 'USD')}
            </span>
            <div class="metric-sub" style="color: var(--text-muted);">해당 기간 달러 환산 손익</div>
          </div>

          <div class="card metric-card">
            <span class="metric-label">[${periodLabel}] 매도 거래 수</span>
            <span class="metric-value" style="color: var(--color-accent);">${list.length}건</span>
            <div class="metric-sub" style="color: var(--text-muted);">
              익절 <strong style="color: #60a5fa;">${winCount}건</strong> · 손절 <strong style="color: #f87171;">${lossCount}건</strong>
            </div>
          </div>
        </div>

        <!-- Table of Filtered Realized PnL Transactions (Desktop) -->
        <div class="card desktop-only-table" style="padding: 0;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 0;">
            <span class="card-title">📋 [${periodLabel}] 실현 손익 상세 기록</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">총 ${list.length}건</span>
          </div>
          <div class="table-responsive">
            <table class="stock-table">
              <thead>
                <tr>
                  <th>매도일자</th>
                  <th>종목명 / 티커</th>
                  <th class="text-right">수량</th>
                  <th class="text-right">평단가</th>
                  <th class="text-right">매도가</th>
                  <th class="text-right">실현손익 (수익률)</th>
                </tr>
              </thead>
              <tbody>
                ${list.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-dim);">해당 기간의 매도 완료 기록이 없습니다.</td></tr>' : ''}
                ${list.map(r => `
                  <tr>
                    <td style="color: var(--text-muted); font-size: 0.82rem;">${r.date}</td>
                    <td><strong>${r.name}</strong> <span style="font-size: 0.75rem; color: var(--text-dim);">${r.ticker}</span></td>
                    <td class="text-right" style="font-family: var(--font-mono);">${CalculatorService.formatNumber(r.quantity, r.currency === 'USD' ? 2 : 0)}</td>
                    <td class="text-right" style="font-family: var(--font-mono);">${CalculatorService.formatCurrency(r.avgBuyPrice, r.currency)}</td>
                    <td class="text-right" style="font-family: var(--font-mono);">${CalculatorService.formatCurrency(r.sellPrice, r.currency)}</td>
                    <td class="text-right" style="font-family: var(--font-mono);">
                      <div class="${r.realizedProfit >= 0 ? 'profit-text' : 'loss-text'}" style="font-weight: 700;">${r.realizedProfit >= 0 ? '+' : ''}${CalculatorService.formatCurrency(r.realizedProfit, r.currency)}</div>
                      <div class="${r.realizedProfit >= 0 ? 'profit-badge' : 'loss-badge'}" style="font-size: 0.72rem;">${CalculatorService.formatPercent(r.returnRate)}</div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Mobile Cards View for Realized PnL (스마트폰 / Galaxy S26 Ultra) -->
        <div class="mobile-only-cards mobile-stock-list" style="display: none; flex-direction: column; gap: 0.65rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.2rem 0.25rem;">
            <span style="font-size: 0.9rem; font-weight: 700;">📋 [${periodLabel}] 상세 기록</span>
            <span style="font-size: 0.78rem; color: var(--text-muted);">총 ${list.length}건</span>
          </div>
          ${list.length === 0 ? '<div class="card" style="text-align:center; padding: 2rem; color: var(--text-dim);">해당 기간의 매도 완료 기록이 없습니다.</div>' : ''}
          ${list.map(r => `
            <div class="card" style="padding: 0.85rem 0.95rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div>
                  <strong style="font-size: 0.95rem;">${r.name}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); margin-left: 0.25rem;">${r.ticker}</span>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">📅 매도일: ${r.date}</div>
                </div>
                <div style="text-align: right;">
                  <div class="${r.realizedProfit >= 0 ? 'profit-text' : 'loss-text'}" style="font-weight: 700; font-family: var(--font-mono); font-size: 1.02rem;">
                    ${r.realizedProfit >= 0 ? '+' : ''}${CalculatorService.formatCurrency(r.realizedProfit, r.currency)}
                  </div>
                  <span class="${r.realizedProfit >= 0 ? 'profit-badge' : 'loss-badge'}" style="font-size: 0.72rem; padding: 0.1rem 0.4rem; margin-top: 0.15rem;">
                    ${CalculatorService.formatPercent(r.returnRate)}
                  </span>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; background: var(--bg-secondary); padding: 0.5rem 0.65rem; border-radius: var(--radius-sm); font-size: 0.76rem; color: var(--text-muted);">
                <div>수량: <strong style="color: var(--text-main); font-family: var(--font-mono);">${CalculatorService.formatNumber(r.quantity, r.currency === 'USD' ? 2 : 0)}주</strong></div>
                <div>평단가: <strong style="color: var(--text-main); font-family: var(--font-mono);">${CalculatorService.formatCurrency(r.avgBuyPrice, r.currency)}</strong></div>
                <div style="text-align: right;">매도가: <strong style="color: var(--text-main); font-family: var(--font-mono);">${CalculatorService.formatCurrency(r.sellPrice, r.currency)}</strong></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      container.querySelector('#select-analytics-period')?.addEventListener('change', e => {
        this.analyticsPeriod = e.target.value;
        this.render();
      });

      container.querySelector('#select-analytics-sort')?.addEventListener('change', e => {
        this.analyticsSort = e.target.value;
        this.render();
      });
    }

    // --- VIEW 5: SETTINGS ---
    renderSettings(container) {
      container.innerHTML = `
        <div style="margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;">환경 설정 및 데이터 관리</h2>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">테마, 환율 및 데이터 백업을 설정합니다.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.25rem; max-width: 650px;">
          <div class="card">
            <div class="card-header"><span class="card-title">🎨 테마 및 디스플레이 설정</span></div>
            <div class="form-group">
              <label class="form-label">테마 모드</label>
              <select id="setting-theme" class="form-select">
                <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>다크 모드 (Dark Theme)</option>
                <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>라이트 모드 (Light Theme)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">등락 색상 표기 방식</label>
              <select id="setting-color-style" class="form-select">
                <option value="global" ${this.settings.colorStyle === 'global' ? 'selected' : ''}>글로벌 표준 (초록: 상승 ▲ / 빨강: 하락 ▼)</option>
                <option value="korean" ${this.settings.colorStyle === 'korean' ? 'selected' : ''}>한국 주식 시장 (빨강: 상승 ▲ / 파랑: 하락 ▼)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">기본 USD/KRW 환율 (원)</label>
              <input type="number" id="setting-exchange-rate" class="form-input" value="${this.settings.exchangeRate || 1380}" step="0.5">
            </div>
            <button id="btn-save-settings" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">설정 저장</button>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title">💾 데이터 백업 및 엑셀 내보내기</span></div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">모든 데이터는 브라우저에 안전하게 저장됩니다.</p>
            <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
              <button id="btn-export-csv" class="btn btn-secondary btn-sm">📊 엑셀(CSV) 다운로드</button>
              <button id="btn-export-json" class="btn btn-secondary btn-sm">📦 백업(JSON) 다운로드</button>
            </div>
          </div>

          <div class="card" style="border-color: rgba(239, 68, 68, 0.3);">
            <div class="card-header"><span class="card-title" style="color: var(--color-loss);">⚠️ 데이터 초기화</span></div>
            <button id="btn-reset-data" class="btn btn-danger btn-sm">모든 데이터 초기화</button>
          </div>
        </div>
      `;

      container.querySelector('#btn-save-settings')?.addEventListener('click', () => {
        this.settings.theme = container.querySelector('#setting-theme').value;
        this.settings.colorStyle = container.querySelector('#setting-color-style').value;
        this.settings.exchangeRate = parseFloat(container.querySelector('#setting-exchange-rate').value) || 1380;
        StorageService.saveSettings(this.settings);
        this.applyTheme();
        this.render();
        this.showToast('설정이 저장되었습니다.', 'success');
      });

      container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
        try {
          ExportService.exportToCSV(this.transactions);
          this.showToast('엑셀(CSV) 파일이 다운로드되었습니다.', 'success');
        } catch (e) { this.showToast(e.message, 'error'); }
      });

      container.querySelector('#btn-export-json')?.addEventListener('click', () => {
        ExportService.exportToJSON({ transactions: this.transactions, settings: this.settings });
        this.showToast('JSON 백업 파일이 다운로드되었습니다.', 'success');
      });

      container.querySelector('#btn-reset-data')?.addEventListener('click', () => {
        if (confirm('모든 데이터를 삭제하시겠습니까?')) {
          StorageService.resetAllData();
          this.transactions = [];
          this.cachedQuotes = {};
          this.render();
          this.showToast('데이터가 초기화되었습니다.', 'info');
        }
      });
    }

    // --- MODALS ---
    openAddModal() {
      const modal = document.getElementById('app-modal');
      const body = document.getElementById('modal-body');
      document.getElementById('modal-title').textContent = '➕ 매수 / 매도 기록 추가';

      body.innerHTML = `
        <form id="form-add-tx">
          <div class="form-group">
            <label class="form-label">거래 유형</label>
            <select id="add-type" class="form-select" required>
              <option value="BUY">매수 (Buy)</option>
              <option value="SELL">매도 (Sell)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">시장 / 국가</label>
            <select id="add-market" class="form-select" required>
              <option value="US">미국 주식 (USD 달러)</option>
              <option value="KR">국내 주식 (KRW 원화)</option>
            </select>
          </div>
          <div class="form-group autocomplete-wrapper">
            <label class="form-label">종목코드 / 티커 (또는 종목명 검색)</label>
            <input type="text" id="add-ticker" class="form-input" placeholder="예: NVDA, AAPL, 삼성전자, 005930 입력..." autocomplete="off" required>
            <div id="ticker-autocomplete-dropdown" class="autocomplete-dropdown"></div>
          </div>
          <div class="form-group">
            <label class="form-label">종목명 (선택)</label>
            <input type="text" id="add-name" class="form-input" placeholder="예: 삼성전자 또는 Apple">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">수량 (주)</label>
              <input type="number" id="add-qty" class="form-input" step="any" placeholder="0" required>
            </div>
            <div class="form-group">
              <label class="form-label" id="label-add-price">매수 단가</label>
              <input type="number" id="add-price" class="form-input" step="any" placeholder="0" required>
            </div>
          </div>

          <!-- 매도 전용: 과거 매수 기준단가 (평단가) 입력 필드 -->
          <div id="add-buy-price-group" class="form-group" style="display: none; background: rgba(30, 41, 59, 0.4); padding: 0.75rem 0.9rem; border-radius: var(--radius-md); border: 1px dashed var(--border-subtle); margin-top: -0.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
              <label class="form-label" style="margin-bottom: 0; color: #60a5fa; font-weight: 600;">매수 기준 단가 (과거 매입 평단가)</label>
              <span style="font-size: 0.72rem; color: var(--text-dim);">손익 계산용</span>
            </div>
            <input type="number" id="add-buy-price" class="form-input" step="any" placeholder="예: 과거 매수했던 평단가 입력">
            <p style="font-size: 0.73rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.35;">
              💡 포트에 이미 없는 과거 매도 종목이라도 매수단가를 입력하시면 정확한 실현 손익 및 수익률이 자동 계산됩니다.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">수수료 / 세금</label>
              <input type="number" id="add-fee" class="form-input" step="any" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">거래일자</label>
              <input type="date" id="add-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">메모 (선택)</label>
            <input type="text" id="add-memo" class="form-input" placeholder="매매 사유 등">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.75rem;">기록 저장</button>
        </form>
      `;

      modal.classList.add('active');
      const form = body.querySelector('#form-add-tx');
      const typeSelect = form.querySelector('#add-type');
      const tickerInput = form.querySelector('#add-ticker');
      const nameInput = form.querySelector('#add-name');
      const marketSelect = form.querySelector('#add-market');
      const priceInput = form.querySelector('#add-price');
      const buyPriceGroup = form.querySelector('#add-buy-price-group');
      const buyPriceInput = form.querySelector('#add-buy-price');
      const labelPrice = form.querySelector('#label-add-price');
      const dropdown = form.querySelector('#ticker-autocomplete-dropdown');

      // Toggle UI for Buy vs Sell
      const updateTypeUI = () => {
        const isSell = typeSelect.value === 'SELL';
        if (isSell) {
          labelPrice.textContent = '매도 단가 (판매 가격)';
          buyPriceGroup.style.display = 'block';
        } else {
          labelPrice.textContent = '매수 단가 (구매 가격)';
          buyPriceGroup.style.display = 'none';
        }
      };
      typeSelect.addEventListener('change', updateTypeUI);
      updateTypeUI();

      // Autocomplete Search Wiring
      let debounceTimer = null;
      tickerInput.addEventListener('input', (e) => {
        const query = e.target.value;
        clearTimeout(debounceTimer);
        if (!query.trim()) {
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
          return;
        }

        debounceTimer = setTimeout(async () => {
          const results = await StockService.searchStocks(query);
          if (!results || results.length === 0) {
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
            return;
          }

          dropdown.innerHTML = results.map((item) => `
            <div class="autocomplete-item" data-symbol="${item.symbol}" data-name="${item.name}" data-market="${item.market}" data-currency="${item.currency}">
              <div class="autocomplete-item-left">
                <div class="autocomplete-ticker-line">
                  <span class="badge ${item.market === 'US' ? 'badge-us' : 'badge-kr'}">${item.market}</span>
                  <span class="autocomplete-ticker">${item.symbol}</span>
                </div>
                <div class="autocomplete-name">${item.name}</div>
              </div>
              <div class="autocomplete-meta">
                <span class="badge badge-secondary" style="font-size: 0.7rem;">${item.currency}</span>
              </div>
            </div>
          `).join('');

          dropdown.classList.add('active');

          dropdown.querySelectorAll('.autocomplete-item').forEach((row) => {
            row.addEventListener('click', async () => {
              const sym = row.dataset.symbol;
              const nm = row.dataset.name;
              const mkt = row.dataset.market;

              tickerInput.value = sym;
              nameInput.value = nm;
              marketSelect.value = mkt;
              dropdown.classList.remove('active');

              // If stock is in current portfolio, auto-fill buy price for reference
              const pData = this.getPortfolioData();
              const holding = pData.holdings.find(h => h.ticker === sym);
              if (holding && holding.avgPrice > 0) {
                buyPriceInput.value = holding.avgPrice;
              }

              // Automatically fetch live price & fill unit price input
              try {
                this.showToast(`[${nm}] 실시간 시세 조회 중...`, 'info');
                const quote = await StockService.fetchQuote(sym, mkt);
                if (quote?.price) {
                  priceInput.value = quote.price;
                  this.showToast(`[${sym}] 현재가(${CalculatorService.formatCurrency(quote.price, quote.currency)})가 입력되었습니다.`, 'success');
                }
              } catch (err) {}
            });
          });
        }, 120);
      });

      // Close dropdown on click outside
      const handleOutsideClick = (ev) => {
        if (dropdown && !dropdown.contains(ev.target) && ev.target !== tickerInput) {
          dropdown.classList.remove('active');
        }
      };
      document.addEventListener('click', handleOutsideClick);

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        document.removeEventListener('click', handleOutsideClick);
        const type = form.querySelector('#add-type').value;
        const market = form.querySelector('#add-market').value;
        const ticker = form.querySelector('#add-ticker').value.trim().toUpperCase();
        const buyPriceVal = parseFloat(form.querySelector('#add-buy-price')?.value);

        const newTx = StorageService.addTransaction({
          type,
          market,
          currency: market === 'US' ? 'USD' : 'KRW',
          ticker,
          name: form.querySelector('#add-name').value.trim() || ticker,
          quantity: parseFloat(form.querySelector('#add-qty').value) || 0,
          price: parseFloat(form.querySelector('#add-price').value) || 0,
          buyPrice: type === 'SELL' && !isNaN(buyPriceVal) && buyPriceVal > 0 ? buyPriceVal : null,
          fee: parseFloat(form.querySelector('#add-fee').value) || 0,
          date: form.querySelector('#add-date').value,
          memo: form.querySelector('#add-memo').value.trim()
        });

        this.transactions = StorageService.getTransactions();
        modal.classList.remove('active');
        this.showToast(`${newTx.name} 기록이 저장되었습니다.`, 'success');
        this.render();
        this.refreshQuotes(true);
      });
    }

    openSellStockModal(stock) {
      const modal = document.getElementById('app-modal');
      const body = document.getElementById('modal-body');
      document.getElementById('modal-title').textContent = `📉 [${stock.name || stock.ticker}] 주식 매도`;

      const maxQty = parseFloat(stock.quantity) || 0;
      const avgPrice = parseFloat(stock.avgPrice) || 0;
      const curPrice = parseFloat(stock.price) || avgPrice;

      body.innerHTML = `
        <form id="form-sell-stock">
          <!-- Stock Info Banner -->
          <div style="background: var(--bg-secondary); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1.15rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span class="badge ${stock.market === 'US' ? 'badge-us' : 'badge-kr'}">${stock.market}</span>
                <strong style="font-size: 1.05rem;">${stock.name}</strong>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem; font-family: var(--font-mono);">
                ${stock.ticker} · 평단가: ${CalculatorService.formatCurrency(avgPrice, stock.currency)}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.78rem; color: var(--text-muted);">보유 수량</div>
              <div style="font-size: 1.1rem; font-weight: 700; font-family: var(--font-mono); color: var(--color-accent);">${CalculatorService.formatNumber(maxQty, stock.market === 'US' ? 2 : 0)}주</div>
            </div>
          </div>

          <!-- Sell Quantity Input & Quick Ratio Buttons -->
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label class="form-label" style="margin-bottom: 0;">매도 수량 (주)</label>
              <div style="display: flex; gap: 0.3rem;">
                <button type="button" class="btn btn-secondary btn-sm btn-quick-qty" data-ratio="0.25" style="padding: 0.15rem 0.45rem; font-size: 0.72rem;">25%</button>
                <button type="button" class="btn btn-secondary btn-sm btn-quick-qty" data-ratio="0.5" style="padding: 0.15rem 0.45rem; font-size: 0.72rem;">50%</button>
                <button type="button" class="btn btn-secondary btn-sm btn-quick-qty" data-ratio="0.75" style="padding: 0.15rem 0.45rem; font-size: 0.72rem;">75%</button>
                <button type="button" class="btn btn-secondary btn-sm btn-quick-qty" data-ratio="1.0" style="padding: 0.15rem 0.45rem; font-size: 0.72rem; font-weight: 700; color: #f87171;">전량(100%)</button>
              </div>
            </div>
            <input type="number" id="sell-qty" class="form-input" value="${maxQty}" step="any" min="0.0001" max="${maxQty}" required>
          </div>

          <!-- Sell Price Input -->
          <div class="form-group">
            <label class="form-label">매도 단가 (${stock.currency})</label>
            <input type="number" id="sell-price" class="form-input" value="${curPrice}" step="any" min="0" required>
          </div>

          <!-- Fee & Date Inputs -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">매도 수수료 / 제세금</label>
              <input type="number" id="sell-fee" class="form-input" value="0" step="any" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">매도 일자</label>
              <input type="date" id="sell-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">메모 (선택)</label>
            <input type="text" id="sell-memo" class="form-input" placeholder="매도 사유 (예: 익절, 손절, 리밸런싱 등)">
          </div>

          <!-- Live Preview Card -->
          <div style="background: rgba(30, 41, 59, 0.6); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px dashed var(--border-subtle); margin: 1rem 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.35rem;">
              <span>총 매도 수령액 (예상):</span>
              <strong id="preview-total-proceeds" style="color: var(--text-main); font-family: var(--font-mono); font-size: 0.9rem;">0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600;">
              <span>예상 실현 손익 (수익률):</span>
              <span id="preview-realized-profit" style="font-family: var(--font-mono);">0</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; background: #ef4444; border-color: #ef4444; font-weight: 700; padding: 0.65rem;">
            📉 매도 확정 (포트폴리오 차감 & 매매일지 등록)
          </button>
        </form>
      `;

      modal.classList.add('active');
      const form = body.querySelector('#form-sell-stock');
      const qtyInput = form.querySelector('#sell-qty');
      const priceInput = form.querySelector('#sell-price');
      const feeInput = form.querySelector('#sell-fee');

      const updatePreview = () => {
        const q = parseFloat(qtyInput.value) || 0;
        const p = parseFloat(priceInput.value) || 0;
        const f = parseFloat(feeInput.value) || 0;

        const totalProceeds = (q * p) - f;
        const costBasis = q * avgPrice;
        const profit = totalProceeds - costBasis;
        const returnRate = costBasis > 0 ? (profit / costBasis) * 100 : 0;
        const isP = profit >= 0;

        form.querySelector('#preview-total-proceeds').textContent = CalculatorService.formatCurrency(totalProceeds, stock.currency);
        const profitEl = form.querySelector('#preview-realized-profit');
        profitEl.className = isP ? 'profit-text' : 'loss-text';
        profitEl.textContent = `${isP ? '+' : ''}${CalculatorService.formatCurrency(profit, stock.currency)} (${CalculatorService.formatPercent(returnRate)})`;
      };

      updatePreview();
      qtyInput.addEventListener('input', updatePreview);
      priceInput.addEventListener('input', updatePreview);
      feeInput.addEventListener('input', updatePreview);

      form.querySelectorAll('.btn-quick-qty').forEach((btn) => {
        btn.addEventListener('click', () => {
          const ratio = parseFloat(btn.dataset.ratio);
          const calculated = stock.market === 'US' ? Math.round(maxQty * ratio * 100) / 100 : Math.floor(maxQty * ratio);
          qtyInput.value = calculated;
          updatePreview();
        });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const sellQty = parseFloat(qtyInput.value);
        const sellPrice = parseFloat(priceInput.value);
        const fee = parseFloat(feeInput.value) || 0;
        const date = form.querySelector('#sell-date').value;
        const memo = form.querySelector('#sell-memo').value.trim();

        if (isNaN(sellQty) || sellQty <= 0) {
          alert('올바른 매도 수량을 입력해주세요.');
          return;
        }

        if (sellQty > maxQty) {
          alert(`보유 수량(${maxQty}주)을 초과하여 매도할 수 없습니다.`);
          return;
        }

        // Add SELL transaction
        StorageService.addTransaction({
          type: 'SELL',
          market: stock.market,
          currency: stock.currency,
          ticker: stock.ticker,
          name: stock.name,
          quantity: sellQty,
          price: sellPrice,
          fee,
          date,
          memo: memo || '포트폴리오 매도'
        });

        this.transactions = StorageService.getTransactions();
        modal.classList.remove('active');

        const profit = (sellQty * sellPrice - fee) - (sellQty * avgPrice);
        const isP = profit >= 0;
        this.showToast(`[${stock.name}] ${sellQty}주 매도 완료! (실현손익: ${isP ? '+' : ''}${CalculatorService.formatCurrency(profit, stock.currency)})`, 'success');
        this.render();
      });
    }

    openEditStockModal(stock) {
      const modal = document.getElementById('app-modal');
      const body = document.getElementById('modal-body');
      document.getElementById('modal-title').textContent = `⚙️ [${stock.name || stock.ticker}] 정보 수정`;

      body.innerHTML = `
        <form id="form-edit-stock">
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            보유 수량, 평균 매입단가(평단가), 현재가를 직접 수정하여 포트폴리오를 빠르게 보정할 수 있습니다.
          </p>
          <div class="form-group">
            <label class="form-label">보유 수량 (주)</label>
            <input type="number" id="edit-stock-qty" class="form-input" value="${stock.quantity}" step="any" min="0" required>
          </div>
          <div class="form-group">
            <label class="form-label">평균 매입단가 (평단가 / ${stock.currency})</label>
            <input type="number" id="edit-stock-avg" class="form-input" value="${stock.avgPrice}" step="any" min="0" required>
          </div>
          <div class="form-group">
            <label class="form-label">현재가 (${stock.currency})</label>
            <input type="number" id="edit-stock-cur-price" class="form-input" value="${stock.price}" step="any" min="0" required>
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1;">수정 내용 저장</button>
            <button type="button" id="btn-modal-delete-holding" class="btn btn-danger btn-sm" style="padding: 0 0.85rem;">🗑️ 종목 삭제</button>
          </div>
        </form>
      `;

      modal.classList.add('active');
      const form = body.querySelector('#form-edit-stock');

      body.querySelector('#btn-modal-delete-holding')?.addEventListener('click', () => {
        if (confirm(`[${stock.name || stock.ticker}] 종목을 포트폴리오에서 삭제하시겠습니까?`)) {
          StorageService.deleteHolding(stock.ticker);
          this.transactions = StorageService.getTransactions();
          modal.classList.remove('active');
          this.showToast(`[${stock.name || stock.ticker}] 종목이 삭제되었습니다.`, 'info');
          this.render();
        }
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newQty = parseFloat(form.querySelector('#edit-stock-qty').value);
        const newAvg = parseFloat(form.querySelector('#edit-stock-avg').value);
        const newPrice = parseFloat(form.querySelector('#edit-stock-cur-price').value);

        if (isNaN(newQty) || isNaN(newAvg) || isNaN(newPrice)) return;

        StorageService.adjustHolding(stock.ticker, newQty, newAvg, stock.name, stock.market, stock.currency);
        this.cachedQuotes[stock.ticker] = { ticker: stock.ticker, price: newPrice, changePercent: 0, currency: stock.currency };
        StorageService.saveCachedQuotes(this.cachedQuotes);

        this.transactions = StorageService.getTransactions();
        modal.classList.remove('active');
        this.showToast(`[${stock.name || stock.ticker}] 정보가 수정되었습니다.`, 'success');
        this.render();
      });
    }

    async refreshQuotes(silent = false) {
      if (!silent) this.showToast('시세 및 환율을 조회 중...', 'info');
      try {
        const rate = await StockService.fetchExchangeRate();
        if (rate) {
          this.settings.exchangeRate = rate;
          StorageService.saveSettings(this.settings);
        }

        const portfolio = this.getPortfolioData();
        const tickers = portfolio.holdings.map(h => ({ ticker: h.ticker, market: h.market }));
        if (tickers.length > 0) {
          const quotes = await StockService.refreshAllQuotes(tickers);
          this.cachedQuotes = { ...this.cachedQuotes, ...quotes };
          StorageService.saveCachedQuotes(this.cachedQuotes);
        }

        this.render();
        if (!silent) this.showToast('최신 시세가 갱신되었습니다.', 'success');
      } catch (e) {
        if (!silent) this.showToast('시세 갱신 실패', 'error');
      }
    }

    showToast(message, type = 'info') {
      let box = document.getElementById('toast-container');
      if (!box) {
        box = document.createElement('div');
        box.id = 'toast-container';
        box.className = 'toast-container';
        document.body.appendChild(box);
      }

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      box.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.25s';
        setTimeout(() => toast.remove(), 250);
      }, 2500);
    }
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new StockManagerApp());
  } else {
    new StockManagerApp();
  }
})();
