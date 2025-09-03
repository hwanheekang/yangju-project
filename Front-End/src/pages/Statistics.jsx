// src/pages/Statistics.jsx

import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend);

const CATEGORY_COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9'
];

function getCategoryStats(receipts, categories) {
  // 카테고리별 합계 계산
  const stats = {};
  categories.forEach(cat => { stats[cat] = 0; });
  receipts.forEach(r => {
    const cat = r.category || '분류 대기';
    if (stats[cat] !== undefined) {
      stats[cat] += Number(r.total_amount) || 0;
    }
  });
  return stats;
}

const Statistics = ({ receipts, categories }) => {
  const stats = getCategoryStats(receipts, categories);
  const filtered = Object.entries(stats).filter(([cat, amt]) => amt > 0);
  const data = {
    labels: filtered.map(([cat]) => cat),
    datasets: [
      {
        data: filtered.map(([_, amt]) => amt),
        backgroundColor: CATEGORY_COLORS.slice(0, filtered.length),
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <h2>📊 카테고리별 지출내역 통계</h2>
      {filtered.length === 0 ? (
        <p>지출 내역이 없습니다.</p>
      ) : (
        <Pie data={data} />
      )}
    </div>
  );
};

export default Statistics;