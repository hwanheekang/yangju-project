import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/sm4.png';

const Sidebar = ({ onLogout, isOpen, onToggle }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // 오버레이 클릭 시 사이드바 닫기
  const handleOverlayClick = () => {
    if (isOpen) {
      onToggle();
    }
  };

  return (
    <>
      {/* 사이드바 배경 오버레이 */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* 사이드바 */}
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <nav className="sidebar-nav">
          <div className="sidebar-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img src={logo} alt="AI 가계부 로고" style={{ height: 112, width:'auto' }} />
          </div>
          <Link to="/" className="sidebar-link">대시보드</Link>
        </nav>
        
        <button onClick={handleLogout} className="logout-btn">로그아웃</button>
      </div>
    </>
  );
};

export default Sidebar;