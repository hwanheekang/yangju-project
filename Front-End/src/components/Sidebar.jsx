import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Sidebar = ({ onLogout, isOpen, onToggle }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className={`sidebar${isOpen ? ' open' : ' closed'}`}>
      <button className="sidebar-toggle" onClick={onToggle} aria-label="사이드바 토글">
        {isOpen ? '×' : '≡'}
      </button>
      {isOpen && (
        <nav className="sidebar-nav">
          <div className="sidebar-title">AI 가계부</div>
          <Link to="/" className="sidebar-link">대시보드</Link>
          <Link to="/category" className="sidebar-link">카테고리별 지출내역</Link>
          <button onClick={handleLogout} className="logout-btn">로그아웃</button>
        </nav>
      )}
    </div>
  );
};

export default Sidebar;