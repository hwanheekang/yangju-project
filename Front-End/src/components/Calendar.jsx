import React, { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../calendar-override.css';

function groupReceiptsByDate(receipts) {
  const map = {};
  receipts.forEach(r => {
    // DB에서 YYYY-MM-DD로 들어온 날짜를 그대로 key로 사용
    const date = r.transaction_date.slice(0, 10);
    if (!map[date]) map[date] = [];
    map[date].push(r);
  });
  return map;
}

export default function ReceiptCalendar({ receipts, onDateClick, onMonthChange, hideSummary = false }) {
  const [calendarValue, setCalendarValue] = useState(new Date());
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month' | 'year' | 'decade'
  const receiptsByDate = useMemo(() => groupReceiptsByDate(receipts), [receipts]);

  // 타일 커스텀 콘텐츠 제거: 기본 abbr를 중앙에 표시
  const tileContent = () => null;

  // 오늘 버튼 클릭 시 현재 월로 이동
  const handleToday = () => {
    const today = new Date();
    setCalendarValue(today);
    setActiveStartDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setView('month');
    if (onMonthChange) onMonthChange(today);
  };

  // 월 변경 시 부모에 알림
  const handleActiveStartDateChange = ({ activeStartDate }) => {
    setActiveStartDate(activeStartDate);
    if (view === 'month' && onMonthChange) onMonthChange(activeStartDate);
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

  // Month-only arrows ‹ › (no « » year jump buttons)
  const shift = (dir) => {
    if (view === 'month') {
      const d = new Date(year, month + dir, 1);
      setActiveStartDate(d);
      if (onMonthChange) onMonthChange(d);
    } else if (view === 'year') {
      // move by one year grid
      setActiveStartDate(new Date(year + dir, month, 1));
    } else if (view === 'decade') {
      // move by one decade grid
      setActiveStartDate(new Date(year + dir * 10, month, 1));
    }
  };

  return (
  <div className="flex flex-col items-center w-full" style={{ width: '100%' }}>
      {!hideSummary && (
        <div className="w-full max-w-md flex items-center justify-center gap-2 mb-2 calendar-header-summary">
          <div className="font-bold text-gray-800 text-base text-center flex-1">
            월별 총 지출: <span className="text-blue-600">{monthTotal.toLocaleString()}원</span> / 영수증 <span className="text-blue-600">{monthCount}개</span>
          </div>
        </div>
      )}
  <div className="relative w-full rounded-lg shadow p-4 calendar-card" style={{ width: '100%' }}>
        {/* Custom navigation (no year jump buttons) */}
        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => shift(-1)} aria-label="prev">‹</button>
          <div className="nav-center">
            <span className="nav-year" onClick={() => setView('decade')}>{year}년</span>
            <span className="nav-month" onClick={() => setView('year')}>{month + 1}월</span>
          </div>
          <div className="nav-right">
            <button className="nav-btn" onClick={() => shift(1)} aria-label="next">›</button>
            <button className="today-btn" onClick={handleToday}>Today</button>
          </div>
        </div>
        <Calendar
          locale="en-US"
          value={calendarValue}
          onChange={setCalendarValue}
          onActiveStartDateChange={handleActiveStartDateChange}
          activeStartDate={activeStartDate}
          showNavigation={false}
          view={view}
          onViewChange={({ view }) => setView(view)}
          onClickYear={(value) => { setActiveStartDate(new Date(value.getFullYear(), month, 1)); setView('year'); }}
          onClickMonth={(value) => { setActiveStartDate(new Date(value.getFullYear(), value.getMonth(), 1)); setView('month'); if (onMonthChange) onMonthChange(value); }}
          onClickDay={date => {
            // YYYY-MM-DD key 생성 (로컬 기준)
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const key = `${yyyy}-${mm}-${dd}`;
            if (receiptsByDate[key]) onDateClick(key, receiptsByDate[key]);
          }}
          tileContent={tileContent}
      tileClassName={({ date, view }) => {
            if (view !== 'month') return '';
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const key = `${yyyy}-${mm}-${dd}`;
            const hasReceipts = !!(receiptsByDate[key]?.length);

            const classes = [];
            const isCurrentMonth = date.getMonth() === activeStartDate.getMonth() && date.getFullYear() === activeStartDate.getFullYear();
            if (!isCurrentMonth) {
        classes.push('calendar-gray');
            } else {
              const day = date.getDay();
        if (day === 0) classes.push('calendar-red');
        else if (day === 6) classes.push('calendar-blue');
        else classes.push('calendar-black');
            }
            if (hasReceipts) classes.push('has-receipts');
            return classes.join(' ');
          }}
          navigationLabel={({ label }) => (
            <div className="flex items-center justify-center w-full">
              <span>{label}</span>
            </div>
          )}
        />
      </div>
    </div>
  );
}
