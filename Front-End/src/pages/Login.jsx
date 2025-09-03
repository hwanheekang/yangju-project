import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../api';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLoginView) {
        if (!username || !password) {
          setError('아이디와 비밀번호를 모두 입력해주세요.');
          return;
        }

        try {
          const response = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
          });

          if (response.token) {
            onLoginSuccess(response.token);
            navigate('/');
          }
        } catch (err) {
          // 404: 계정 없음 → 회원가입 안내
          if (err.message.includes('404') || err.message.includes('User not found')) {
            setError('계정이 존재하지 않습니다. 회원가입이 필요합니다.');
          } else if (err.message.includes('401')) {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
          } else {
            setError(err.message || '오류가 발생했습니다.');
          }
          setIsLoading(false);
          return;
        }
      } else {
        if (!username || !password || !confirmPassword) {
          setError('모든 필드를 입력해주세요.');
          return;
        }
        if (password !== confirmPassword) {
          setError('비밀번호가 일치하지 않습니다.');
          return;
        }

        await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });

        alert('회원가입에 성공했습니다! 이제 로그인해주세요.');
        setIsLoginView(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
  // DB 상세 오류 메시지까지 표시
  setError(err.message || (err.details ? err.details : '오류가 발생했습니다.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2>{isLoginView ? '로그인' : '회원가입'}</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input
          type="text"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
        {!isLoginView && (
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            disabled={isLoading}
          />
        )}
        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? '처리 중...' : (isLoginView ? '로그인' : '회원가입')}
        </button>
        <p style={styles.toggleText}>
          {isLoginView ? '아직 회원이 아니신가요?' : '이미 계정이 있으신가요?'}
          <span 
            style={styles.toggleLink} 
            onClick={() => {
              if (!isLoading) {
                setIsLoginView(!isLoginView);
                setError('');
              }
            }}
          >
            {isLoginView ? ' 회원가입' : ' 로그인'}
          </span>
        </p>
      </form>
    </div>
  );
};

// 스타일 객체 전체 코드 (복사해서 사용하세요)
const styles = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', width: '300px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' },
  input: { padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' },
  button: { padding: '10px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  toggleText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '14px',
  },
  toggleLink: {
    color: '#007bff',
    cursor: 'pointer',
    fontWeight: 'bold',
  }
};

export default Login;

