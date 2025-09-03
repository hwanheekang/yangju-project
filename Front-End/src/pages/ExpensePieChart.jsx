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
    map[cat] = (map[cat] || 0) + (Number(r.totalAmount) || 0);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

const ExpensePieChart = ({ receipts }) => {
  const dataArr = groupByCategory(receipts);
  const data = {
    labels: dataArr.map(d => d.name),
    datasets: [
      {
        data: dataArr.map(d => d.value),
        backgroundColor: COLORS,
        borderWidth: 2,
        borderColor: '#181c24',
      }
    ]
  };

  return (
    <div>
      <h3 style={{ color: '#fff', marginBottom: 18 }}>카테고리별 지출 비율</h3>
      <Pie
        data={data}
        options={{
          plugins: {
            legend: {
              labels: { color: '#fff', font: { size: 15 } }
            },
            tooltip: {
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
  );
};

export default ExpensePieChart;
