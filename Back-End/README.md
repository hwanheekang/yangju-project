# Show Me The Money - Backend

이 프로젝트는 **Node.js, Express, Azure SQL Database**를 사용하여 만든 영수증 관리 백엔드입니다. 서버리스 환경(Azure App Service, Azure Functions)으로 확장할 수 있도록 설계되었습니다.

---

## 📁 폴더 구조

```
show-me-the-money-backend/
├── sql/
│   └── schema.sql           # 데이터베이스 테이블 생성 스크립트
├── src/
│   ├── services/            # (추후 확장) 비즈니스 로직 모듈
│   ├── middleware/
│   │   └── auth.js          # JWT 인증 미들웨어
│   ├── app.js               # 메인 서버 파일
│   ├── auth.js              # 회원가입/로그인 API 라우터
│   ├── db.js                # DB 연결 모듈
│   └── receipts.js          # 영수증 관련 API 라우터(보호됨)
├── .env.example             # 환경변수 예시 파일
├── .gitignore               # Git 관리 제외 파일 목록
└── package.json             # 프로젝트 의존성 및 설정
```

---

## 🚦 주요 기능 및 코드 설명

### 1. `src/app.js` - 메인 서버

- Express 서버를 실행합니다.
- CORS, Helmet, Morgan 등 보안/로그 미들웨어 적용.
- `/health` 엔드포인트로 서버 상태 확인 가능.
- `/api/auth`로 인증 관련 라우터 연결.
- `/api/receipts`로 영수증 관련 라우터 연결(로그인 필요).

### 2. `src/db.js` - 데이터베이스 연결

- `.env` 파일의 정보를 이용해 Azure SQL Database에 연결합니다.
- `mssql` 패키지로 커넥션 풀을 생성하여 효율적으로 쿼리 처리.

### 3. `src/auth.js` - 인증 API

- **회원가입**: 비밀번호를 bcryptjs로 해싱 후 DB에 저장.
- **로그인**: 아이디/비밀번호 확인 후 JWT 토큰 발급.
- JWT 토큰은 이후 보호된 API 접근 시 사용.

### 4. `src/middleware/auth.js` - 인증 미들웨어

- API 요청 헤더의 JWT 토큰을 검증합니다.
- 토큰이 유효하면 사용자 정보를 `req.user`에 추가하여 다음 라우터에서 활용.

### 5. `src/receipts.js` - 영수증 API (예시)

- 모든 엔드포인트는 인증 미들웨어로 보호됩니다.
- 로그인한 사용자의 영수증 목록을 반환하는 예시 라우트 포함.

### 6. `sql/schema.sql` - DB 테이블 생성

- `users` 테이블: 회원 정보 저장.
- `receipts` 테이블: 영수증 데이터 저장, 사용자와 외래키로 연결.

---

## 🔗 코드 연결 흐름

1. 사용자가 회원가입/로그인 → JWT 토큰 발급
2. 클라이언트가 토큰을 포함해 영수증 API 요청 → 인증 미들웨어에서 토큰 검증
3. 인증 성공 시, 해당 사용자의 데이터만 접근 가능

---

## 🛠️ 개발 및 실행 방법

1. **의존성 설치**
   ```powershell
   npm install
   ```

2. **환경변수 설정**
   - `.env.example`을 복사해 `.env` 파일 생성 후, 실제 DB 정보와 JWT 시크릿 입력

3. **DB 테이블 생성**
   - `sql/schema.sql`을 Azure SQL Database에 실행

4. **서버 실행**
   ```powershell
   npm run dev
   ```

5. **API 테스트**
   - 회원가입/로그인/영수증 API를 `curl`로 테스트 가능

---

## 💡 발표/문서화 팁

- 각 파일의 역할과 연결 구조를 위 설명대로 정리하면, 백엔드 전체 흐름을 쉽게 설명할 수 있습니다.
- 실제 API 요청/응답 예시(`curl` 명령어)를 시연하면 이해가 더 쉬워집니다.

---

## ❓ 문의/확장

- 추가 기능(영수증 업로드, 카테고리별 통계 등)은 `src/services/`에 모듈화하여 확장 가능합니다.
- Azure Functions로 마이그레이션도 용이하도록 설계되어 있습니다.