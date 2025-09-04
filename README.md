# 양주 영수증 관리 시스템

React와 Node.js를 사용한 영수증 관리 웹 애플리케이션입니다.

## 🚀 기능

- 사용자 인증 (로그인/회원가입)
- 영수증 이미지 업로드 및 AI 분석
- 영수증 카테고리 분류
# 양주 영수증 관리 시스템 (AI 가계부)

> React(Vite) + Node/Express + Azure SQL/Blob/Document Intelligence 로 만든 영수증 관리/분석 웹앱

---

## ✨ 주요 기능

- 로그인/회원가입(JWT)
- 영수증 업로드 → Azure Document Intelligence로 자동 인식(OCR)
- 영수증 CRUD, 메모/카테고리 편집, 삭제
- 대시보드(캘린더/월별 카테고리 요약/카테고리별 지출 비율)
- 드래그앤드롭으로 카드 재배치(사용자별 레이아웃 선호 저장)
- 라이트/다크 테마(로컬 저장 + 시스템 테마 감지)

## � 폴더 구조

```
.yangju-project
├─ Back-End/                 # Node/Express API 서버
│  ├─ src/
│  │  ├─ app.js             # 서버 엔트리 (보안/로깅/CORS/업로드/AI 분석)
│  │  ├─ auth.js            # 인증 라우트 (register/login)
│  │  ├─ receipts.js        # 영수증 CRUD
│  │  ├─ analytics.js       # 월별 카테고리 집계 API
│  │  ├─ preferences.js     # 사용자 레이아웃 선호 저장/조회
│  │  ├─ db.js              # MSSQL 커넥션 풀
│  │  └─ middleware/auth.js # JWT 미들웨어
│  ├─ sql/schema.sql        # DB 스키마
│  ├─ env.example           # 환경변수 예시
│  └─ package.json
├─ Front-End/                # React(Vite) SPA
│  ├─ src/
│  │  ├─ App.jsx            # 앱 셸/라우팅/테마 토글
│  │  ├─ pages/             # Home/Login/Statistics 등
│  │  ├─ components/        # Sidebar/Calendar/Modal 등
│  │  ├─ api.js             # 백엔드 API 래퍼(fetch)
│  │  └─ App.css            # 전역 스타일 + 테마 변수
│  └─ package.json
└─ package.json              # 루트 스크립트(동시 실행/설치)
```

## ⚙️ 빠른 시작

### 1) 의존성 설치
```bash
npm run install:all
```

### 2) 환경변수 설정(백엔드)
`Back-End/.env` 파일 생성 — 전체 예시는 `Back-End/env.example` 참조
```env
PORT=4000
NODE_ENV=development
DB_SERVER=your-server.database.windows.net
DB_DATABASE=your-db
DB_USER=your-user
DB_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
AZURE_STORAGE_ACCOUNT_NAME=your-storage
AZURE_STORAGE_ACCOUNT_KEY=your-key
AZURE_BLOB_CONTAINER_NAME=receipts
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-cog.cognitiveservices.azure.com
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-docintel-key
DI_MODEL_ID=prebuilt-receipt
```

### 3) 데이터베이스 준비
- Azure SQL에 접속해 `Back-End/sql/schema.sql` 실행

### 4) 개발 서버 실행
```bash
# 프론트+백 동시에실행
npm run dev

# 또는 개별 실행
npm run dev:backend
npm run dev:frontend
```

- FE: http://localhost:5173
- BE: http://localhost:4000

## 🧩 주요 API 요약

- 인증
   - `POST /api/auth/register`
   - `POST /api/auth/login`
- 영수증
   - `GET /api/receipts`
   - `POST /api/receipts`
   - `PUT /api/receipts/:id`
   - `PATCH /api/receipts/:id`
   - `DELETE /api/receipts/:id`
- 분석/환경설정
   - `GET /api/analytics/monthly-category?year=YYYY&month=MM`
   - `GET /api/preferences/layout`
   - `PUT /api/preferences/layout`
- 업로드/AI 분석
   - `POST /api/upload-and-analyze` (Blob 업로드 → Document Intelligence 분석)

## 🛡️ 보안/운영 팁
- 프로덕션에서 `NODE_ENV=production` + `CORS_ORIGINS` 환경변수로 출처 제한
- 실 비밀키는 절대 커밋 금지(.env 로컬/배포 비밀 저장소 사용)
- DB 연결 실패 시 서버가 종료됩니다. 네트워크/인증/방화벽을 먼저 확인하세요.

## 💡 트러블슈팅
- FE 흰 화면/깜빡임: index.html에서 초기 테마 선적용, App.css 배경은 `var(--bg)` 사용. 강력 새로고침(Ctrl+F5)
- 차트 렌더 에러(radialLinear): Pie 차트의 radial 스케일 옵션 제거(반영됨)
- CORS 차단: 개발은 오픈, 운영은 `CORS_ORIGINS`에 허용 도메인 나열

## 라이선스
ISC

