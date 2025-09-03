import React, { useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function groupReceiptsByDate(receipts) {
  const map = {};
  receipts.forEach(r => {
    const date = r.transaction_date.slice(0, 10);
    if (!map[date]) map[date] = [];
    map[date].push(r);
  });
  return map;
}

export default function ReceiptCalendar({ receipts, onDateClick }) {
  const receiptsByDate = useMemo(() => groupReceiptsByDate(receipts), [receipts]);

  // 월별 총 지출 계산
  const monthTotal = useMemo(() => {
    return receipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  }, [receipts]);

  // 날짜별 타일에 영수증 개수 표시
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const key = date.toISOString().slice(0, 10);
      const count = receiptsByDate[key]?.length || 0;
      return count > 0 ? (
        <div style={{ fontSize: 12, color: '#1976d2', fontWeight: 700 }}>
          {count}개
        </div>
      ) : null;
    }
    return null;
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
        월별 총 지출: {monthTotal.toLocaleString()}원
      </div>
      <Calendar
        onClickDay={date => {
          const key = date.toISOString().slice(0, 10);
          if (receiptsByDate[key]) onDateClick(key, receiptsByDate[key]);
        }}
        tileContent={tileContent}
      />
    </div>
  );
}
