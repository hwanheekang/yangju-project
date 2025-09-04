import React, { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../calendar-override.css';

function groupReceiptsByDate(receipts) {
  const map = {};
  receipts.forEach(r => {
    const date = r.transaction_date.slice(0, 10);
    if (!map[date]) map[date] = [];
    map[date].push(r);
  });
  return map;
}

export default function ReceiptCalendar({ receipts, onDateClick, onMonthChange }) {
  const [calendarValue, setCalendarValue] = useState(new Date());
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const receiptsByDate = useMemo(() => groupReceiptsByDate(receipts), [receipts]);

  // 날짜별 타일에 영수증 개수 표시 (날짜 오른쪽 아래에 작게)
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const key = date.toISOString().slice(0, 10);
      const count = receiptsByDate[key]?.length || 0;
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          height: '100%',
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}>
          <span style={{
            alignSelf: 'flex-start',
            margin: '4px 0 0 6px',
            fontSize: 14,
            fontWeight: 400,
            color: '#222'
          }}>{date.getDate()}일</span>
          {count > 0 && (
            <span style={{
              alignSelf: 'flex-end',
              margin: '0 6px 4px 0',
              fontSize: 14,
              fontWeight: 700,
              color: '#03a9f4'
            }}>{count}개</span>
          )}
        </div>
      );
    }
    return null;
  };

  // 오늘 버튼 클릭 시 현재 월로 이동
  const handleToday = () => {
    const today = new Date();
    setCalendarValue(today);
    setActiveStartDate(new Date(today.getFullYear(), today.getMonth(), 1));
    if (onMonthChange) onMonthChange(today);
  };

  // 월 변경 시 부모에 알림
  const handleActiveStartDateChange = ({ activeStartDate }) => {
    setActiveStartDate(activeStartDate);
    if (onMonthChange) onMonthChange(activeStartDate);
  };

  // 월별 총 지출/개수 계산
  const year = activeStartDate.getFullYear();
  const month = activeStartDate.getMonth();
  const filtered = receipts.filter(r => {
    const d = new Date(r.transaction_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const monthTotal = filtered.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  const monthCount = filtered.length;

  return (
    <div className="flex flex-col items-center w-full">
      {/* 월별 총 지출/영수증 개수 */}
      <div className="w-full text-left font-bold text-gray-800 text-base mb-2">
        월별 총 지출: <span className="text-blue-600">{monthTotal.toLocaleString()}원</span> / 영수증 <span className="text-blue-600">{monthCount}개</span>
      </div>
      <div className="relative w-full max-w-md bg-white rounded-lg shadow border border-gray-200 p-4">
        <Calendar
          value={calendarValue}
          onChange={setCalendarValue}
          onActiveStartDateChange={handleActiveStartDateChange}
          activeStartDate={activeStartDate}
          onClickDay={date => {
            const key = date.toISOString().slice(0, 10);
            if (receiptsByDate[key]) onDateClick(key, receiptsByDate[key]);
          }}
          tileContent={tileContent}
          // 캘린더 헤더에 오늘 버튼 추가
          navigationLabel={({ label }) => (
            <div className="flex items-center justify-between w-full">
              <span>{label}</span>
              <button
                type="button"
                onClick={handleToday}
                className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-300 hover:bg-blue-200 transition"
                style={{ minWidth: 40 }}
              >오늘</button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
