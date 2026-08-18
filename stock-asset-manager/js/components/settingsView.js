/**
 * Stock Asset Manager - Settings View Component
 * Theme, Currency, Excel/JSON Backup/Restore, Cloud DB Settings
 */

import { ExportService } from '../services/exportService.js';

export const SettingsView = {
  render(container, { settings, transactions, onSaveSettings, onImportData, onResetData, showToast }) {
    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;">환경 설정 및 데이터 관리</h2>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
          테마, 색상 체계, 환율 및 데이터 백업을 설정합니다.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.25rem; max-width: 650px;">
        <!-- Theme & UI Preferences Card -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🎨 테마 및 디스플레이 설정</span>
          </div>

          <div class="form-group">
            <label class="form-label">테마 모드</label>
            <select id="setting-theme" class="form-select">
              <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>다크 모드 (Dark Theme)</option>
              <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>라이트 모드 (Light Theme)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">등락 색상 표기 방식</label>
            <select id="setting-color-style" class="form-select">
              <option value="global" ${settings.colorStyle === 'global' ? 'selected' : ''}>글로벌 표준 (초록: 상승 ▲ / 빨강: 하락 ▼)</option>
              <option value="korean" ${settings.colorStyle === 'korean' ? 'selected' : ''}>한국 주식 시장 (빨강: 상승 ▲ / 파랑: 하락 ▼)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">기본 USD/KRW 환율 (원)</label>
            <input type="number" id="setting-exchange-rate" class="form-input" value="${settings.exchangeRate || 1380}" step="0.5">
            <span style="font-size: 0.75rem; color: var(--text-dim);">시세 갱신 시 실시간 환율이 자동 반영되며, 수동 입력 시 기본값으로 사용됩니다.</span>
          </div>

          <button id="btn-save-ui-settings" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">
            설정 저장
          </button>
        </div>

        <!-- Data Backup & Excel Export Card -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">💾 데이터 백업 및 복원</span>
          </div>

          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            모든 주식 매매 및 배당 데이터는 브라우저에 안전하게 저장됩니다. 엑셀로 내보내거나 전체 백업 파일을 생성하여 언제든 복구할 수 있습니다.
          </p>

          <div style="display: flex; gap: 0.65rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
            <button id="btn-export-csv" class="btn btn-secondary btn-sm">
              📊 엑셀(CSV) 내보내기
            </button>
            <button id="btn-export-json" class="btn btn-secondary btn-sm">
              📦 전체 백업(JSON) 다운로드
            </button>
          </div>

          <div style="border-top: 1px dashed var(--border-subtle); padding-top: 1rem;">
            <label class="form-label">백업 파일(JSON) 복원하기</label>
            <input type="file" id="input-import-json" accept=".json" class="form-input" style="padding: 0.45rem;">
          </div>
        </div>

        <!-- Cloud Sync (Supabase) Card -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">☁️ 클라우드 DB 연동 (Supabase)</span>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            Supabase 프로젝트 URL과 Anon Key를 입력하면 PC와 모바일 간 실시간 클라우드 자동 동기화가 활성화됩니다. (비워두면 로컬 스토리지로 단독 작동)
          </p>

          <div class="form-group">
            <label class="form-label">Supabase Project URL</label>
            <input type="text" id="setting-supabase-url" class="form-input" placeholder="https://xyz.supabase.co" value="${settings.supabaseUrl || ''}">
          </div>

          <div class="form-group">
            <label class="form-label">Supabase Anon Key</label>
            <input type="password" id="setting-supabase-key" class="form-input" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." value="${settings.supabaseKey || ''}">
          </div>

          <button id="btn-save-cloud-settings" class="btn btn-secondary btn-sm">
            클라우드 설정 저장
          </button>
        </div>

        <!-- Danger Zone Card -->
        <div class="card" style="border-color: rgba(239, 68, 68, 0.3);">
          <div class="card-header">
            <span class="card-title" style="color: var(--color-loss);">⚠️ 데이터 초기화</span>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.85rem;">
            등록된 모든 매매 기록과 시세 캐시를 초기화합니다. 작업 전 반드시 백업 파일을 다운로드하세요.
          </p>
          <button id="btn-reset-all" class="btn btn-danger btn-sm">
            모든 데이터 초기화
          </button>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('#btn-save-ui-settings')?.addEventListener('click', () => {
      const theme = container.querySelector('#setting-theme').value;
      const colorStyle = container.querySelector('#setting-color-style').value;
      const exchangeRate = parseFloat(container.querySelector('#setting-exchange-rate').value) || 1380;

      onSaveSettings({ theme, colorStyle, exchangeRate });
      showToast('설정이 성공적으로 저장되었습니다.', 'success');
    });

    container.querySelector('#btn-save-cloud-settings')?.addEventListener('click', () => {
      const supabaseUrl = container.querySelector('#setting-supabase-url').value.trim();
      const supabaseKey = container.querySelector('#setting-supabase-key').value.trim();

      onSaveSettings({ supabaseUrl, supabaseKey });
      showToast('클라우드 설정이 저장되었습니다.', 'success');
    });

    container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
      try {
        ExportService.exportToCSV(transactions);
        showToast('엑셀(CSV) 파일이 다운로드되었습니다.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    container.querySelector('#btn-export-json')?.addEventListener('click', () => {
      ExportService.exportToJSON({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        transactions,
        settings
      });
      showToast('전체 백업(JSON) 파일이 다운로드되었습니다.', 'success');
    });

    container.querySelector('#input-import-json')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const data = await ExportService.importFromJSON(file);
        if (data.transactions && Array.isArray(data.transactions)) {
          if (confirm(`총 ${data.transactions.length}개의 거래 기록을 복원하시겠습니까? (기존 데이터와 합쳐집니다)`)) {
            onImportData(data);
            showToast('데이터가 성공적으로 복원되었습니다.', 'success');
          }
        } else {
          showToast('올바른 백업 파일 형식이 아닙니다.', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    container.querySelector('#btn-reset-all')?.addEventListener('click', () => {
      if (confirm('정말로 모든 거래 데이터를 삭제하시겠습니까? 복구할 수 없습니다.')) {
        onResetData();
        showToast('데이터가 초기화되었습니다.', 'success');
      }
    });
  }
};
