import React from 'react';
import apiFetch from '../api';

export default function MonthlyCategoryCard({ year, month, renderAsCard = true }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiFetch(`/analytics/monthly-category?year=${year}&month=${month}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e.message || '로드 실패');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  React.useEffect(() => { load(); }, [load]);

  const totalCount = items.reduce((a, b) => a + (b.frequency || 0), 0);
  const totalAmount = items.reduce((a, b) => a + (b.monetary || 0), 0);

  const y2 = String(year).slice(-2);

  const content = (
    <>
        <div className="text-muted" style={{ margin: '4px 0 12px 0' }}>
          총 {totalCount.toLocaleString()}건, 합계 {totalAmount.toLocaleString()}원
        </div>
        {loading && <div className="text-muted">불러오는 중…</div>}
        {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
        {!loading && !error && (
      <div style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: 320, borderTop: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
          <th style={{ padding: '8px 6px 8px 8px', fontSize: '13px', lineHeight: 1.2, whiteSpace: 'nowrap', width: '34%', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>카테고리</th>
          <th style={{ padding: '8px 8px 8px 6px', fontSize: '13px', lineHeight: 1.2, whiteSpace: 'nowrap', width: '12%', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>횟수</th>
                  <th style={{ padding: '8px 8px', fontSize: '13px', lineHeight: 1.2, whiteSpace: 'nowrap', width: '25%', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>합계</th>
                  <th style={{ padding: '8px 8px', fontSize: '13px', lineHeight: 1.2, whiteSpace: 'nowrap', width: '25%', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>최근거래</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted" style={{ padding: '12px 8px' }}>데이터가 없습니다.</td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.category} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '8px 6px 8px 8px', fontWeight: 600, fontSize: '14px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.category}</td>
            <td style={{ padding: '8px 8px 8px 6px', fontSize: '14px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{Number(it.frequency).toLocaleString()}회</td>
                      <td style={{ padding: '8px 8px', fontSize: '14px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{Number(it.monetary).toLocaleString()}원</td>
                      <td style={{ padding: '8px 8px', fontSize: '14px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{it.last_transaction_date ? String(it.last_transaction_date).slice(0,10) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
    </>
  );

  if (!renderAsCard) {
    return content;
  }

  return (
    <section className="block card" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="block-header" style={{ borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {y2}년 {month}월 전체 사용자 카테고리 요약
      </div>
      <div className="block-body" style={{ display: 'block' }}>
        {content}
      </div>
    </section>
  );
}
