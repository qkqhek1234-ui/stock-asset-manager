/**
 * Stock Asset Manager - Analytics View Component
 * Realized Profit/Loss Breakdown with Year / Month Period Filtering & Sorting
 */

import { CalculatorService } from '../services/calculatorService.js';

export const AnalyticsView = {
  periodFilter: 'ALL',
  sortOption: 'date_desc',

  render(container, { portfolioData, settings }) {
    const { summary, realizedPnLList } = portfolioData;

    // 1. Collect unique years and months
    const yearsSet = new Set();
    const monthsSet = new Set();
    realizedPnLList.forEach((r) => {
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
    if (this.periodFilter && this.periodFilter !== 'ALL') {
      if (this.periodFilter.startsWith('Y_')) {
        const year = this.periodFilter.replace('Y_', '');
        list = list.filter((r) => r.date && r.date.startsWith(year));
      } else if (this.periodFilter.startsWith('M_')) {
        const ym = this.periodFilter.replace('M_', '');
        list = list.filter((r) => r.date && r.date.startsWith(ym));
      }
    }

    // 3. Sort list
    const rate = summary.exchangeRate || 1380;
    list.sort((a, b) => {
      if (this.sortOption === 'date_asc') return new Date(a.date) - new Date(b.date);
      if (this.sortOption === 'profit_desc') {
        const aProf = a.realizedProfit * (a.currency === 'USD' ? rate : 1);
        const bProf = b.realizedProfit * (b.currency === 'USD' ? rate : 1);
        return bProf - aProf;
      }
      if (this.sortOption === 'profit_asc') {
        const aProf = a.realizedProfit * (a.currency === 'USD' ? rate : 1);
        const bProf = b.realizedProfit * (b.currency === 'USD' ? rate : 1);
        return aProf - bProf;
      }
      if (this.sortOption === 'return_desc') return b.returnRate - a.returnRate;
      if (this.sortOption === 'return_asc') return a.returnRate - b.returnRate;
      if (this.sortOption === 'name_asc') return (a.name || a.ticker).localeCompare(b.name || b.ticker, 'ko');
      return new Date(b.date) - new Date(a.date); // default: date_desc
    });

    // 4. Calculate period-specific profit & counts
    let periodProfitKRW = 0;
    let winCount = 0;
    let lossCount = 0;

    list.forEach((r) => {
      const pKRW = r.realizedProfit * (r.currency === 'USD' ? rate : 1);
      periodProfitKRW += pKRW;
      if (r.realizedProfit > 0) winCount++;
      else if (r.realizedProfit < 0) lossCount++;
    });
    const periodProfitUSD = rate > 0 ? periodProfitKRW / rate : 0;

    const isProfitKRW = periodProfitKRW >= 0;
    const isProfitUSD = periodProfitUSD >= 0;

    const periodLabel = this.periodFilter === 'ALL' 
      ? '전체 기간' 
      : (this.periodFilter.startsWith('Y_') ? `${this.periodFilter.replace('Y_', '')}년` : `${this.periodFilter.replace('M_', '').replace('-', '년 ')}월`);

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
          </div>

          <!-- Sorting Option -->
          <div style="display: flex; align-items: center; gap: 0.3rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">정렬:</span>
            <select id="select-analytics-sort" class="form-select" style="padding: 0.32rem 0.65rem; font-size: 0.8rem;">
              <option value="date_desc" ${this.sortOption === 'date_desc' ? 'selected' : ''}>최신순 (날짜 ↓)</option>
              <option value="date_asc" ${this.sortOption === 'date_asc' ? 'selected' : ''}>과거순 (날짜 ↑)</option>
              <option value="profit_desc" ${this.sortOption === 'profit_desc' ? 'selected' : ''}>수익금 큰순 ↓</option>
              <option value="profit_asc" ${this.sortOption === 'profit_asc' ? 'selected' : ''}>손실 큰순 ↑</option>
              <option value="return_desc" ${this.sortOption === 'return_desc' ? 'selected' : ''}>수익률 높은순 ↓</option>
              <option value="return_asc" ${this.sortOption === 'return_asc' ? 'selected' : ''}>수익률 낮은순 ↑</option>
              <option value="name_asc" ${this.sortOption === 'name_asc' ? 'selected' : ''}>종목명순</option>
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

      <!-- Table of Filtered Realized PnL Transactions -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
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
              ${list.map((r) => `
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
    `;

    container.querySelector('#select-analytics-period')?.addEventListener('change', (e) => {
      this.periodFilter = e.target.value;
      this.render(container, { portfolioData, settings });
    });

    container.querySelector('#select-analytics-sort')?.addEventListener('change', (e) => {
      this.sortOption = e.target.value;
      this.render(container, { portfolioData, settings });
    });
  }
};
