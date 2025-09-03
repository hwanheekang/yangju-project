import { Router } from 'express';
import { requireAuth } from './middleware/auth.js';
import { sql, pool } from './db.js';

const receiptsRouter = Router();

receiptsRouter.use(requireAuth);

// GET /api/receipts - 로그인한 사용자의 영수증 목록 조회
receiptsRouter.get('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const request = pool.request();
    request.input('user_id', sql.BigInt, userId);
    const result = await request.query('SELECT * FROM receipts WHERE user_id = @user_id ORDER BY transaction_date DESC');
    res.json({ receipts: result.recordset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipts.' });
  }
});

// POST /api/receipts - 영수증 등록
receiptsRouter.post('/', async (req, res) => {
  const userId = req.user.id;
  const { store_name, total_amount, transaction_date, category, source_blob_url } = req.body;
  try {
    const request = pool.request();
    request.input('user_id', sql.BigInt, userId);
    request.input('store_name', sql.NVarChar, store_name);
    request.input('total_amount', sql.Decimal(12,2), total_amount);
    request.input('transaction_date', sql.DateTime2, transaction_date);
    request.input('category', sql.NVarChar, category);
    request.input('source_blob_url', sql.NVarChar, source_blob_url);
    const result = await request.query(
      `INSERT INTO receipts (user_id, store_name, total_amount, transaction_date, category, source_blob_url)
       OUTPUT INSERTED.*
       VALUES (@user_id, @store_name, @total_amount, @transaction_date, @category, @source_blob_url)`
    );
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create receipt.' });
  }
});

// PUT /api/receipts/:id - 영수증 수정
receiptsRouter.put('/:id', async (req, res) => {
  const userId = req.user.id;
  const receiptId = req.params.id;
  const { store_name, total_amount, transaction_date, category, source_blob_url } = req.body;
  try {
    const request = pool.request();
    request.input('id', sql.BigInt, receiptId);
    request.input('user_id', sql.BigInt, userId);
    request.input('store_name', sql.NVarChar, store_name);
    request.input('total_amount', sql.Decimal(12,2), total_amount);
    request.input('transaction_date', sql.DateTime2, transaction_date);
    request.input('category', sql.NVarChar, category);
    request.input('source_blob_url', sql.NVarChar, source_blob_url);
    const result = await request.query(
      `UPDATE receipts SET store_name=@store_name, total_amount=@total_amount, transaction_date=@transaction_date, category=@category, source_blob_url=@source_blob_url, updated_at=GETDATE()
       OUTPUT INSERTED.*
       WHERE id=@id AND user_id=@user_id`
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update receipt.' });
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
      `DELETE FROM receipts OUTPUT DELETED.* WHERE id=@id AND user_id=@user_id`
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