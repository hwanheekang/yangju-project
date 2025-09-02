import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault(); 

    if (!username || !password) {
      alert('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    console.log('로그인 시도:', { username, password });
    
    onLoginSuccess();
    navigate('/');
  };

  const styles = {
    // === 여기부터 수정된 부분입니다 ===
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // 부모 요소의 상태와 상관없이 화면 전체를 차지하도록 설정
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    // === 여기까지 수정되었습니다 ===
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '300px',
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', // 그림자 효과 추가
    },
    input: {
      padding: '10px',
      fontSize: '16px',
      borderRadius: '4px',
      border: '1px solid #ddd',
    },
    button: {
      padding: '10px',
      fontSize: '16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.form}>
        <h2>로그인</h2>
        <input
          type="text"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>로그인</button>
      </form>
    </div>
  );
};

export default Login;

