import { Router } from 'express';
import { requireAuth } from './middleware/auth.js';
import { sql, pool } from './db.js';

const analyticsRouter = Router();

// Protect analytics with auth (but aggregates across all users)
analyticsRouter.use(requireAuth);

// GET /api/analytics/monthly-category?year=YYYY&month=MM
// Returns aggregated counts and amounts by category for the given month across ALL users
analyticsRouter.get('/monthly-category', async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1); // 1-12

    const request = pool.request();
    request.input('year', sql.Int, year);
    request.input('month', sql.Int, month);

    const query = `
      SELECT
        COALESCE(NULLIF(category, N''), N'미분류') AS category,
        COUNT_BIG(*) AS frequency,
        SUM(COALESCE(TRY_CONVERT(DECIMAL(12,2), total_amount), 0)) AS monetary,
        MAX(transaction_date) AS last_transaction_date
      FROM Receipts
      WHERE YEAR(transaction_date) = @year AND MONTH(transaction_date) = @month
      GROUP BY COALESCE(NULLIF(category, N''), N'미분류')
      ORDER BY monetary DESC, frequency DESC;
    `;

    const result = await request.query(query);
    return res.json({
  year,
  month,
      items: result.recordset.map(r => ({
        category: r.category,
        frequency: Number(r.frequency) || 0,
        monetary: Number(r.monetary) || 0,
        last_transaction_date: r.last_transaction_date
      }))
    });
  } catch (err) {
    console.error('Analytics monthly-category error:', err);
    return res.status(500).json({ error: 'Failed to compute monthly category analytics', details: err.message });
  }
});

export { analyticsRouter };
