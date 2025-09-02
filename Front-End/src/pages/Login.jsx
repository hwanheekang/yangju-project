import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isLoginView) {
      if (!username || !password) {
        setError('아이디와 비밀번호를 모두 입력해주세요.');
        return;
      }
      console.log('프론트엔드 로그인 성공:', { username });
      onLoginSuccess();
      navigate('/');
    } else {
      if (!username || !password || !confirmPassword) {
        setError('모든 필드를 입력해주세요.');
        return;
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      console.log('프론트엔드 회원가입 성공:', { username });
      alert('회원가입에 성공했습니다! 이제 로그인해주세요.');
      setIsLoginView(true);
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
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        {!isLoginView && (
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
          />
        )}
        <button type="submit" style={styles.button}>
          {isLoginView ? '로그인' : '회원가입'}
        </button>
        {/* ▼▼▼▼▼ 이 부분의 style과 onClick이 수정되었습니다 ▼▼▼▼▼ */}
        <p style={styles.toggleText}>
          {isLoginView ? '아직 회원이 아니신가요?' : '이미 계정이 있으신가요?'}
          {/* 실제 클릭되는 부분은 링크처럼 보이게 처리 */}
          <span 
            style={styles.toggleLink} 
            onClick={() => setIsLoginView(!isLoginView)}
          >
            {isLoginView ? ' 회원가입' : ' 로그인'}
          </span>
        </p>
        {/* ▲▲▲▲▲ 여기까지 수정되었습니다 ▲▲▲▲▲ */}
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
  // ▼▼▼▼▼ 여기에 새로운 스타일이 추가되었습니다 ▼▼▼▼▼
  toggleText: {
    textAlign: 'center',
    color: '#6c757d', // 비활성화된 느낌의 회색 텍스트
    fontSize: '14px',
  },
  toggleLink: {
    color: '#007bff', // 링크 부분만 파란색으로
    cursor: 'pointer', // 마우스를 올리면 손가락 모양으로
    fontWeight: 'bold', // 약간 굵게
  }
  // ▲▲▲▲▲ 여기까지 추가되었습니다 ▲▲▲▲▲
};


export default Login;

