/**
 * Stock Asset Manager - Transactions View Component
 * Trade Log (Buy / Sell), Year / Month Period Filtering, Sorting, Search, Delete
 */

import { CalculatorService } from '../services/calculatorService.js';

export const TransactionsView = {
  typeFilter: 'ALL',
  periodFilter: 'ALL',
  sortOption: 'date_desc',
  searchTerm: '',

  render(container, { transactions, settings, onOpenAddModal, onDeleteTx }) {
    // 1. Collect unique years and months from transactions
    const yearsSet = new Set();
    const monthsSet = new Set();
    transactions.forEach((t) => {
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
    let list = [...transactions];

    if (this.typeFilter !== 'ALL') {
      list = list.filter((t) => t.type === this.typeFilter);
    }

    if (this.periodFilter && this.periodFilter !== 'ALL') {
      if (this.periodFilter.startsWith('Y_')) {
        const year = this.periodFilter.replace('Y_', '');
        list = list.filter((t) => t.date && t.date.startsWith(year));
      } else if (this.periodFilter.startsWith('M_')) {
        const ym = this.periodFilter.replace('M_', '');
        list = list.filter((t) => t.date && t.date.startsWith(ym));
      }
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      list = list.filter((t) => 
        (t.name && t.name.toLowerCase().includes(term)) ||
        (t.ticker && t.ticker.toLowerCase().includes(term)) ||
        (t.memo && t.memo.toLowerCase().includes(term))
      );
    }

    // 3. Sort list
    const rate = settings.exchangeRate || 1380;
    list.sort((a, b) => {
      if (this.sortOption === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (this.sortOption === 'amount_desc') {
        const totA = (a.quantity * a.price) * (a.currency === 'USD' ? rate : 1);
        const totB = (b.quantity * b.price) * (b.currency === 'USD' ? rate : 1);
        return totB - totA;
      }
      if (this.sortOption === 'amount_asc') {
        const totA = (a.quantity * a.price) * (a.currency === 'USD' ? rate : 1);
        const totB = (b.quantity * b.price) * (b.currency === 'USD' ? rate : 1);
        return totA - totB;
      }
      if (this.sortOption === 'name_asc') {
        return (a.name || a.ticker).localeCompare(b.name || b.ticker, 'ko');
      }
      return new Date(b.date) - new Date(a.date); // default: date_desc
    });

    // 4. Calculate summary totals
    let buyTotalKRW = 0, buyTotalUSD = 0;
    let sellTotalKRW = 0, sellTotalUSD = 0;
    list.forEach((tx) => {
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
          <button id="btn-tx-add" class="btn btn-primary btn-sm">
            <span>➕</span> 기록 추가
          </button>
        </div>

        <!-- Filter & Search Controls -->
        <div style="display: flex; flex-direction: column; gap: 0.55rem; background: var(--bg-card); padding: 0.65rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="display: flex; gap: 0.35rem; width: 100%;">
            <button class="btn btn-sm ${this.typeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}" data-type="ALL" style="flex: 1; padding: 0.35rem 0.2rem; font-size: 0.8rem;">전체 (${transactions.length})</button>
            <button class="btn btn-sm ${this.typeFilter === 'BUY' ? 'btn-primary' : 'btn-secondary'}" data-type="BUY" style="flex: 1; padding: 0.35rem 0.2rem; font-size: 0.8rem;">매수 (${transactions.filter(t => t.type === 'BUY').length})</button>
            <button class="btn btn-sm ${this.typeFilter === 'SELL' ? 'btn-primary' : 'btn-secondary'}" data-type="SELL" style="flex: 1; padding: 0.35rem 0.2rem; font-size: 0.8rem;">매도 (${transactions.filter(t => t.type === 'SELL').length})</button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; width: 100%;">
            <select id="select-tx-period" class="form-select" style="padding: 0.32rem 0.5rem; font-size: 0.8rem; width: 100%;">
              <option value="ALL" ${this.periodFilter === 'ALL' ? 'selected' : ''}>📅 전체 기간</option>
              ${sortedYears.length > 0 ? `
                <optgroup label="── 🗓️ 연도별 ──">
                  ${sortedYears.map(y => `<option value="Y_${y}" ${this.periodFilter === `Y_${y}` ? 'selected' : ''}>${y}년 전체</option>`).join('')}
                </optgroup>
              ` : ''}
              ${sortedMonths.length > 0 ? `
                <optgroup label="── 📆 년도 + 월별 ──">
                  ${sortedMonths.map(m => {
                    const [yr, mo] = m.split('-');
                    return `<option value="M_${m}" ${this.periodFilter === `M_${m}` ? 'selected' : ''}>${yr}년 ${mo}월</option>`;
                  }).join('')}
                </optgroup>
              ` : ''}
            </select>

            <select id="select-tx-sort" class="form-select" style="padding: 0.32rem 0.5rem; font-size: 0.8rem; width: 100%;">
              <option value="date_desc" ${this.sortOption === 'date_desc' ? 'selected' : ''}>최신순 (날짜 ↓)</option>
              <option value="date_asc" ${this.sortOption === 'date_asc' ? 'selected' : ''}>과거순 (날짜 ↑)</option>
              <option value="amount_desc" ${this.sortOption === 'amount_desc' ? 'selected' : ''}>거래금액 큰순 ↓</option>
              <option value="amount_asc" ${this.sortOption === 'amount_asc' ? 'selected' : ''}>거래금액 작은순 ↑</option>
              <option value="name_asc" ${this.sortOption === 'name_asc' ? 'selected' : ''}>종목명순</option>
            </select>
          </div>

          <div style="width: 100%;">
            <input type="text" id="tx-search-input" class="form-input" placeholder="🔍 종목명, 티커, 매매 메모 검색..." value="${this.searchTerm}" style="padding: 0.35rem 0.65rem; font-size: 0.82rem; width: 100%;">
          </div>
        </div>

        <!-- Period Summary Chip Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-muted); padding: 0.4rem 0.6rem; background: var(--bg-secondary); border-radius: var(--radius-sm); flex-wrap: wrap; gap: 0.4rem;">
          <div>
            조회: <strong style="color: var(--text-main);">${list.length}건</strong>
            ${this.periodFilter !== 'ALL' ? `<span class="badge" style="margin-left: 0.25rem; font-size: 0.7rem; background: var(--bg-card);">${this.periodFilter.startsWith('Y_') ? `${this.periodFilter.replace('Y_', '')}년` : `${this.periodFilter.replace('M_', '').replace('-', '년 ')}월`}</span>` : ''}
          </div>
          <div style="display: flex; gap: 0.65rem; font-size: 0.76rem;">
            <span>매수: <strong style="color: #60a5fa; font-family: var(--font-mono);">${buySummaryText}</strong></span>
            <span>매도: <strong style="color: #f87171; font-family: var(--font-mono);">${sellSummaryText}</strong></span>
          </div>
        </div>
      </div>

      <!-- Transaction List -->
      <div style="display: flex; flex-direction: column; gap: 0.55rem;">
        ${list.length === 0 ? '<div class="card" style="text-align: center; color: var(--text-dim); padding: 2.5rem;">해당 조건의 거래 내역이 없습니다.</div>' : ''}
        ${list.map((tx) => {
          let typeBadge = tx.type === 'BUY' 
            ? '<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 0.18rem 0.45rem; font-size: 0.75rem; white-space: nowrap; flex-shrink: 0; min-width: 36px; text-align: center; display: inline-flex; justify-content: center;">매수</span>'
            : '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 0.18rem 0.45rem; font-size: 0.75rem; white-space: nowrap; flex-shrink: 0; min-width: 36px; text-align: center; display: inline-flex; justify-content: center;">매도</span>';
          const tot = (tx.quantity * tx.price) + (tx.type === 'BUY' ? (tx.fee || 0) : -(tx.fee || 0));

          return `
            <div class="card" style="padding: 0.75rem 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
              <!-- Line 1: Badge + Name/Ticker --- Amount + Delete -->
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4rem;">
                <div style="display: flex; align-items: center; gap: 0.4rem; min-width: 0; flex: 1;">
                  ${typeBadge}
                  <strong style="font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;">${tx.name || tx.ticker}</strong>
                  <span style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono); flex-shrink: 0;">${tx.ticker}</span>
                </div>

                <div style="display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0;">
                  <span style="font-size: 0.92rem; font-weight: 700; font-family: var(--font-mono); color: ${tx.type === 'BUY' ? '#60a5fa' : '#f87171'};">
                    ${tx.type === 'BUY' ? '-' : '+'}${CalculatorService.formatCurrency(tot, tx.currency)}
                  </span>
                  <button class="btn-icon btn-delete-tx" data-id="${tx.id}" title="삭제" style="padding: 0.25rem 0.4rem; font-size: 0.75rem; border-radius: var(--radius-sm); color: var(--text-dim);">
                    🗑️
                  </button>
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

    // Event listeners
    container.querySelector('#btn-tx-add')?.addEventListener('click', onOpenAddModal);

    container.querySelectorAll('[data-type]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.typeFilter = e.currentTarget.dataset.type;
        this.render(container, { transactions, settings, onOpenAddModal, onDeleteTx });
      });
    });

    container.querySelector('#select-tx-period')?.addEventListener('change', (e) => {
      this.periodFilter = e.target.value;
      this.render(container, { transactions, settings, onOpenAddModal, onDeleteTx });
    });

    container.querySelector('#select-tx-sort')?.addEventListener('change', (e) => {
      this.sortOption = e.target.value;
      this.render(container, { transactions, settings, onOpenAddModal, onDeleteTx });
    });

    const searchInput = container.querySelector('#tx-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.render(container, { transactions, settings, onOpenAddModal, onDeleteTx });
      });
    }

    container.querySelectorAll('.btn-delete-tx').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('정말로 이 기록을 삭제하시겠습니까?')) {
          onDeleteTx(id);
        }
      });
    });
  }
};
