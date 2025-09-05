import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// ...existing code...
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Statistics from './pages/Statistics';
import './App.css';

function App() {
  // 모든 Hook을 최상단에 선언
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [categories] = useState([
    '분류 대기',
    '식비', '교통비', '고정지출', '통신비', '교육비',
    '여가활동', '의료비', '의류비', '경조사비', '기타'
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // PC에서는 기본 열림, 모바일에서는 기본 닫힘
    return window.innerWidth > 768;
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    return stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }); // 'light' | 'dark'

  // Initialize theme from localStorage or prefers-color-scheme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Toggle theme and persist
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      setIsLoggedIn(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchReceipts();
  }, [isLoggedIn]);

  // 윈도우 리사이즈 시 사이드바 상태 조정
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false); // 모바일에서는 닫기
        document.body.classList.remove('sidebar-open');
      } else {
        setSidebarOpen(true); // PC에서는 열기
        document.body.classList.add('sidebar-open');
      }
    };

    // 초기 로드 시 사이드바 상태에 따른 body 클래스 설정
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // 핸들러 함수들
  const handleLoginSuccess = (token) => {
    localStorage.setItem('jwtToken', token);
    setIsLoggedIn(true);
  };
  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    setIsLoggedIn(false);
  };
    const handleSidebarToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    
    // body 클래스 토글
    if (newState) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
  };

  // 영수증 목록 fetch 함수
  const fetchReceipts = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      const res = await fetch('/api/receipts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReceipts(data.receipts || []);
      return data.receipts || [];
  } catch {
      setReceipts([]);
      return [];
    }
  };

  if (isLoading) return null;

  return (
    <Router>
      <div className="app-container">
        {/* 헤더는 전체 화면 상단에 고정 */}
        {isLoggedIn && <Header />}
        
        {/* 사이드바는 오버레이 방식으로 독립적 배치 */}
        {isLoggedIn && (
          <Sidebar onLogout={handleLogout} isOpen={sidebarOpen} onToggle={handleSidebarToggle} isLoggedIn={isLoggedIn} />
        )}
        
        {/* 좌측 상단 컨트롤 영역 */}
        {isLoggedIn && (
          <div className="top-left-controls">
            {/* 다크모드 토글 버튼 - 상단 */}
            <button className="dark-mode-toggle" onClick={toggleTheme} aria-label="테마 전환">
              {theme === 'dark' ? (
                // Sun icon when in dark mode
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
              ) : (
                // Moon icon when in light mode
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21.752 15.002A9 9 0 1112.998 2.248 7 7 0 0021.752 15.002z"/>
                </svg>
              )}
            </button>
            
            {/* 사이드바 토글 버튼 - 하단 */}
            <button className="sidebar-toggle" onClick={handleSidebarToggle} aria-label="사이드바 토글">
              {sidebarOpen ? (
                // X 아이콘 (사이드바 열린 상태)
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                // 햄버거 메뉴 아이콘 (사이드바 닫힌 상태)
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>
          </div>
        )}
        
        {/* 메인 컨텐츠 - 사이드바와 독립적으로 중앙 고정 */}
        <div className={isLoggedIn ? "main-content" : "main-content-login"}>
          <main>
            <Routes>
              <Route 
                path="/" 
                element={isLoggedIn ? <Home fetchReceipts={fetchReceipts} receipts={receipts} categories={categories} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/login" 
                element={isLoggedIn ? <Navigate to="/" /> : <Login onLoginSuccess={handleLoginSuccess} />} 
              />
              <Route path="/statistics" element={isLoggedIn ? <Statistics receipts={receipts} categories={categories} /> : <Navigate to="/login" />} />
              <Route path="/category" element={isLoggedIn ? <Statistics receipts={receipts} categories={categories} /> : <Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;

