import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const styles = {
    nav: {
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      height: '100%',
      minWidth: '200px',
      // ▼▼▼▼▼ 바로 이 한 줄이 추가되었습니다! ▼▼▼▼▼
      boxSizing: 'border-box',
      // ▲▲▲▲▲ 여기가 추가된 부분입니다 ▲▲▲▲▲
    },
    link: {
      textDecoration: 'none',
      color: '#333',
      padding: '10px 15px',
      borderRadius: '5px',
      marginBottom: '10px',
      transition: 'background-color 0.2s',
    },
    logoutButton: {
      marginTop: 'auto',
      padding: '10px 15px',
      border: 'none',
      borderRadius: '5px',
      backgroundColor: '#dc3545',
      color: 'white',
      cursor: 'pointer',
      textAlign: 'center',
    }
  };

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.link}>대시보드</Link>
      <Link to="/statistics" style={styles.link}>카테고리별 지출내역</Link>
      
      <button onClick={handleLogout} style={styles.logoutButton}>
        로그아웃
      </button>
    </nav>
  );
};

export default Sidebar;

