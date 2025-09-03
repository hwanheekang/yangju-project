// mock-server.js
const express = require('express');
const cors = require('cors');
const app = express();
const port = 4000; // 백엔드 포트를 4000번으로 설정

app.use(cors());
app.use(express.json());

// 2단계에서 브라우저로 직접 연결을 확인할 때 사용할 주소
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '가짜 백엔드 서버가 응답합니다!' });
});

// 3단계에서 로그인 페이지로 연결을 확인할 때 사용할 주소
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('가짜 서버가 받은 로그인 정보:', { username, password });
  
  // 지금은 아이디/비밀번호와 상관없이 무조건 성공 응답을 보냅니다.
  res.json({ success: true, message: '가짜 로그인 성공!', user: username });
});

app.listen(port, () => {
  console.log(`가짜 백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
  console.log('연결 테스트를 시작하세요!');
});
```

### ## 2단계: 가짜 서버 실행하기

이제 만든 가짜 서버를 실행시켜야 합니다.

1.  VS Code에서 **새로운 터미널**을 엽니다. (기존 프론트엔드 서버를 실행하는 터미널은 그대로 두세요)
2.  터미널 경로가 `PS C:\project\Project>` 인지 확인하세요.
3.  가짜 서버에 필요한 `express`와 `cors` 라이브러리를 설치합니다.
    ```bash
    npm install express cors
    ```
4.  설치가 완료되면, 아래 명령어로 가짜 서버를 실행합니다.
    ```bash
    node mock-server.js
    
