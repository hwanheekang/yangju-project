import React from 'react';
import { Link } from 'react-router-dom';

const navStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',  // 메뉴 사이 간격
  padding: '10px',
};

// 현재 사용되지 않는 props는 정리하여 코드를 간결하게 만듭니다.
function Sidebar() {
  return (
    <nav style={navStyle}>
      <Link to="/">대시보드</Link>
      {/* '카테고리별 지출내역' 링크의 목적지를 '/statistics'로 변경합니다. */}
      <Link to="/statistics">카테고리별 지출내역</Link>
    </nav>
  );
}

export default Sidebar;
