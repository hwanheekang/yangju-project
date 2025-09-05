import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

const COLORS = [
  '#0078D4', '#00B4FF', '#6C63FF', '#FFB800', '#FF6B6B', '#00C49F', '#FF8C42', '#A259FF', '#FF5C8D', '#43E97B'
];

function groupByCategory(receipts) {
  const map = {};
  receipts.forEach(r => {
    const cat = r.category || '미분류';
    map[cat] = (map[cat] || 0) + (Number(r.total_amount) || 0);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

const ExpensePieChart = ({ receipts, selectedMonth, showTitle = true }) => {
  const dataArr = groupByCategory(receipts);
  // 현재 문서 테마 파악
  const rootEl = typeof document !== 'undefined' ? document.documentElement : null;
  const isDark = rootEl ? rootEl.getAttribute('data-theme') === 'dark' : false;
  const textColor = rootEl ? (getComputedStyle(rootEl).getPropertyValue('--text')?.trim() || (isDark ? '#e7eaf0' : '#222c3a')) : '#222c3a';
  const borderColor = rootEl ? (getComputedStyle(rootEl).getPropertyValue('--border')?.trim() || (isDark ? '#334155' : '#e3e8ee')) : '#e3e8ee';

  const data = {
    labels: dataArr.map(d => d.name),
    datasets: [
      {
        data: dataArr.map(d => d.value),
        backgroundColor: COLORS,
        borderWidth: 2,
        borderColor,
      }
    ]
  };

  // selectedMonth prop을 사용해 월 정보 추출
  const monthLabel = `${selectedMonth.getFullYear()}년 ${selectedMonth.getMonth() + 1}월 카테고리별 지출 비율`;

  return (
    <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
      {showTitle && (
        <h3 style={{ color: textColor, marginBottom: 10, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}>{monthLabel}</h3>
      )}
        <div style={{ width: '100%', maxWidth: 320, minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pie
            data={data}
            options={{
              plugins: {
                legend: {
                  labels: { color: textColor, font: { size: 15 }, boxWidth: 18, padding: 12, usePointStyle: true },
                  position: 'top',
                  align: 'start',
                  display: true,
                },
                tooltip: {
                  backgroundColor: isDark ? 'rgba(2,6,23,0.9)' : '#ffffff',
                  titleColor: isDark ? textColor : '#000000',
                  bodyColor: isDark ? textColor : '#000000',
                  borderColor: borderColor,
                  borderWidth: 1,
                  displayColors: false,
                  callbacks: {
                    label: ctx => {
                      const val = ctx.parsed;
                      const total = dataArr.reduce((sum, d) => sum + d.value, 0);
                      const percent = total ? ((val / total) * 100).toFixed(1) : 0;
                      return `${ctx.label}: ${val.toLocaleString()}원 (${percent}%)`;
                    }
                  }
                }
              }
            }}
            height={220}
          />
        </div>
    </div>
  );
};

export default ExpensePieChart;
