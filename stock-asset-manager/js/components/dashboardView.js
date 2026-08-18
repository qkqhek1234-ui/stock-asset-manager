/**
 * Stock Asset Manager - Dashboard View Component
 * Metric Overview (Mobile: Left KRW / Right USD, Desktop: 3-column), Allocation Donut Chart, Performance Summary
 */

import { CalculatorService } from '../services/calculatorService.js';

export const DashboardView = {
  render(container, { portfolioData, settings, onRefreshQuotes, onOpenAddModal }) {
    const { summary, holdings } = portfolioData;
    const isProfit = summary.totalUnrealizedProfitKRW >= 0;
    const profitClass = isProfit ? 'profit-text' : 'loss-text';
    const badgeClass = isProfit ? 'profit-badge' : 'loss-badge';

    container.innerHTML = `
      <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;">자산 총괄 대시보드</h2>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
            적용 환율: 1 USD = <strong>${CalculatorService.formatNumber(summary.exchangeRate, 2)}원</strong>
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btn-quick-refresh" class="btn btn-secondary btn-sm">
            <span>🔄</span> 시세 갱신
          </button>
          <button id="btn-quick-add" class="btn btn-primary btn-sm">
            <span>➕</span> 기록 추가
          </button>
        </div>
      </div>

      <!-- Top Metric Cards Grid (Mobile: Col 1 KRW / Col 2 USD, Desktop: Row 1 KRW / Row 2 USD) -->
      <div class="grid-cards">
        <!-- 1. 총 평가 자산 (KRW) -->
        <div class="card metric-card order-krw-1">
          <span class="metric-label">총 평가 자산 (KRW)</span>
          <span class="metric-value">${CalculatorService.formatCurrency(summary.totalMarketValueKRW, 'KRW')}</span>
          <div class="metric-sub">
            <span class="${badgeClass}">
              ${isProfit ? '▲' : '▼'} ${CalculatorService.formatPercent(summary.totalReturnRate)}
            </span>
            <span class="${profitClass}">
              ${isProfit ? '+' : ''}${CalculatorService.formatCurrency(summary.totalUnrealizedProfitKRW, 'KRW')}
            </span>
          </div>
        </div>

        <!-- 2. 총 평가 자산 (USD) -->
        <div class="card metric-card order-usd-1">
          <span class="metric-label">총 평가 자산 (USD 달러)</span>
          <span class="metric-value" style="color: #38bdf8;">${CalculatorService.formatCurrency(summary.totalMarketValueUSD, 'USD')}</span>
          <div class="metric-sub">
            <span class="${badgeClass}">
              ${isProfit ? '▲' : '▼'} ${CalculatorService.formatPercent(summary.totalReturnRate)}
            </span>
            <span class="${profitClass}">
              ${isProfit ? '+' : ''}${CalculatorService.formatCurrency(summary.totalUnrealizedProfitUSD, 'USD')}
            </span>
          </div>
        </div>

        <!-- 3. 총 투자 원금 (KRW) -->
        <div class="card metric-card order-krw-2">
          <span class="metric-label">총 투자 원금 (KRW)</span>
          <span class="metric-value">${CalculatorService.formatCurrency(summary.totalInvestedKRW, 'KRW')}</span>
          <div class="metric-sub" style="color: var(--text-muted);">
            보유 종목수: <strong style="color: var(--text-main); margin-left: 0.25rem;">${holdings.length}개</strong>
          </div>
        </div>

        <!-- 4. 총 투자 원금 (USD) -->
        <div class="card metric-card order-usd-2">
          <span class="metric-label">총 투자 원금 (USD 달러)</span>
          <span class="metric-value">${CalculatorService.formatCurrency(summary.totalInvestedUSD, 'USD')}</span>
          <div class="metric-sub" style="color: var(--text-muted);">
            적용 환율: 1 USD = <strong>${CalculatorService.formatNumber(summary.exchangeRate, 1)}원</strong>
          </div>
        </div>

        <!-- 5. 누적 실현 손익 (KRW) -->
        <div class="card metric-card order-krw-3">
          <span class="metric-label">누적 실현 손익 (KRW)</span>
          <span class="metric-value ${summary.totalRealizedProfitKRW >= 0 ? 'profit-text' : 'loss-text'}">
            ${summary.totalRealizedProfitKRW >= 0 ? '+' : ''}${CalculatorService.formatCurrency(summary.totalRealizedProfitKRW, 'KRW')}
          </span>
          <div class="metric-sub" style="color: var(--text-muted);">
            원화 확정 손익
          </div>
        </div>

        <!-- 6. 누적 실현 손익 (USD) -->
        <div class="card metric-card order-usd-3">
          <span class="metric-label">누적 실현 손익 (USD 달러)</span>
          <span class="metric-value ${summary.totalRealizedProfitUSD >= 0 ? 'profit-text' : 'loss-text'}">
            ${summary.totalRealizedProfitUSD >= 0 ? '+' : ''}${CalculatorService.formatCurrency(summary.totalRealizedProfitUSD, 'USD')}
          </span>
          <div class="metric-sub" style="color: var(--text-muted);">
            달러 확정 손익 ($)
          </div>
        </div>
      </div>

      <!-- Chart & Top Holdings 2-Column Grid -->
      <div class="grid-2col">
        <!-- Asset Allocation Chart Card -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📊 종목별 비중 포트폴리오</span>
          </div>
          <div class="chart-container">
            <canvas id="allocation-canvas" width="260" height="260" style="max-width: 100%; height: auto;"></canvas>
            <div id="chart-legend" class="chart-legend"></div>
          </div>
        </div>

        <!-- Top Weight Stocks Overview -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🏆 보유 비중 상위 종목</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${holdings.length === 0 ? '<p style="text-align: center; color: var(--text-dim); padding: 2rem;">보유 중인 종목이 없습니다.</p>' : ''}
            ${holdings.slice(0, 5).map((h) => {
              const hp = h.profit >= 0;
              return `
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
                    <div style="font-size: 0.95rem; font-weight: 700; font-family: var(--font-mono);">
                      ${CalculatorService.formatCurrency(h.marketValueKRW, 'KRW')}
                    </div>
                    <div style="font-size: 0.8rem; font-weight: 600;" class="${hp ? 'profit-text' : 'loss-text'}">
                      ${CalculatorService.formatPercent(h.returnRate)}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Hook up button events
    container.querySelector('#btn-quick-refresh')?.addEventListener('click', onRefreshQuotes);
    container.querySelector('#btn-quick-add')?.addEventListener('click', onOpenAddModal);

    // Render Pure Canvas Donut Chart
    this.drawDonutChart(container, holdings);
  },

  /**
   * Lightweight pure HTML5 Canvas Donut Chart
   */
  drawDonutChart(container, holdings) {
    const canvas = container.querySelector('#allocation-canvas');
    const legendEl = container.querySelector('#chart-legend');
    if (!canvas || holdings.length === 0) {
      if (legendEl) legendEl.innerHTML = '<span style="color:var(--text-dim);">데이터 없음</span>';
      return;
    }

    const ctx = canvas.getContext('2d');
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
      '#06b6d4', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const innerRadius = radius * 0.62;

    let startAngle = -Math.PI / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let legendHtml = '';

    holdings.forEach((item, index) => {
      const color = colors[index % colors.length];
      const sliceAngle = (item.weightPercent / 100) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;

      // Draw Arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Border between slices
      ctx.strokeStyle = '#151e2d';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle = endAngle;

      legendHtml += `
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${color};"></span>
          <span>${item.name} (${item.weightPercent.toFixed(1)}%)</span>
        </div>
      `;
    });

    // Draw center text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px var(--font-family)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('총 자산 비중', centerX, centerY - 8);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 14px var(--font-mono)';
    ctx.fillText(`${holdings.length}개 종목`, centerX, centerY + 12);

    if (legendEl) {
      legendEl.innerHTML = legendHtml;
    }
  }
};
