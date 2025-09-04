import { Router } from 'express';
import { requireAuth } from './middleware/auth.js';
import { sql, pool } from './db.js';

const preferencesRouter = Router();
preferencesRouter.use(requireAuth);

// GET /api/preferences/layout - get current user's layout order from Users.user_preferences (JSON)
preferencesRouter.get('/layout', async (req, res) => {
  const userId = req.user.id;
  try {
    const request = pool.request();
    request.input('user_id', sql.BigInt, userId);
    const result = await request.query('SELECT user_preferences FROM dbo.Users WHERE id = @user_id');
    const prefs = result.recordset[0]?.user_preferences || null;

    let layoutOrder = null;
    if (prefs) {
      try {
        const obj = JSON.parse(prefs);
        if (obj && Array.isArray(obj.layoutOrder)) {
          layoutOrder = obj.layoutOrder;
        }
      } catch (_) {
        // ignore parse errors, treat as no preferences
      }
    }

    res.json({ layoutOrder });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load preferences.' });
  }
});

// PUT /api/preferences/layout - set current user's layout order into Users.user_preferences (JSON)
preferencesRouter.put('/layout', async (req, res) => {
  const userId = req.user.id;
  const { layoutOrder } = req.body; // array of identifiers e.g., ['calendar','chart']
  if (!Array.isArray(layoutOrder) || layoutOrder.length === 0) {
    return res.status(400).json({ error: 'layoutOrder must be a non-empty array.' });
  }
  try {
    const jsonArray = JSON.stringify(layoutOrder);
    const request = pool.request();
    request.input('user_id', sql.BigInt, userId);
    request.input('layout_order', sql.NVarChar, jsonArray);

    // Ensure base JSON object, then set $.layoutOrder with JSON array
    await request.query(`
      UPDATE dbo.Users
      SET user_preferences = JSON_MODIFY(
            CASE WHEN user_preferences IS NULL OR LTRIM(RTRIM(user_preferences)) = '' THEN N'{}' ELSE user_preferences END,
            '$.layoutOrder', JSON_QUERY(@layout_order)
          )
      WHERE id = @user_id;
    `);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save preferences.' });
  }
});

export { preferencesRouter };
