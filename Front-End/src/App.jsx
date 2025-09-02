// src/App.jsx

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 컴포넌트 import
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// 페이지 import
import Home from './pages/Home';
import Login from './pages/Login'; // 새로 만든 로그인 페이지
import Statistics from './pages/Statistics'; // 1. 주석 해제

import './App.css';

function App() {
  // 1. 로그인 상태를 관리하는 state. 기본값은 false.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 로그인 성공 시 호출될 함수
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <Router>
      <div className="app-container">
        {/* 2. 로그인 상태일 때만 헤더와 사이드바를 보여줍니다. */}
        {isLoggedIn && <Header />}
        <div className="main-content">
          {isLoggedIn && <Sidebar />}
          <main>
            <Routes>
              {/* 3. 로그인 상태에 따른 라우팅 처리 */}
              <Route 
                path="/login" 
                element={
                  isLoggedIn ? <Navigate to="/" /> : <Login onLoginSuccess={handleLoginSuccess} />
                } 
              />
              <Route 
                path="/" 
                element={
                  isLoggedIn ? <Home /> : <Navigate to="/login" />
                } 
              />
              {/* 2. 통계 페이지 라우트 주석 해제 및 추가 */}
              <Route 
                path="/statistics" 
                element={
                  isLoggedIn ? <Statistics /> : <Navigate to="/login" />
                } 
              />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
