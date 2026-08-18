/**
 * Stock Asset Manager - Storage Service
 * LocalStorage + Cloud Sync (Supabase ready) + Default Sample Data
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'sam_transactions_v1',
  SETTINGS: 'sam_settings_v1',
  QUOTES: 'sam_quotes_v1'
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  colorStyle: 'global', // 'global' (Green Up) or 'korean' (Red Up)
  baseCurrency: 'KRW',
  exchangeRate: 1380,
  autoRefreshQuotes: true,
  supabaseUrl: '',
  supabaseKey: ''
};

const SAMPLE_TRANSACTIONS = [
  {
    id: 'tx_sample_1',
    date: '2024-01-15',
    type: 'BUY',
    ticker: '005930',
    name: '삼성전자',
    market: 'KR',
    currency: 'KRW',
    quantity: 50,
    price: 72000,
    fee: 1500,
    memo: '국내 대형주 적립식 매수'
  },
  {
    id: 'tx_sample_2',
    date: '2024-03-10',
    type: 'BUY',
    ticker: '005930',
    name: '삼성전자',
    market: 'KR',
    currency: 'KRW',
    quantity: 30,
    price: 74500,
    fee: 900,
    memo: '추가 매수'
  },
  {
    id: 'tx_sample_3',
    date: '2024-02-05',
    type: 'BUY',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    market: 'US',
    currency: 'USD',
    quantity: 15,
    price: 185.50,
    fee: 2.0,
    memo: '미국 테크 우량주'
  },
  {
    id: 'tx_sample_4',
    date: '2024-04-20',
    type: 'BUY',
    ticker: 'NVDA',
    name: 'NVIDIA Corp.',
    market: 'US',
    currency: 'USD',
    quantity: 20,
    price: 95.00,
    fee: 2.5,
    memo: 'AI 반도체 성장주'
  },
  {
    id: 'tx_sample_5',
    date: '2024-05-15',
    type: 'DIVIDEND',
    ticker: '005930',
    name: '삼성전자',
    market: 'KR',
    currency: 'KRW',
    quantity: 80,
    price: 361,
    amount: 28880,
    fee: 4440,
    memo: '1분기 분기 배당금 (세후)'
  },
  {
    id: 'tx_sample_6',
    date: '2024-06-10',
    type: 'SELL',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    market: 'US',
    currency: 'USD',
    quantity: 5,
    price: 215.00,
    fee: 1.5,
    memo: '일부 수익 실현'
  }
];

export const StorageService = {
  // --- Transactions ---
  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        // Initialize with realistic sample data
        this.saveTransactions(SAMPLE_TRANSACTIONS);
        return SAMPLE_TRANSACTIONS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load transactions:', e);
      return [];
    }
  },

  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      this.notifyChange();
    } catch (e) {
      console.error('Failed to save transactions:', e);
    }
  },

  addTransaction(tx) {
    const list = this.getTransactions();
    const newTx = {
      id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...tx
    };
    list.push(newTx);
    this.saveTransactions(list);
    return newTx;
  },

  updateTransaction(id, updatedTx) {
    const list = this.getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedTx };
      this.saveTransactions(list);
      return true;
    }
    return false;
  },

  deleteTransaction(id) {
    const list = this.getTransactions();
    const filtered = list.filter((t) => t.id !== id);
    this.saveTransactions(filtered);
  },

  deleteHolding(ticker) {
    const cleanTicker = ticker.trim().toUpperCase();
    const list = this.getTransactions().filter((t) => (t.ticker || '').trim().toUpperCase() !== cleanTicker);
    this.saveTransactions(list);
  },

  adjustHolding(ticker, newQty, newAvgPrice, name, market, currency) {
    const cleanTicker = ticker.trim().toUpperCase();
    const list = this.getTransactions().filter((t) => (t.ticker || '').trim().toUpperCase() !== cleanTicker);
    
    if (newQty > 0) {
      list.push({
        id: `tx_adj_${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: 'BUY',
        ticker: cleanTicker,
        name: name || cleanTicker,
        market: market || (currency === 'USD' ? 'US' : 'KR'),
        currency: currency || (market === 'US' ? 'USD' : 'KRW'),
        quantity: newQty,
        price: newAvgPrice,
        fee: 0,
        memo: '보유 수량 및 평단가 수동 조정'
      });
    }
    this.saveTransactions(list);
  },

  // --- Settings ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  // --- Cached Quotes ---
  getCachedQuotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUOTES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  saveCachedQuotes(quotes) {
    try {
      const current = this.getCachedQuotes();
      const merged = { ...current, ...quotes };
      localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed to cache quotes:', e);
    }
  },

  // --- Reset & Sync Handlers ---
  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.QUOTES);
    this.notifyChange();
  },

  listeners: [],
  subscribe(callback) {
    this.listeners.push(callback);
  },
  notifyChange() {
    this.listeners.forEach((cb) => cb());
  }
};
