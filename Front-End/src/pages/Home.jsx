import React, { useState, useEffect } from 'react';
import apiFetch from '../api'; // API 모듈 import
import Modal from '../components/Modal';
import Upload from './Upload';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ▼▼▼▼▼ 테스트 결과를 저장할 새로운 state 추가 ▼▼▼▼▼
  const [sasTestResult, setSasTestResult] = useState('');
  // ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/receipts'); 
      setReceipts(data.receipts || []);
    } catch (err) {
      setError('데이터를 불러오는 데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);
  
  // ▼▼▼▼▼ 테스트 버튼 클릭 시 실행될 함수 추가 ▼▼▼▼▼
  const handleSasTest = async () => {
    try {
      setSasTestResult('요청 중...');
      console.log("SAS URL 요청 시작...");

      // Vite 프록시를 사용하므로 '/api'로 시작하는 상대 경로를 사용합니다.
      const response = await fetch('/api/blob-sas?blobName=test.jpg');
      
      if (!response.ok) {
        throw new Error(`서버 에러: ${response.status}`);
      }

      const data = await response.json();
      console.log('서버로부터 받은 SAS URL:', data.sasUrl);
      setSasTestResult(`성공! SAS URL: ${data.sasUrl}`);

    } catch (err) {
      console.error('SAS URL 요청 실패:', err);
      setSasTestResult(`실패: ${err.message}`);
    }
  };
  // ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div>
      <h2>대시보드</h2>
      <button onClick={openModal}>영수증 추가하기</button>

      {/* ▼▼▼▼▼ 테스트를 위한 UI 추가 ▼▼▼▼▼ */}
      <div style={{ border: '1px solid #eee', padding: '10px', marginTop: '20px' }}>
        <h3>연결 테스트</h3>
        <button onClick={handleSasTest}>/api/blob-sas 테스트</button>
        <p><strong>테스트 결과:</strong> {sasTestResult}</p>
      </div>
      {/* ▲▲▲▲▲ 여기까지 추가 ▲▲▲▲▲ */}

      <div style={{ marginTop: '20px' }}>
        <h3>내 영수증 목록</h3>
        {/* ... (기존 영수증 목록 코드는 동일) ... */}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <Upload onClose={closeModal} onUploadSuccess={fetchReceipts} />
      </Modal>
    </div>
  );
}