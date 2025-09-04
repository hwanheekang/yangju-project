import { Router } from 'express';
import { requireAuth } from './middleware/auth.js';
import { sql, pool } from './db.js';

const receiptsRouter = Router();

receiptsRouter.use(requireAuth);

// Azure Document Intelligence 결과를 파싱하는 함수
function parseReceipt(apiResult) {
    const fields = apiResult.documents[0].fields;
  const storeName = fields.store_name?.content || 'N/A';
  // 금액에 절대값 적용
  const totalAmountRaw = parseFloat(String(fields.total_amount?.content).replace(/[^0-9.-]/g, '')) || 0;
  const totalAmount = Math.abs(totalAmountRaw);
  // 거래일자에서 년월일만 추출
  const transactionDate = formatDate(fields.transaction_date?.content);

  return {
    storeName,
    totalAmount,
    transactionDate
  };
}

// 날짜 포맷팅 함수 (formatDate가 없다면 추가)
function formatDate(dateString) {
  if (!dateString) return null;
  try {
    // YYYY-MM-DD만 추출
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    // pad month/day
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (error) {
    return null;
  }
}

// GET /api/receipts - 로그인한 사용자의 영수증 목록 조회
receiptsRouter.get('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const request = pool.request();
    request.input('user_id', sql.BigInt, userId);
  const result = await request.query('SELECT * FROM Receipts WHERE user_id = @user_id ORDER BY transaction_date DESC');
    res.json({ receipts: result.recordset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipts.' });
  }
});

// POST /api/receipts - 영수증 등록
receiptsRouter.post('/', async (req, res) => {
  const userId = req.user.id;
  let { store_name, total_amount, transaction_date, source_blob_url, category } = req.body;
  // robust: category가 undefined/null/빈문자열/'-- 선택 --'이면 '미분류'로 저장
  if (!category || typeof category !== 'string' || category.trim() === '' || category === '-- 선택 --') {
    category = '미분류';
  }
  // 금액에 절대값 적용
  total_amount = Math.abs(parseFloat(total_amount) || 0);
  // 거래일자에서 년월일만 추출
  if (transaction_date) {
    try {
      const d = new Date(transaction_date);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        transaction_date = `${yyyy}-${mm}-${dd}`;
      }
    } catch (e) {}
  }
  try {
    console.log('영수증 등록 요청 데이터:', { userId, store_name, total_amount, transaction_date, source_blob_url, category });
    const request = pool.request();
    request.input('user_id', sql.BigInt, userId);
    request.input('store_name', sql.NVarChar, store_name);
    request.input('total_amount', sql.Decimal(12,2), total_amount);
    request.input('transaction_date', sql.DateTime2, transaction_date);
    request.input('source_blob_url', sql.NVarChar, source_blob_url);
    request.input('category', sql.NVarChar, category);
    const result = await request.query(
      `INSERT INTO Receipts (user_id, store_name, total_amount, transaction_date, source_blob_url, category)
       OUTPUT INSERTED.*
       VALUES (@user_id, @store_name, @total_amount, @transaction_date, @source_blob_url, @category)`
    );
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('영수증 등록 실패:', error);
    res.status(500).json({ error: 'Failed to create receipt.', details: error.message });
  }
});

// PUT /api/receipts/:id - 영수증 수정
receiptsRouter.put('/:id', async (req, res) => {
  const userId = req.user.id;
  const receiptId = req.params.id;
  let { store_name, total_amount, transaction_date, category, source_blob_url, memo } = req.body;
  try {
    // robust: total_amount 숫자 변환
    total_amount = Math.abs(parseFloat(total_amount) || 0);
    // robust: transaction_date YYYY-MM-DD 형식 변환
    if (transaction_date) {
      const d = new Date(transaction_date);
      if (!isNaN(d)) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        transaction_date = `${yyyy}-${mm}-${dd}`;
      }
    } else {
      transaction_date = null;
    }
    // robust: source_blob_url이 undefined/null이면 기존 값 유지
    let existingSourceBlobUrl = source_blob_url;
    if (!source_blob_url) {
      // 기존 값 조회
      const getReq = pool.request();
      getReq.input('id', sql.BigInt, receiptId);
      getReq.input('user_id', sql.BigInt, userId);
      const getResult = await getReq.query('SELECT source_blob_url FROM Receipts WHERE id=@id AND user_id=@user_id');
      if (getResult.recordset.length > 0) {
        existingSourceBlobUrl = getResult.recordset[0].source_blob_url;
      } else {
        existingSourceBlobUrl = '';
      }
    }
    const request = pool.request();
    request.input('id', sql.BigInt, receiptId);
    request.input('user_id', sql.BigInt, userId);
    request.input('store_name', sql.NVarChar, store_name);
    request.input('total_amount', sql.Decimal(12,2), total_amount);
    request.input('transaction_date', sql.DateTime2, transaction_date);
    request.input('category', sql.NVarChar, category);
    request.input('source_blob_url', sql.NVarChar, existingSourceBlobUrl);
    request.input('memo', sql.NVarChar, memo ?? null);
    const result = await request.query(
      `UPDATE Receipts SET store_name=@store_name, total_amount=@total_amount, transaction_date=@transaction_date, category=@category, source_blob_url=@source_blob_url, memo=@memo, updated_at=GETDATE()
       OUTPUT INSERTED.*
       WHERE id=@id AND user_id=@user_id`
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update receipt.', details: error.message });
  }
});

// PATCH /api/receipts/:id - 영수증 카테고리 업데이트
receiptsRouter.patch('/:id', async (req, res) => {
  const userId = req.user.id;
  const receiptId = req.params.id;
  const { category } = req.body;
  
  if (!category) {
    return res.status(400).json({ error: 'Category is required.' });
  }
  
  try {
    const request = pool.request();
    request.input('id', sql.BigInt, receiptId);
    request.input('user_id', sql.BigInt, userId);
    request.input('category', sql.NVarChar, category);
    
    const result = await request.query(
      `UPDATE Receipts SET category=@category, updated_at=GETDATE()
       OUTPUT INSERTED.*
       WHERE id=@id AND user_id=@user_id`
    );
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update receipt category.' });
  }
});

receiptsRouter.delete('/:id', async (req, res) => {
  const userId = req.user.id;
  const receiptId = req.params.id;
  try {
    const request = pool.request();
    request.input('id', sql.BigInt, receiptId);
    request.input('user_id', sql.BigInt, userId);
    const result = await request.query(
      `DELETE FROM Receipts OUTPUT DELETED.* WHERE id=@id AND user_id=@user_id`
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete receipt.' });
  }
});
export { receiptsRouter };