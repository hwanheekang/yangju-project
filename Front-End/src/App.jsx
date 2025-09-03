import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Login from './pages/Login';
import Statistics from './pages/Statistics';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      setIsLoggedIn(true);
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (token) => {
    localStorage.setItem('jwtToken', token);
    setIsLoggedIn(true);
  };

  // 로그아웃 시 토큰을 삭제하는 함수
  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        {isLoggedIn && <Header />}
        <div className={isLoggedIn ? "main-content" : "main-content-login"}>
          {/* ▼▼▼▼▼ 바로 이 부분에 onLogout={handleLogout}이 추가되었습니다! ▼▼▼▼▼ */}
          {isLoggedIn && <Sidebar onLogout={handleLogout} />}
          {/* ▲▲▲▲▲ 여기가 수정된 부분입니다 ▲▲▲▲▲ */}
          <main>
            <Routes>
              <Route 
                path="/login" 
                element={isLoggedIn ? <Navigate to="/" /> : <Login onLoginSuccess={handleLoginSuccess} />} 
              />
              <Route path="/" element={isLoggedIn ? <Home /> : <Navigate to="/login" />} />
              <Route path="/statistics" element={isLoggedIn ? <Statistics /> : <Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;

