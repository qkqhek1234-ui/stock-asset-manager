# 📈 주식 자산관리 웹앱 (Stock Asset Manager)

개인용 주식(국내 KOSPI/KOSDAQ + 미국 NASDAQ/S&P500) 포트폴리오 및 매매/배당 일지를 손쉽게 관리할 수 있는 반응형 웹앱(PWA)입니다.

---

## ✨ 주요 특징 및 기능

1. **초경량 모듈형 아키텍처**:
   - `index.html`과 `js/app.js`는 최소한의 오케스트레이터 역할만 수행하며, 대시보드/포트폴리오/매매일지/분석/설정/계산기/시세조회/스토리지가 독립된 모듈로 분리되어 있습니다.
2. **국내 및 미국 주식 완벽 지원**:
   - 종목코드(예: `005930` 삼성전자) 및 미국 티커(예: `AAPL`, `NVDA`, `QQQ`) 실시간 시세 및 일일 등락률 자동 연동.
   - 원/달러(USD/KRW) 환율 자동 반영 및 원화 평가금액 자동 계산.
3. **정밀한 금융 계산 엔진**:
   - 분할 매수 시 이동평균법 기준 **평균 매입단가(평단가)** 및 보유수량 자동 추적.
   - 매도 시 **실현 손익** 확정 계산 및 잔여 물량 평단가 유지.
   - **배당금** 수령 내역 별도 관리 및 월별 배당 수익 차트 제공.
4. **모바일 최적화 & PWA (홈 화면 앱 설치)**:
   - 스마트폰에서는 하단 탭바와 터치 카드 UI, PC에서는 넓은 테이블과 대시보드 그리드로 자동 전환.
   - 브라우저의 "홈 화면에 추가"를 누르면 앱스토어 앱처럼 독립 실행.
5. **안전한 데이터 관리**:
   - 브라우저 로컬 자동 저장 (외부 서버 가입 없이 즉시 사용 가능).
   - 엑셀(CSV, UTF-8 BOM 지원) 내보내기 및 JSON 백업/복원 기능 제공.
   - 원할 경우 Supabase 클라우드 DB 연동 지원.

---

## 🚀 로컬에서 바로 실행하기

컴퓨터에 설치된 파이썬을 이용해 1초 만에 실행할 수 있습니다.

```bash
# stock-asset-manager 폴더에서 실행
python server/proxy.py
```

실행 후 웹 브라우저에서 **`http://localhost:3000`** 으로 접속하시면 됩니다.  
(또는 `index.html`을 브라우저로 직접 더블클릭해서 열어도 기본 기능을 즉시 사용할 수 있습니다.)

---

## ☁️ 무료 웹 배포 방법 (GitHub + Vercel)

### 1단계: GitHub에 올리기
1. [GitHub](https://github.com/)에서 새 저장소(New Repository) 생성 (예: `my-stock-manager`)
2. 터미널에서 다음 명령어 실행:
```bash
git init
git add .
git commit -m "Initial commit: Stock Asset Manager"
git branch -M main
git remote add origin https://github.com/내아이디/my-stock-manager.git
git push -u origin main
```

### 2단계: Vercel에서 무료 배포
1. [Vercel](https://vercel.com/) 접속 후 GitHub 계정으로 로그인
2. **[Add New...] -> [Project]** 클릭
3. 방금 올린 `my-stock-manager` 저장소 선택 후 **[Deploy]** 클릭!
4. 생성된 고유 웹 주소(`https://my-stock-manager.vercel.app`)로 스마트폰과 PC 어디서나 접속 가능합니다.

---

## 📱 스마트폰에서 앱처럼 설치하기 (PWA)

1. 배포된 웹 주소로 스마트폰 브라우저 접속
2. **아이폰 (Safari)**: 하단 공유 버튼 [공유(네모+화살표)] -> **[홈 화면에 추가]**
3. **갤럭시/안드로이드 (Chrome)**: 우측 상단 점 3개 메뉴 [⋮] -> **[홈 화면에 추가]** 또는 **[앱 설치]**
