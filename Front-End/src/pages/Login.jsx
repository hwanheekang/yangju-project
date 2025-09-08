import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiFetch from '../api';
import logo from '../assets/sm4.png';

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
          setIsLoading(false);
          return;
        }
        const response = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        if (response.token) {
          onLoginSuccess(response.token);
          navigate('/');
        }
      } else {
        if (!username || !password || !confirmPassword) {
          setError('모든 필드를 입력해주세요.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('비밀번호가 일치하지 않습니다.');
          setIsLoading(false);
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
      setError(err.message || (err.details ? err.details : '오류가 발생했습니다.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-logo-area">
        {/* 대시보드 헤더와 동일한 로고 이미지 */}
        <img src={logo} alt="Logo" className="login-logo" />
      </div>
      <form className="login-form-area" onSubmit={handleSubmit}>
        <h2>{isLoginView ? '로그인' : '회원가입'}</h2>
        {error && <p className="login-error-text">{error}</p>}
        <input
          type="text"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          className="login-input"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="login-input"
        />
        {!isLoginView && (
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            className="login-input"
          />
        )}
        <button type="submit" className="login-btn" disabled={isLoading}>
          {isLoading ? '처리 중...' : (isLoginView ? '로그인' : '회원가입')}
        </button>
        <p className="login-toggle-text">
          {isLoginView ? '아직 회원이 아니신가요?' : '이미 계정이 있으신가요?'}
          <span
            className="login-toggle-link"
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

export default Login;

