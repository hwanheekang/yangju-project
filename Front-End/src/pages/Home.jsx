import React, { useState, useEffect } from 'react';
import apiFetch from '../api'; // API 모듈 import
import Modal from '../components/Modal';
import ReceiptCalendar from '../components/Calendar';
import Upload from './Upload';
import ReceiptList from './ReceiptList';

const CATEGORIES = [
  '분류 대기',
  '식비', '교통비', '고정지출', '통신비', '교육비',
  '여가활동', '의료비', '의류비', '경조사비', '기타'
];

export default function Home({ fetchReceipts, receipts, categories }) {
  // 수정 모드 상태 추가
  const [editId, setEditId] = useState(null);
  // 수정 중인 필드 상태 추가
  const [editFields, setEditFields] = useState({ store_name: '', transaction_date: '', total_amount: '', category: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // 캘린더 날짜 클릭 시 모달
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarReceipts, setCalendarReceipts] = useState([]);
  const [calendarDate, setCalendarDate] = useState('');

  // 삭제 핸들러
  const handleDelete = async (receiptId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiFetch(`/receipts/${receiptId}`, { method: 'DELETE' });
      await fetchReceipts();
    } catch (err) {
      setError('삭제에 실패했습니다: ' + err.message);
    }
  };

  // 수정 버튼 클릭 시 editFields에 값 세팅
  const handleEditClick = (receipt) => {
    setEditId(receipt.id);
    setEditFields({
      store_name: receipt.store_name || '',
      transaction_date: receipt.transaction_date ? receipt.transaction_date.slice(0, 10) : '',
      total_amount: receipt.total_amount || '',
      category: receipt.category || '분류 대기'
    });
  };

  // 수정 완료 핸들러
  const handleEditSave = async () => {
    try {
      await apiFetch(`/receipts/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(editFields)
      });
      setEditId(null);
      setEditFields({ store_name: '', transaction_date: '', total_amount: '', category: '' });
      await fetchReceipts();
    } catch (err) {
      setError('수정에 실패했습니다: ' + err.message);
    }
  };

  // 전체 지출 합계 계산
  const total = receipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

  // 모달 열기/닫기 함수
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px 32px 0 32px', background: 'var(--bg-card)' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0, fontWeight: 700, fontSize: '2.1rem' }}>AI 가계부</h2>
          <div className="text-primary" style={{ fontSize: '1.3rem', fontWeight: 600, marginTop: 12 }}>
            전체 지출내역: {total.toLocaleString()}원
          </div>
        </div>
        <button className="btn" onClick={openModal}>영수증 추가하기</button>
      </div>
      <div className="dashboard-main" style={{ display: 'flex', gap: 32, padding: '0 32px 32px 32px', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 캘린더 추가 */}
          <ReceiptCalendar
            receipts={receipts}
            onDateClick={(date, list) => {
              setCalendarDate(date);
              setCalendarReceipts(list);
              setCalendarModalOpen(true);
            }}
          />
          <div className="receipt-list-section card" style={{ padding: 24, maxHeight: 600, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: 18, fontWeight: 700, fontSize: '1.2rem' }}>영수증 목록</h3>
            <div style={{ width: '100%', minHeight: 120 }}>
              {loading ? (
                <p className="text-muted">로딩 중...</p>
              ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
              ) : (
                receipts.length === 0 ? (
                  <div className="text-muted" style={{ textAlign: 'center', marginTop: 40 }}>영수증이 없습니다.</div>
                ) : (
                  receipts.map((receipt) => (
                    <div key={receipt.id} style={styles.receiptCard} className="receiptCard">
                      <div style={styles.receiptHeader} className="receiptHeader">
                        <h4 style={{ margin: 0 }}>{receipt.store_name || '상호명 없음'}</h4>
                        <span style={styles.amount} className="amount">{Number(receipt.total_amount).toLocaleString()}원</span>
                      </div>
                      <div style={styles.receiptDetails} className="receiptDetails">
                        <p style={{ margin: '4px 0' }}><strong>날짜:</strong> {receipt.transaction_date}</p>
                        <div style={styles.categorySection} className="categorySection">
                          <label><strong>카테고리:</strong> {receipt.category || '분류 대기'}</label>
                          <button style={styles.editBtn} className="editBtn" onClick={() => handleEditClick(receipt)}>수정</button>
                          <button style={styles.deleteBtn} className="deleteBtn" onClick={() => handleDelete(receipt.id)}>삭제</button>
                        </div>
                        {editId === receipt.id && (
                          <div style={{ marginTop: '8px', background: '#eef', padding: '10px', borderRadius: '6px' }}>
                            <div><label>상호명: <input type="text" value={editFields.store_name} onChange={e => setEditFields(f => ({ ...f, store_name: e.target.value }))} className="input" style={styles.input} /></label></div>
                            <div><label>날짜: <input type="date" value={editFields.transaction_date} onChange={e => setEditFields(f => ({ ...f, transaction_date: e.target.value }))} className="input" style={styles.input} /></label></div>
                            <div><label>금액: <input type="number" value={editFields.total_amount} onChange={e => setEditFields(f => ({ ...f, total_amount: e.target.value }))} className="input" style={styles.input} /></label></div>
                            <div><label>카테고리:
                              <select value={editFields.category} onChange={e => setEditFields(f => ({ ...f, category: e.target.value }))} className="categorySelect" style={styles.categorySelect}>
                                {CATEGORIES.map(category => (
                                  <option key={category} value={category}>{category}</option>
                                ))}
                              </select>
                            </label></div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <button style={styles.editBtn} className="editBtn" onClick={handleEditSave}>완료</button>
                              <button style={styles.deleteBtn} className="deleteBtn" onClick={() => setEditId(null)}>취소</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <Upload onClose={closeModal} onUploadSuccess={fetchReceipts} />
      </Modal>
      {/* 캘린더 날짜 클릭 시 해당 영수증 목록 모달 */}
      <Modal isOpen={calendarModalOpen} onClose={() => setCalendarModalOpen(false)}>
        <div>
          <h3 style={{ marginBottom: 12 }}>{calendarDate} 영수증 목록</h3>
          {calendarReceipts.length === 0 ? (
            <div className="text-muted">해당 일자에 영수증이 없습니다.</div>
          ) : (
            calendarReceipts.map(receipt => (
              <div key={receipt.id} style={styles.receiptCard} className="receiptCard">
                <div style={styles.receiptHeader} className="receiptHeader">
                  <h4 style={{ margin: 0 }}>{receipt.store_name || '상호명 없음'}</h4>
                  <span style={styles.amount} className="amount">{Number(receipt.total_amount).toLocaleString()}원</span>
                </div>
                <div style={styles.receiptDetails} className="receiptDetails">
                  <p style={{ margin: '4px 0' }}><strong>날짜:</strong> {receipt.transaction_date}</p>
                  <div style={styles.categorySection} className="categorySection">
                    <label><strong>카테고리:</strong> {receipt.category || '분류 대기'}</label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

const styles = {
  editBtn: {
    padding: '4px 8px',
    marginLeft: '8px',
    borderRadius: '4px',
    border: '1px solid #007bff',
    background: '#fff',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '13px',
  },
  deleteBtn: {
    padding: '4px 8px',
    marginLeft: '8px',
    borderRadius: '4px',
    border: '1px solid #dc3545',
    background: '#fff',
    color: '#dc3545',
    cursor: 'pointer',
    fontSize: '13px',
  },
  receiptCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  receiptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  amount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#007bff'
  },
  receiptDetails: {
    fontSize: '14px'
  },
  categorySection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '5px'
  },
  categorySelect: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px'
  },
  input: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px',
    marginLeft: '8px'
  }
};