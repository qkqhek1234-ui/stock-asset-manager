/**
 * Stock Asset Manager - Main Application Orchestrator (Lightweight Core)
 * Coordinates Views, Modals, State, Theme, and Background Price Refreshing.
 */

import { StorageService } from './services/storageService.js';
import { CalculatorService } from './services/calculatorService.js';
import { StockService } from './services/stockService.js';

import { DashboardView } from './components/dashboardView.js';
import { PortfolioView } from './components/portfolioView.js';
import { TransactionsView } from './components/transactionsView.js';
import { AnalyticsView } from './components/analyticsView.js';
import { SettingsView } from './components/settingsView.js';

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.transactions = StorageService.getTransactions();
    this.settings = StorageService.getSettings();
    this.cachedQuotes = StorageService.getCachedQuotes();
    this.isRefreshing = false;

    this.init();
  }

  init() {
    this.applyTheme();
    this.setupNavigation();
    this.setupModals();
    this.registerServiceWorker();
    this.render();

    // Auto-refresh quotes on app launch
    if (this.settings.autoRefreshQuotes !== false) {
      setTimeout(() => this.refreshQuotes(true), 600);
    }
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.settings.theme || 'dark');
    document.documentElement.setAttribute('data-color-style', this.settings.colorStyle || 'global');
  }

  getPortfolioData() {
    return CalculatorService.computePortfolio(
      this.transactions,
      this.cachedQuotes,
      this.settings.exchangeRate || 1380
    );
  }

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  render() {
    const mainContainer = document.getElementById('view-content');
    if (!mainContainer) return;

    const portfolioData = this.getPortfolioData();

    switch (this.currentView) {
      case 'dashboard':
        DashboardView.render(mainContainer, {
          portfolioData,
          settings: this.settings,
          onRefreshQuotes: () => this.refreshQuotes(),
          onOpenAddModal: () => this.openAddModal()
        });
        break;

      case 'portfolio':
        PortfolioView.render(mainContainer, {
          portfolioData,
          settings: this.settings,
          onEditPrice: (stock) => this.openEditPriceModal(stock),
          onOpenAddModal: () => this.openAddModal()
        });
        break;

      case 'transactions':
        TransactionsView.render(mainContainer, {
          transactions: this.transactions,
          settings: this.settings,
          onOpenAddModal: () => this.openAddModal(),
          onDeleteTx: (id) => this.deleteTransaction(id)
        });
        break;

      case 'analytics':
        AnalyticsView.render(mainContainer, {
          portfolioData,
          settings: this.settings
        });
        break;

      case 'settings':
        SettingsView.render(mainContainer, {
          settings: this.settings,
          transactions: this.transactions,
          onSaveSettings: (newSettings) => this.saveSettings(newSettings),
          onImportData: (importedData) => this.importData(importedData),
          onResetData: () => this.resetData(),
          showToast: (msg, type) => this.showToast(msg, type)
        });
        break;
    }
  }

  // --- Quote Fetching ---
  async refreshQuotes(silent = false) {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    if (!silent) this.showToast('최신 시세 및 환율을 불러오는 중...', 'info');

    try {
      // 1. Fetch exchange rate
      const newRate = await StockService.fetchExchangeRate();
      if (newRate) {
        this.settings.exchangeRate = newRate;
        StorageService.saveSettings(this.settings);
      }

      // 2. Fetch stock quotes
      const portfolio = this.getPortfolioData();
      const tickersToFetch = portfolio.holdings.map((h) => ({ ticker: h.ticker, market: h.market }));

      if (tickersToFetch.length > 0) {
        const quotes = await StockService.refreshAllQuotes(tickersToFetch);
        this.cachedQuotes = { ...this.cachedQuotes, ...quotes };
        StorageService.saveCachedQuotes(this.cachedQuotes);
      }

      this.render();
      if (!silent) this.showToast('시세 조회가 완료되었습니다.', 'success');
    } catch (e) {
      console.error(e);
      if (!silent) this.showToast('일부 시세를 불러오지 못했습니다.', 'error');
    } finally {
      this.isRefreshing = false;
    }
  }

  // --- Transactions & Settings Actions ---
  addTransaction(txData) {
    const newTx = StorageService.addTransaction(txData);
    this.transactions = StorageService.getTransactions();
    this.showToast(`${newTx.name || newTx.ticker} 기록이 추가되었습니다.`, 'success');
    this.render();
    this.refreshQuotes(true);
  }

  deleteTransaction(id) {
    StorageService.deleteTransaction(id);
    this.transactions = StorageService.getTransactions();
    this.showToast('거래 기록이 삭제되었습니다.', 'info');
    this.render();
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    StorageService.saveSettings(this.settings);
    this.applyTheme();
    this.render();
  }

  importData(data) {
    if (data.transactions) {
      this.transactions = data.transactions;
      StorageService.saveTransactions(this.transactions);
    }
    if (data.settings) {
      this.settings = { ...this.settings, ...data.settings };
      StorageService.saveSettings(this.settings);
      this.applyTheme();
    }
    this.render();
  }

  resetData() {
    StorageService.resetAllData();
    this.transactions = [];
    this.cachedQuotes = {};
    this.render();
  }

  // --- Modals Management ---
  setupModals() {
    const modalOverlay = document.getElementById('app-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    modalCloseBtn?.addEventListener('click', () => {
      modalOverlay.classList.remove('active');
    });

    modalOverlay?.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }

  openAddModal() {
    const modalOverlay = document.getElementById('app-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    modalTitle.textContent = '➕ 매매 / 배당 기록 추가';
    modalBody.innerHTML = `
      <form id="form-add-tx">
        <div class="form-group">
          <label class="form-label">거래 유형</label>
          <select id="add-type" class="form-select" required>
            <option value="BUY">매수 (Buy)</option>
            <option value="SELL">매도 (Sell)</option>
            <option value="DIVIDEND">배당금 (Dividend)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">시장 / 국가</label>
          <select id="add-market" class="form-select" required>
            <option value="KR">국내 주식 (KRW 원화)</option>
            <option value="US">미국 주식 (USD 달러)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">종목코드 / 티커</label>
          <input type="text" id="add-ticker" class="form-input" placeholder="예: 005930 또는 AAPL" required>
        </div>

        <div class="form-group">
          <label class="form-label">종목명 (선택)</label>
          <input type="text" id="add-name" class="form-input" placeholder="예: 삼성전자 또는 Apple">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label" id="label-qty">수량 (주)</label>
            <input type="number" id="add-qty" class="form-input" step="any" placeholder="0" required>
          </div>
          <div class="form-group">
            <label class="form-label" id="label-price">단가 / 배당금</label>
            <input type="number" id="add-price" class="form-input" step="any" placeholder="0" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">수수료 / 제세금</label>
            <input type="number" id="add-fee" class="form-input" step="any" value="0">
          </div>
          <div class="form-group">
            <label class="form-label">거래일자</label>
            <input type="date" id="add-date" class="form-input" value="${new Date().toISOString().slice(0, 10)}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">메모 (선택)</label>
          <input type="text" id="add-memo" class="form-input" placeholder="매매 사유, 목표가 등">
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.75rem;">
          기록 저장
        </button>
      </form>
    `;

    modalOverlay.classList.add('active');

    // Handle form submit
    const form = modalBody.querySelector('#form-add-tx');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = form.querySelector('#add-type').value;
      const market = form.querySelector('#add-market').value;
      const ticker = form.querySelector('#add-ticker').value.trim().toUpperCase();
      const name = form.querySelector('#add-name').value.trim() || ticker;
      const quantity = parseFloat(form.querySelector('#add-qty').value) || 0;
      const price = parseFloat(form.querySelector('#add-price').value) || 0;
      const fee = parseFloat(form.querySelector('#add-fee').value) || 0;
      const date = form.querySelector('#add-date').value;
      const memo = form.querySelector('#add-memo').value.trim();
      const currency = market === 'US' ? 'USD' : 'KRW';

      this.addTransaction({
        type,
        market,
        currency,
        ticker,
        name,
        quantity,
        price,
        fee,
        date,
        memo
      });

      modalOverlay.classList.remove('active');
    });
  }

  openEditPriceModal(stock) {
    const modalOverlay = document.getElementById('app-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    modalTitle.textContent = `✏️ 현재가 직접 수정 (${stock.name})`;
    modalBody.innerHTML = `
      <form id="form-edit-price">
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
          [${stock.ticker}]의 현재가를 수동으로 지정합니다. 비상장 주식이나 시세 조회가 어려운 종목에 유용합니다.
        </p>

        <div class="form-group">
          <label class="form-label">현재가 (${stock.currency})</label>
          <input type="number" id="edit-stock-price" class="form-input" value="${stock.price}" step="any" required>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
          수정 완료
        </button>
      </form>
    `;

    modalOverlay.classList.add('active');

    const form = modalBody.querySelector('#form-edit-price');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const newPrice = parseFloat(form.querySelector('#edit-stock-price').value);
      if (!isNaN(newPrice) && newPrice > 0) {
        this.cachedQuotes[stock.ticker] = {
          ticker: stock.ticker,
          price: newPrice,
          changePercent: 0,
          currency: stock.currency,
          lastUpdated: new Date().toISOString()
        };
        StorageService.saveCachedQuotes(this.cachedQuotes);
        this.showToast(`${stock.name} 현재가가 수정되었습니다.`, 'success');
        this.render();
        modalOverlay.classList.remove('active');
      }
    });
  }

  // --- Toast Notifications ---
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // --- PWA Service Worker ---
  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(() => console.log('PWA Service Worker registered'))
        .catch((err) => console.log('Service Worker registration skipped:', err));
    }
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.stockApp = new App();
});
