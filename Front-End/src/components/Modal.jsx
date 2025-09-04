// src/components/Modal.jsx
import React from 'react';
import './Modal.css'; // 모달 스타일을 위한 CSS 파일

function Modal({ isOpen, onClose, children, title }) {
  // isOpen이 false이면 아무것도 렌더링하지 않음
  if (!isOpen) {
    return null;
  }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-topbar">
            {title ? <h3 className="modal-title">{title}</h3> : <span />}
            <button className="modal-close-button" onClick={onClose} aria-label="닫기">X</button>
          </div>
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
  );
}

export default Modal;