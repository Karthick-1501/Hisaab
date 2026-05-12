import express from 'express';
import { query } from '../db.js';
import { getCategories } from '../services/keywords.js';

const router = express.Router();

/**
 * GET /review/pending
 *
 * Returns all unreviewed transactions ordered newest first.
 * Excludes internal transfers (is_transfer = true).
 *
 * Response:
 * {
 *   total: 12,
 *   transactions: [
 *     {
 *       id, date, merchant_raw, amount, debit_credit, bank,
 *       ai_suggestion, ai_confidence
 *     }, ...
 *   ]
 * }
 */
router.get('/pending', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         id, date, merchant_raw, amount, debit_credit, bank,
         ai_suggestion, ai_confidence
       FROM transactions
       WHERE reviewed = false
         AND is_transfer = false
       ORDER BY date DESC, created_at DESC`
    );

    res.json({ total: rows.length, transactions: rows });
  } catch (err) {
    console.error('[Review] GET /pending error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /review/stats
 *
 * Returns summary counts for the review dashboard header.
 * Response: { pending, reviewed_today, total, auto_confirmed }
 */
router.get('/stats', async (_req, res) => {
  try {
    const pending = await query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE reviewed = false AND is_transfer = false`
    );

    const reviewedToday = await query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE reviewed = true AND is_transfer = false
         AND created_at::date = CURRENT_DATE`
    );

    const total = await query(
      `SELECT COUNT(*) as count FROM transactions
       WHERE is_transfer = false`
    );

    const autoConfirmed = await query(
      `SELECT COUNT(*) as count FROM merchant_map
       WHERE hit_count >= 3`
    );

    res.json({
      pending: parseInt(pending.rows[0].count),
      reviewed_today: parseInt(reviewedToday.rows[0].count),
      total: parseInt(total.rows[0].count),
      auto_confirmed: parseInt(autoConfirmed.rows[0].count),
    });
  } catch (err) {
    console.error('[Review] GET /stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /review/:id
 *
 * Confirm or correct a transaction's category.
 * Body: { "category": "Food & Dining" }
 *
 * Side effects:
 *   - Sets transaction.category = confirmed category
 *   - Sets transaction.reviewed = true
 *   - Upserts merchant_map (increments hit_count on repeat confirmations)
 *
 * Response: { id, merchant_raw, category, hit_count }
 */
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { category } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Invalid transaction id' });
  }

  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'Body must include: { "category": "..." }' });
  }

  // Validate against known categories
  const validCategories = getCategories();
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: `Unknown category "${category}". Valid: ${validCategories.join(', ')}`,
    });
  }

  try {
    // Fetch the transaction first
    const { rows: txnRows } = await query(
      `SELECT id, merchant_raw FROM transactions WHERE id = $1`,
      [id]
    );

    if (!txnRows.length) {
      return res.status(404).json({ error: `Transaction ${id} not found` });
    }

    const { merchant_raw } = txnRows[0];

    // 1. Confirm the transaction
    await query(
      `UPDATE transactions
       SET category = $1, reviewed = true
       WHERE id = $2`,
      [category, id]
    );

    // 2. Upsert merchant_map — increment hit_count on repeat confirmations
    await query(
      `INSERT INTO merchant_map (merchant_raw, category, hit_count, updated_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (merchant_raw)
       DO UPDATE SET
         category   = EXCLUDED.category,
         hit_count  = merchant_map.hit_count + 1,
         updated_at = NOW()`,
      [merchant_raw, category]
    );

    // 3. Read back the hit_count for the response
    const { rows: mapRows } = await query(
      `SELECT hit_count FROM merchant_map WHERE merchant_raw = $1`,
      [merchant_raw]
    );

    const hit_count = mapRows[0]?.hit_count ?? 1;

    res.json({
      id,
      merchant_raw,
      category,
      hit_count,
      auto_confirm_after: hit_count >= 3
        ? 'Active — this merchant is now auto-confirmed on future uploads'
        : `${3 - hit_count} more confirmation(s) until auto-confirm`,
    });

  } catch (err) {
    console.error('[Review] PATCH error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /review/bulk
 *
 * Confirm multiple transactions at once with the same category.
 * Body: { "ids": [1, 2, 3], "category": "Food & Dining" }
 *
 * Useful for accepting all high-confidence keyword matches in one action.
 */
router.patch('/', async (req, res) => {
  const { ids, category } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Body must include: { "ids": [...], "category": "..." }' });
  }

  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'Body must include: { "category": "..." }' });
  }

  const validCategories = getCategories();
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: `Unknown category "${category}". Valid: ${validCategories.join(', ')}`,
    });
  }

  try {
    // 1. Update all transactions
    const result = await query(
      `UPDATE transactions
       SET category = $1, reviewed = true
       WHERE id = ANY($2::int[]) AND reviewed = false
       RETURNING id, merchant_raw`,
      [category, ids]
    );

    // 2. Upsert merchant_map for each unique merchant
    const merchants = [...new Set(result.rows.map(r => r.merchant_raw))];
    for (const merchant of merchants) {
      await query(
        `INSERT INTO merchant_map (merchant_raw, category, hit_count, updated_at)
         VALUES ($1, $2, 1, NOW())
         ON CONFLICT (merchant_raw)
         DO UPDATE SET
           category   = EXCLUDED.category,
           hit_count  = merchant_map.hit_count + 1,
           updated_at = NOW()`,
        [merchant, category]
      );
    }

    res.json({
      confirmed: result.rowCount,
      category,
      ids: result.rows.map(r => r.id),
    });

  } catch (err) {
    console.error('[Review] PATCH /bulk error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /review/categories
 *
 * Returns the valid category list for the frontend category picker.
 */
router.get('/categories', (_req, res) => {
  res.json({ categories: getCategories() });
});

export default router;
