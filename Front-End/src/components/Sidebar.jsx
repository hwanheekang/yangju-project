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
        <span className="sidebar-toggle-icon" aria-hidden="true">{isOpen ? '×' : '≡'}</span>
      </button>
      {isOpen && (
        <>
          <nav className="sidebar-nav">
            <div className="sidebar-title">AI 가계부</div>
            <Link to="/" className="sidebar-link">대시보드</Link>
          </nav>
          <button onClick={handleLogout} className="logout-btn">로그아웃</button>
        </>
      )}
    </div>
  );
};

export default Sidebar;