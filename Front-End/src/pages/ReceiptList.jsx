import React from 'react';

const ReceiptList = ({ receipts, onItemClick }) => (
  <div style={{ flex: 1, overflowY: 'auto', marginTop: 8 }}>
    {receipts.length === 0 ? (
      <div className="text-muted" style={{ textAlign: 'center', marginTop: 40 }}>영수증이 없습니다.</div>
    ) : (
      receipts.map(r => (
        <div className="receipt-item" key={r.id} onClick={() => onItemClick?.(r)}>
          <div className="receipt-store">{r.storeName}</div>
          <div className="receipt-amount">{Number(r.totalAmount).toLocaleString()}원</div>
          <div className="receipt-meta">
            {r.transactionDate} | {r.category || '미분류'}
          </div>
        </div>
      ))
    )}
  </div>
);

export default ReceiptList;
