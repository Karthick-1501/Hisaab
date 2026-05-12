import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /transactions
 * Returns paginated reviewed transactions.
 * Query Params: page, limit, category, month
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const { category, month, date } = req.query;
    
    let whereClause = "WHERE reviewed = true AND is_transfer = false";
    let params = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (date) {
      whereClause += ` AND date = $${paramIndex}::date`;
      params.push(date);
      paramIndex++;
    } else if (month) {
      whereClause += ` AND date >= $${paramIndex}::date AND date < ($${paramIndex}::date + INTERVAL '1 month')`;
      params.push(`${month}-01`);
      paramIndex++;
    }

    // Get total count for pagination
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM transactions ${whereClause}`, params);
    const total = parseInt(countRows[0].count);

    // Get rows
    const { rows } = await query(`
      SELECT id, date, merchant_raw, amount, debit_credit, bank, category 
      FROM transactions 
      ${whereClause} 
      ORDER BY date DESC, id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    res.json({
      transactions: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('[Transactions] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
