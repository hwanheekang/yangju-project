import React, { useState } from 'react';
import apiFetch from '../api'; // API 모듈 import
import Modal from '../components/Modal';
import ReceiptCalendar from '../components/Calendar';
import ExpensePieChart from './ExpensePieChart';
import MonthlyCategoryCard from '../components/MonthlyCategoryCard';
import Upload from './Upload';
import ReceiptList from './ReceiptList';

const CATEGORIES = [
  '분류 대기',
  '식비', '교통비', '고정지출', '통신비', '교육비',
  '여가활동', '의료비', '의류비', '경조사비', '기타'
];

export default function Home({ fetchReceipts, receipts }) {
  // 현재 선택된 월 상태 추가
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  // 수정 모드 상태 추가
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({ store_name: '', transaction_date: '', total_amount: '', category: '', memo: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 캘린더 날짜 클릭 시 모달
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarReceipts, setCalendarReceipts] = useState([]);
  const [calendarDate, setCalendarDate] = useState('');
  // 레이아웃 블록 순서 상태: 'calendar' | 'chart'
  const [layoutOrder, setLayoutOrder] = useState(['calendar','chart','monthlyCategory']);
  // 드래그 오버 상태(시각화)
  const [dragOverId, setDragOverId] = useState(null);

  // 최초 로드 시 사용자 선호도 불러오기
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/preferences/layout');
        if (Array.isArray(res.layoutOrder) && res.layoutOrder.length) {
          const base = res.layoutOrder;
          const merged = [...base];
          ['calendar','chart','monthlyCategory'].forEach(id => {
            if (!merged.includes(id)) merged.push(id);
          });
          setLayoutOrder(merged);
        }
  } catch {
        // ignore load error
      }
    })();
  }, []);

  const persistLayout = async (order) => {
    try {
      await apiFetch('/preferences/layout', { method: 'PUT', body: JSON.stringify({ layoutOrder: order }) });
  } catch {
      // ignore save error
    }
  };

  // DnD 핸들러
  const onDragStart = (e, id) => {
    e.stopPropagation();
  try { e.dataTransfer.clearData(); } catch { /* ignore */ }
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    // Use a tiny transparent drag image for consistent UX
    const img = document.createElement('canvas');
    img.width = 1; img.height = 1;
    e.dataTransfer.setDragImage(img, 0, 0);
  };
  const onDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id) setDragOverId(id); // keep highlight while over this section
  };
  const onDragEnter = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const onDragLeave = (e, id) => {
    e.preventDefault();
    // Only clear when actually leaving the section, not entering a child
    const toEl = e.relatedTarget;
    if (!toEl || !e.currentTarget.contains(toEl)) {
      setDragOverId(prev => (prev === id ? null : prev));
    }
  };
  const onDragEnd = () => { setDragOverId(null); };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;
    const newOrder = [...layoutOrder];
    const sIdx = newOrder.indexOf(sourceId);
    const tIdx = newOrder.indexOf(targetId);
    if (sIdx === -1 || tIdx === -1) return;
  const [moved] = newOrder.splice(sIdx, 1);
  // Place BEFORE the target consistently to avoid no-op drops
  const insertIdx = tIdx <= newOrder.length ? tIdx : newOrder.length;
  newOrder.splice(insertIdx, 0, moved);
    setLayoutOrder(newOrder);
    persistLayout(newOrder);
    setDragOverId(null);
  };

  // 삭제 핸들러
  const handleDelete = async (receiptId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiFetch(`/receipts/${receiptId}`, { method: 'DELETE' });
      await fetchReceipts();
    } catch {
      // 삭제 에러 무시 또는 alert 등으로 대체 가능
    }
  };

  // 수정 버튼 클릭 시 editFields에 값 세팅
  const handleEditClick = (receipt) => {
    setEditId(receipt.id);
    setEditFields({
      store_name: receipt.store_name || '',
      transaction_date: receipt.transaction_date ? receipt.transaction_date.slice(0, 10) : '',
      total_amount: receipt.total_amount || '',
      category: receipt.category || '분류 대기',
      memo: receipt.memo || ''
    });
    setEditModalOpen(true);
  };

  // 수정 완료 핸들러
  const handleEditSave = async () => {
    try {
      await apiFetch(`/receipts/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(editFields)
      });
      const updatedReceipts = await fetchReceipts();
      // 최신 데이터에서 해당 날짜의 영수증 목록을 다시 세팅
      if (calendarDate) {
        const updatedList = updatedReceipts.filter(r => r.transaction_date.slice(0, 10) === calendarDate);
        setCalendarReceipts(updatedList);
      }
      setEditId(null);
      setEditModalOpen(false);
    } catch {
      // 수정 에러 무시 또는 alert 등으로 대체 가능
    }
  };

  // 전체 지출 합계 계산

  // 모달 열기/닫기 함수
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // 현재 월 지출 합계/건수 (블록 헤더용)
  const monthlyFiltered = receipts.filter(r => {
    const d = new Date(r.transaction_date);
    return d.getFullYear() === selectedMonth.getFullYear() && d.getMonth() === selectedMonth.getMonth();
  });
  const monthTotal = monthlyFiltered.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  const monthCount = monthlyFiltered.length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', background: 'var(--bg-card)' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0, fontWeight: 700, fontSize: '2.1rem' }}>AI 가계부</h2>
        </div>
  <button className="btn" style={{margin: 0}} onClick={openModal}>영수증 추가하기</button>
      </div>
  <div className="dashboard-main" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, padding: 16, alignItems: 'stretch' }} role="list">
  {layoutOrder.map((id) => {
      if (id === 'calendar') {
        return (
          <section
            key="calendar"
            className={`block card draggable-block${dragOverId === 'calendar' ? ' drag-over' : ''}`}
            style={{ minWidth: 0 }}
            onDragOver={(e) => onDragOver(e, 'calendar')}
            onDragEnter={(e) => onDragEnter(e, 'calendar')}
            onDragLeave={(e) => onDragLeave(e, 'calendar')}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, 'calendar')}
            role="listitem"
            aria-grabbed={false}
          >
            <div
              className="block-header calendar-header"
              onDragOver={(e) => onDragOver(e, 'calendar')}
              onDragEnter={(e) => onDragEnter(e, 'calendar')}
              onDragLeave={(e) => onDragLeave(e, 'calendar')}
              onDrop={(e) => onDrop(e, 'calendar')}
            >
              월별 지출 내역 : <strong>{monthTotal.toLocaleString()}원</strong> <span className="text-muted" style={{ marginLeft: 8 }}>({monthCount}개)</span>
              <button
                className="drag-handle"
                aria-label="Drag to reorder"
                draggable
                onDragStart={(e) => onDragStart(e, 'calendar')}
                onClick={(e) => e.preventDefault()}
              >⠿</button>
            </div>
            <div
              className="block-body"
              onDragOver={(e) => onDragOver(e, 'calendar')}
              onDragEnter={(e) => onDragEnter(e, 'calendar')}
              onDragLeave={(e) => onDragLeave(e, 'calendar')}
              onDrop={(e) => onDrop(e, 'calendar')}
            >
              <ReceiptCalendar
                receipts={receipts}
                onDateClick={(date, list) => {
                  setCalendarDate(date);
                  setCalendarReceipts(list);
                  setCalendarModalOpen(true);
                }}
                onMonthChange={date => setSelectedMonth(date)}
                hideSummary
              />
            </div>
          </section>
        );
      }
  if (id === 'chart') {
        return (
          <section
            key="chart"
    className={`block card draggable-block${dragOverId === 'chart' ? ' drag-over' : ''}`}
            style={{ minWidth: 0 }}
            onDragOver={(e) => onDragOver(e, 'chart')}
            onDragEnter={(e) => onDragEnter(e, 'chart')}
            onDragLeave={(e) => onDragLeave(e, 'chart')}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, 'chart')}
            role="listitem"
            aria-grabbed={false}
          >
            <div
              className="block-header"
              onDragOver={(e) => onDragOver(e, 'chart')}
              onDragEnter={(e) => onDragEnter(e, 'chart')}
              onDragLeave={(e) => onDragLeave(e, 'chart')}
              onDrop={(e) => onDrop(e, 'chart')}
            >
              {String(selectedMonth.getFullYear()).slice(-2)}년 {selectedMonth.getMonth() + 1}월 카테고리별 지출 비율
              <button
                className="drag-handle"
                aria-label="Drag to reorder"
                draggable
                onDragStart={(e) => onDragStart(e, 'chart')}
                onClick={(e) => e.preventDefault()}
              >⠿</button>
            </div>
            <div className="block-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ExpensePieChart
                receipts={monthlyFiltered}
                selectedMonth={selectedMonth}
                showTitle={false}
              />
            </div>
          </section>
        );
      }
      if (id === 'monthlyCategory') {
        const y = selectedMonth.getFullYear();
        const m = selectedMonth.getMonth() + 1;
        return (
          <section
            key="monthlyCategory"
            className={`block card monthly-category draggable-block${dragOverId === 'monthlyCategory' ? ' drag-over' : ''}`}
            style={{ minWidth: 0 }}
            onDragOver={(e) => onDragOver(e, 'monthlyCategory')}
            onDragEnter={(e) => onDragEnter(e, 'monthlyCategory')}
            onDragLeave={(e) => onDragLeave(e, 'monthlyCategory')}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, 'monthlyCategory')}
            role="listitem"
            aria-grabbed={false}
          >
            <div
              className="block-header"
              onDragOver={(e) => onDragOver(e, 'monthlyCategory')}
              onDragEnter={(e) => onDragEnter(e, 'monthlyCategory')}
              onDragLeave={(e) => onDragLeave(e, 'monthlyCategory')}
              onDrop={(e) => onDrop(e, 'monthlyCategory')}
            >
              {String(y).slice(-2)}년 {m}월 전체 사용자 카테고리 요약
              <button
                className="drag-handle"
                aria-label="Drag to reorder"
                draggable
                onDragStart={(e) => onDragStart(e, 'monthlyCategory')}
                onClick={(e) => e.preventDefault()}
              >⠿</button>
            </div>
            <div
              className="block-body"
              onDragOver={(e) => onDragOver(e, 'monthlyCategory')}
              onDragEnter={(e) => onDragEnter(e, 'monthlyCategory')}
              onDragLeave={(e) => onDragLeave(e, 'monthlyCategory')}
              onDrop={(e) => onDrop(e, 'monthlyCategory')}
            >
              <MonthlyCategoryCard year={y} month={m} renderAsCard={false} />
            </div>
          </section>
        );
      }
      return null;
    })}
  </div>

  {/* 레이아웃 순서 적용: order에 따라 DOM 순서 바꾸기 */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <Upload onClose={closeModal} onUploadSuccess={fetchReceipts} />
      </Modal>
      {/* 캘린더 날짜 클릭 시 해당 영수증 목록 모달 */}
      <Modal isOpen={calendarModalOpen} onClose={() => setCalendarModalOpen(false)} title={`${calendarDate} 영수증 목록`}>
        <div>
          {calendarReceipts.length === 0 ? (
            <div className="text-muted">해당 일자에 영수증이 없습니다.</div>
          ) : (
            calendarReceipts.map(receipt => (
              <div key={receipt.id} style={styles.receiptCard} className="receiptCard">
                <div style={styles.receiptHeader} className="receiptHeader">
                  <h4 style={{ margin: 0 }}>{receipt.store_name || '상호명 없음'}</h4>
                </div>
                <div style={styles.receiptDetails} className="receiptDetails">
                  <div><strong>거래일자:</strong> {receipt.transaction_date}</div>
                  <div><strong>카테고리:</strong> {receipt.category || '분류 대기'}</div>
                  <div><strong>금액:</strong> <span style={styles.amount} className="amount">{Number(receipt.total_amount).toLocaleString()}원</span></div>
                  <div><strong>메모:</strong> <span className="receipt-memo">{receipt.memo || '-'}</span></div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                    <button style={styles.editBtn} className="editBtn" onClick={() => handleEditClick(receipt)}>수정</button>
                    <button style={styles.deleteBtn} className="deleteBtn" onClick={() => handleDelete(receipt.id)}>삭제</button>
                  </div>
                </div>
              </div>
            ))
          )}
  </div>
      </Modal>

      {/* 수정 모달 */}
      <Modal isOpen={editModalOpen} onClose={() => { setEditId(null); setEditModalOpen(false); }}>
        <div style={{ marginTop: '8px', background: '#eef', padding: '10px', borderRadius: '6px' }}>
          <div><label>상호명: <input type="text" value={editFields.store_name} onChange={e => setEditFields(f => ({ ...f, store_name: e.target.value }))} className="input" style={styles.input} /></label></div>
          <div><label>거래일자: <input type="date" value={editFields.transaction_date} onChange={e => setEditFields(f => ({ ...f, transaction_date: e.target.value }))} className="input" style={styles.input} /></label></div>
          <div><label>금액: <input type="number" value={editFields.total_amount} onChange={e => setEditFields(f => ({ ...f, total_amount: e.target.value }))} className="input" style={styles.input} /></label></div>
          <div><label>카테고리:
            <select value={editFields.category} onChange={e => setEditFields(f => ({ ...f, category: e.target.value }))} className="categorySelect" style={styles.categorySelect}>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label></div>
          <div><label>메모: <input type="text" value={editFields.memo || ''} onChange={e => setEditFields(f => ({ ...f, memo: e.target.value }))} className="input" style={styles.input} /></label></div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button style={styles.editBtn} className="editBtn" onClick={handleEditSave}>완료</button>
            <button style={styles.deleteBtn} className="deleteBtn" onClick={() => { setEditId(null); setEditModalOpen(false); }}>취소</button>
          </div>
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