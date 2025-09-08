// src/components/Modal.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import './Modal.css'; // 모달 스타일을 위한 CSS 파일

function Modal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;
  return ReactDOM.createPortal(
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
    </div>,
    document.body
  );
}

export default Modal;