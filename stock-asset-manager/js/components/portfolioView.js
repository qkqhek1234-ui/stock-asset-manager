/**
 * Stock Asset Manager - Portfolio View Component
 * Holdings Table (Desktop) & Cards (Mobile), Market Filters, Sorters, Edit & Delete
 */

import { CalculatorService } from '../services/calculatorService.js';

export const PortfolioView = {
  activeFilter: 'ALL', // 'ALL', 'KR', 'US'
  sortBy: 'weight',     // 'weight', 'profit', 'returnRate', 'name'

  render(container, { portfolioData, settings, onSellStock, onEditStock, onDeleteHolding, onOpenAddModal }) {
    const { holdings, summary } = portfolioData;

    // Filter holdings
    let filtered = holdings.filter((h) => {
      if (this.activeFilter === 'KR') return h.market === 'KR';
      if (this.activeFilter === 'US') return h.market === 'US';
      return true;
    });

    // Sort holdings
    filtered.sort((a, b) => {
      if (this.sortBy === 'profit') return b.profitKRW - a.profitKRW;
      if (this.sortBy === 'returnRate') return b.returnRate - a.returnRate;
      if (this.sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
      return b.weightPercent - a.weightPercent;
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;">보유 종목 포트폴리오</h2>
          <button id="btn-portfolio-add" class="btn btn-primary btn-sm">
            <span>➕</span> 매수/매도 기록
          </button>
        </div>

        <!-- Filter & Sort Controls Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; background: var(--bg-card); padding: 0.6rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-sm ${this.activeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}" data-filter="ALL">전체 (${holdings.length})</button>
            <button class="btn btn-sm ${this.activeFilter === 'KR' ? 'btn-primary' : 'btn-secondary'}" data-filter="KR">국내 (${holdings.filter(h => h.market === 'KR').length})</button>
            <button class="btn btn-sm ${this.activeFilter === 'US' ? 'btn-primary' : 'btn-secondary'}" data-filter="US">미국 (${holdings.filter(h => h.market === 'US').length})</button>
          </div>

          <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--text-muted);">
            <span>정렬:</span>
            <select id="select-sort" class="form-select" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">
              <option value="weight" ${this.sortBy === 'weight' ? 'selected' : ''}>자산 비중순</option>
              <option value="profit" ${this.sortBy === 'profit' ? 'selected' : ''}>평가손익순</option>
              <option value="returnRate" ${this.sortBy === 'returnRate' ? 'selected' : ''}>수익률순</option>
              <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>종목명순</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Desktop Table View (>= 768px) -->
      <div class="desktop-only-table card table-responsive" style="padding: 0;">
        <table class="stock-table">
          <thead>
            <tr>
              <th>종목 / 티커</th>
              <th class="text-right">보유수량</th>
              <th class="text-right">평균단가</th>
              <th class="text-right">현재가 (등락)</th>
              <th class="text-right">평가금액</th>
              <th class="text-right">평가손익 (수익률)</th>
              <th class="text-right">비중</th>
              <th class="text-right" style="min-width: 140px;">관리</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-dim);">해당 조건의 종목이 없습니다.</td></tr>' : ''}
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
                      <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 0.15rem;">
                        ${h.ticker}
                      </div>
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">
                      ${CalculatorService.formatNumber(h.quantity, h.market === 'US' ? 2 : 0)}주
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono);">
                      ${CalculatorService.formatCurrency(h.avgPrice, h.currency)}
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono);">
                      <div style="font-weight: 600;">${CalculatorService.formatCurrency(h.currentPrice, h.currency)}</div>
                      <div style="font-size: 0.76rem; font-weight: 600;" class="${isDayP ? 'profit-text' : 'loss-text'}">
                        ${daySign}${change.toFixed(2)}% ${isDayP ? '▲' : '▼'}
                      </div>
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono); font-weight: 700;">
                      ${CalculatorService.formatCurrency(h.marketValueKRW, 'KRW')}
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono);">
                      <div class="${isP ? 'profit-text' : 'loss-text'}" style="font-weight: 700;">
                        ${isP ? '+' : ''}${CalculatorService.formatCurrency(h.profitKRW, 'KRW')}
                      </div>
                      <div class="${isP ? 'profit-badge' : 'loss-badge'}" style="font-size: 0.72rem; margin-top: 0.15rem;">
                        ${CalculatorService.formatPercent(h.returnRate)}
                      </div>
                    </td>
                    <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">
                      ${h.weightPercent.toFixed(1)}%
                    </td>
                    <td class="text-right">
                      <div style="display: flex; justify-content: flex-end; gap: 0.35rem;">
                        <button class="btn btn-sm btn-sell-stock" 
                          style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600;"
                          data-ticker="${h.ticker}" 
                          data-price="${h.currentPrice}" 
                          data-name="${h.name}" 
                          data-qty="${h.quantity}" 
                          data-avg="${h.avgPrice}" 
                          data-currency="${h.currency}" 
                          data-market="${h.market}">
                          📉 매도
                        </button>
                        <button class="btn btn-secondary btn-sm btn-edit-stock" 
                          data-ticker="${h.ticker}" 
                          data-price="${h.currentPrice}" 
                          data-name="${h.name}" 
                          data-qty="${h.quantity}" 
                          data-avg="${h.avgPrice}" 
                          data-currency="${h.currency}" 
                          data-market="${h.market}">
                          ✏️ 수정
                        </button>
                        <button class="btn btn-danger btn-sm btn-del-stock" 
                          data-ticker="${h.ticker}" 
                          data-name="${h.name}">
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

      <!-- Mobile Cards View (< 768px, Galaxy S26 Ultra 등) -->
      <div class="mobile-only-cards mobile-stock-list" style="display: none; flex-direction: column; gap: 0.65rem;">
        ${filtered.length === 0 ? '<div class="card" style="text-align: center; padding: 2rem; color: var(--text-dim);">해당 조건의 종목이 없습니다.</div>' : ''}
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
                  data-ticker="${h.ticker}" 
                  data-price="${h.currentPrice}" 
                  data-name="${h.name}" 
                  data-qty="${h.quantity}" 
                  data-avg="${h.avgPrice}" 
                  data-currency="${h.currency}" 
                  data-market="${h.market}">
                  📉 매도
                </button>
                <button class="btn btn-secondary btn-sm btn-edit-stock" 
                  style="padding: 0.45rem 0.4rem; font-size: 0.8rem;"
                  data-ticker="${h.ticker}" 
                  data-price="${h.currentPrice}" 
                  data-name="${h.name}" 
                  data-qty="${h.quantity}" 
                  data-avg="${h.avgPrice}" 
                  data-currency="${h.currency}" 
                  data-market="${h.market}">
                  ✏️ 수정
                </button>
                <button class="btn btn-danger btn-sm btn-del-stock" 
                  style="padding: 0.45rem 0.4rem; font-size: 0.8rem;"
                  data-ticker="${h.ticker}" 
                  data-name="${h.name}">
                  🗑️ 삭제
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Event listeners
    container.querySelector('#btn-portfolio-add')?.addEventListener('click', onOpenAddModal);

    container.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.activeFilter = e.currentTarget.dataset.filter;
        this.render(container, { portfolioData, settings, onSellStock, onEditStock, onDeleteHolding, onOpenAddModal });
      });
    });

    container.querySelector('#select-sort')?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.render(container, { portfolioData, settings, onSellStock, onEditStock, onDeleteHolding, onOpenAddModal });
    });

    // Sell stock handler
    container.querySelectorAll('.btn-sell-stock').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { ticker, price, name, qty, avg, currency, market } = e.currentTarget.dataset;
        if (onSellStock) {
          onSellStock({
            ticker,
            name,
            price: parseFloat(price),
            quantity: parseFloat(qty),
            avgPrice: parseFloat(avg),
            currency,
            market
          });
        }
      });
    });

    // Edit stock handler
    container.querySelectorAll('.btn-edit-stock').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { ticker, price, name, qty, avg, currency, market } = e.currentTarget.dataset;
        onEditStock({
          ticker,
          name,
          price: parseFloat(price),
          quantity: parseFloat(qty),
          avgPrice: parseFloat(avg),
          currency,
          market
        });
      });
    });

    // Delete holding handler
    container.querySelectorAll('.btn-del-stock').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { ticker, name } = e.currentTarget.dataset;
        if (confirm(`[${name || ticker}] 종목을 포트폴리오에서 삭제하시겠습니까?\n(해당 종목의 거래 기록이 모두 정리됩니다)`)) {
          onDeleteHolding(ticker);
        }
      });
    });
  }
};
