/**
 * Stock Asset Manager - Calculator Service
 * Precise Financial Math: Moving Average Unit Cost, Realized P&L,
 * Unrealized P&L, Currency Conversion & Allocation Metrics.
 */

export const CalculatorService = {
  /**
   * Process all transactions and compute current holdings and historical performance.
   * @param {Array} transactions - Array of transaction objects
   * @param {Object} currentPrices - Map of ticker -> { price, currency, changePercent }
   * @param {number} exchangeRate - USD/KRW exchange rate
   * @returns {Object} summary, holdings, realizedPnLList, dividendList
   */
  computePortfolio(transactions = [], currentPrices = {}, exchangeRate = 1350) {
    // Sort transactions chronologically
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    const holdingsMap = {}; // ticker -> { ticker, name, market, quantity, avgPrice, totalInvested, currency }
    const realizedPnLList = [];
    const dividendList = [];

    sortedTx.forEach((tx) => {
      const ticker = tx.ticker.trim().toUpperCase();
      const type = tx.type; // 'BUY', 'SELL', 'DIVIDEND'
      const qty = parseFloat(tx.quantity) || 0;
      const price = parseFloat(tx.price) || 0;
      const fee = parseFloat(tx.fee) || 0;
      const currency = tx.currency || 'KRW';
      const name = tx.name || ticker;
      const market = tx.market || (currency === 'USD' ? 'US' : 'KR');

      if (!holdingsMap[ticker]) {
        holdingsMap[ticker] = {
          ticker,
          name,
          market,
          currency,
          quantity: 0,
          totalInvested: 0,
          avgPrice: 0,
          totalDividends: 0
        };
      }

      const item = holdingsMap[ticker];
      item.name = name || item.name;
      item.market = market;
      item.currency = currency;

      if (type === 'BUY') {
        const cost = (qty * price) + fee;
        item.quantity += qty;
        item.totalInvested += cost;
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

    // Compute market values and unrealized profit
    const holdings = [];
    let totalInvestedKRW = 0;
    let totalMarketValueKRW = 0;
    let totalRealizedProfitKRW = 0;
    let totalDividendsKRW = 0;

    Object.values(holdingsMap).forEach((item) => {
      if (item.quantity <= 0) return; // ignore liquidated stocks for active portfolio

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
        changePercent: priceInfo.changePercent || 0,
        lastUpdated: priceInfo.lastUpdated || null
      });
    });

    // Realized Profit Totals in KRW
    realizedPnLList.forEach((r) => {
      const rate = r.currency === 'USD' ? exchangeRate : 1;
      totalRealizedProfitKRW += r.realizedProfit * rate;
    });

    // Dividends Totals in KRW
    dividendList.forEach((d) => {
      const rate = d.currency === 'USD' ? exchangeRate : 1;
      totalDividendsKRW += d.amount * rate;
    });

    const totalUnrealizedProfitKRW = totalMarketValueKRW - totalInvestedKRW;
    const totalReturnRate = totalInvestedKRW > 0 ? (totalUnrealizedProfitKRW / totalInvestedKRW) * 100 : 0;

    const totalMarketValueUSD = exchangeRate > 0 ? totalMarketValueKRW / exchangeRate : 0;
    const totalInvestedUSD = exchangeRate > 0 ? totalInvestedKRW / exchangeRate : 0;
    const totalUnrealizedProfitUSD = totalMarketValueUSD - totalInvestedUSD;
    const totalRealizedProfitUSD = exchangeRate > 0 ? totalRealizedProfitKRW / exchangeRate : 0;
    const totalDividendsUSD = exchangeRate > 0 ? totalDividendsKRW / exchangeRate : 0;

    // Calculate asset allocation weights (%)
    holdings.forEach((h) => {
      h.weightPercent = totalMarketValueKRW > 0 ? (h.marketValueKRW / totalMarketValueKRW) * 100 : 0;
    });

    // Sort by market value descending
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

  /**
   * Format numbers to localized currency strings
   */
  formatCurrency(value, currency = 'KRW') {
    if (value === null || value === undefined || isNaN(value)) return '0';
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    }
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(Math.round(value));
  },

  formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return Number(value).toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  formatPercent(value) {
    if (value === null || value === undefined || isNaN(value)) return '0.00%';
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${Number(value).toFixed(2)}%`;
  }
};
