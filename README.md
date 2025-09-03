# 양주 영수증 관리 시스템

React와 Node.js를 사용한 영수증 관리 웹 애플리케이션입니다.

## 🚀 기능

- 사용자 인증 (로그인/회원가입)
- 영수증 이미지 업로드 및 AI 분석
- 영수증 카테고리 분류
- 영수증 목록 조회 및 관리
- Azure Document Intelligence를 활용한 OCR

## 📁 프로젝트 구조

```
yangju-project/
├── Back-End/          # Node.js + Express 백엔드
│   ├── src/
│   │   ├── app.js     # 메인 서버 파일
│   │   ├── auth.js    # 인증 관련 라우터
│   │   ├── receipts.js # 영수증 관련 라우터
│   │   ├── db.js      # 데이터베이스 연결
│   │   └── middleware/
│   │       └── auth.js # 인증 미들웨어
│   ├── sql/
│   │   └── schema.sql # 데이터베이스 스키마
│   └── package.json
├── Front-End/         # React 프론트엔드
│   ├── src/
│   │   ├── App.jsx    # 메인 앱 컴포넌트
│   │   ├── api.js     # API 통신 모듈
│   │   ├── pages/     # 페이지 컴포넌트들
│   │   └── components/ # 재사용 컴포넌트들
│   └── package.json
└── package.json       # 프로젝트 루트 설정
```

## 🛠️ 설치 및 실행

### 1. 의존성 설치

```bash
# 프로젝트 루트에서 모든 의존성 설치
npm run install:all
```

### 2. 환경변수 설정

#### 백엔드 환경변수 설정
`Back-End` 폴더에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Server Configuration
PORT=4000

# Database Configuration (Azure SQL Database)
DB_SERVER=your-server-name.database.windows.net
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Azure Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account-name
AZURE_STORAGE_ACCOUNT_KEY=your-storage-account-key
AZURE_BLOB_CONTAINER_NAME=receipts

# Azure Document Intelligence Configuration
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-document-intelligence-key
```

### 3. 데이터베이스 설정

Azure SQL Database에서 `Back-End/sql/schema.sql` 파일의 내용을 실행하여 테이블을 생성하세요.

### 4. 애플리케이션 실행

```bash
# 프론트엔드와 백엔드를 동시에 실행
npm run dev
```

또는 개별적으로 실행:

```bash
# 백엔드만 실행
npm run dev:backend

# 프론트엔드만 실행
npm run dev:frontend
```

## 🌐 접속 정보

- **프론트엔드**: http://localhost:5173
- **백엔드**: http://localhost:4000

## 🔧 주요 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

### 영수증 관리
- `GET /api/receipts` - 영수증 목록 조회
- `POST /api/receipts` - 영수증 등록
- `PATCH /api/receipts/:id` - 영수증 카테고리 업데이트
- `PUT /api/receipts/:id` - 영수증 수정
- `DELETE /api/receipts/:id` - 영수증 삭제

### 기타
- `POST /api/document-intelligence` - Azure Document Intelligence API
- `GET /api/blob-sas` - Azure Blob Storage SAS 토큰 발급

## 🔒 보안

- JWT 토큰 기반 인증
- 모든 API 요청에 인증 미들웨어 적용
- 사용자별 데이터 분리

## 🐛 문제 해결

### 일반적인 문제들

1. **데이터베이스 연결 실패**
   - Azure SQL Database 설정 확인
   - 방화벽 규칙 확인
   - 환경변수 설정 확인

2. **CORS 오류**
   - 백엔드 서버가 실행 중인지 확인
   - 프록시 설정 확인

3. **인증 오류**
   - JWT_SECRET 환경변수 설정 확인
   - 토큰 만료 확인

## �� 라이센스

ISC License
