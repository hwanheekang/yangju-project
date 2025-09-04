import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// ...existing code...
import Sidebar from './components/Sidebar';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  // 핸들러 함수들
  const handleLoginSuccess = (token) => {
    localStorage.setItem('jwtToken', token);
    setIsLoggedIn(true);
  };
  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    setIsLoggedIn(false);
  };
  const handleSidebarToggle = () => setSidebarOpen(open => !open);

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
        {/* Theme toggle - fixed at top-right of the viewport */}
        <button className="theme-toggle" onClick={toggleTheme} aria-label="테마 전환">
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
        {isLoggedIn && (
          <Sidebar onLogout={handleLogout} isOpen={sidebarOpen} onToggle={handleSidebarToggle} isLoggedIn={isLoggedIn} />
        )}
        <div className={isLoggedIn ? `main-content${sidebarOpen ? '' : ' sidebar-closed'}` : "main-content-login"}>
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
              {/* Home은 위에서 렌더링하므로 Route에서 제외 */}
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

