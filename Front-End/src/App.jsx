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
    } catch (err) {
      setReceipts([]);
    }
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        {isLoggedIn && (
          <Sidebar onLogout={handleLogout} isOpen={sidebarOpen} onToggle={handleSidebarToggle} isLoggedIn={isLoggedIn} />
        )}
        <div className={isLoggedIn ? `main-content${sidebarOpen ? '' : ' sidebar-closed'}` : "main-content-login"}>
          <main>
            {/* Home을 항상 맨 위에 렌더링 */}
            {isLoggedIn && <Home fetchReceipts={fetchReceipts} receipts={receipts} categories={categories} />}
            <Routes>
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

