// src/components/Modal.jsx
import React from 'react';
import './Modal.css'; // 모달 스타일을 위한 CSS 파일

function Modal({ isOpen, onClose, children }) {
  // isOpen이 false이면 아무것도 렌더링하지 않음
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>X</button>
        {children}
      </div>
    </div>
  );
}

export default Modal;