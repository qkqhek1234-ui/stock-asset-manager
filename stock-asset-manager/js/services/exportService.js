/**
 * Stock Asset Manager - Export & Import Service
 * CSV (Excel compatible with UTF-8 BOM) & JSON Backup/Restore
 */

export const ExportService = {
  /**
   * Export transactions to CSV file with UTF-8 BOM for Microsoft Excel
   */
  exportToCSV(transactions = []) {
    if (!transactions || transactions.length === 0) {
      throw new Error('내보낼 거래 내역이 없습니다.');
    }

    const headers = ['거래일자', '유형', '종목코드', '종목명', '시장', '통화', '수량', '단가', '수수료', '총금액', '메모'];
    const rows = transactions.map((t) => {
      const typeLabel = t.type === 'BUY' ? '매수' : (t.type === 'SELL' ? '매도' : '배당');
      const totalAmount = t.type === 'DIVIDEND'
        ? (t.amount || (t.quantity * t.price))
        : (t.quantity * t.price) + (t.type === 'BUY' ? (t.fee || 0) : -(t.fee || 0));

      return [
        t.date || '',
        typeLabel,
        t.ticker || '',
        `"${(t.name || '').replace(/"/g, '""')}"`,
        t.market || 'KR',
        t.currency || 'KRW',
        t.quantity || 0,
        t.price || 0,
        t.fee || 0,
        totalAmount,
        `"${(t.memo || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `주식매매일지_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadBlob(blob, filename);
  },

  /**
   * Export all data to JSON
   */
  exportToJSON(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `주식자산_전체백업_${new Date().toISOString().slice(0, 10)}.json`;
    this.downloadBlob(blob, filename);
  },

  /**
   * Import data from JSON file
   */
  async importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          resolve(parsed);
        } catch (err) {
          reject(new Error('올바른 JSON 파일 형식이 아닙니다.'));
        }
      };
      reader.onerror = () => reject(new Error('파일을 읽는 도중 오류가 발생했습니다.'));
      reader.readAsText(file);
    });
  },

  downloadBlob(blob, filename) {
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
