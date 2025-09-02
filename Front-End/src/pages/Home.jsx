// src/pages/Home.jsx
import React, { useState } from 'react';
// useNavigate는 더 이상 필요 없으므로 삭제합니다.
// import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal'; // 1. Modal 컴포넌트 가져오기
import Upload from './Upload.jsx';           // 2. Upload 컴포넌트 가져오기

export default function Home() {
  // const navigate = useNavigate();

  // 3. 모달의 열림/닫힘 상태를 관리할 state 생성
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div>
      <h2>대시보드</h2>
      {/* 4. 버튼 클릭 시 navigate 대신 openModal 함수 호출 */}
      <button onClick={openModal}>
        영수증 추가하기
      </button>

      {/* 5. Modal 컴포넌트 렌더링 */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {/* Modal의 자식으로 Upload 컴포넌트를 넣고, 닫기 함수를 전달 */}
        <Upload onClose={closeModal} />
      </Modal>
    </div>
  );
}