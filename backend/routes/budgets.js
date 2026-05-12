import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /budgets
 * Query Params: month (YYYY-MM), defaults to current month
 */
router.get('/', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      const date = new Date();
      month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const startDate = `${month}-01`;

    // Get budgets joined with actual spend
    const { rows: budgets } = await query(`
      SELECT 
        b.id,
        b.category,
        b.budget_amount,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      LEFT JOIN transactions t 
        ON t.category = b.category 
        AND t.debit_credit = 'DEBIT' 
        AND t.reviewed = true 
        AND t.is_transfer = false
        AND t.date >= $1::date AND t.date < ($1::date + INTERVAL '1 month')
      WHERE b.month = $1::date
      GROUP BY b.id, b.category, b.budget_amount
    `, [startDate]);

    res.json(budgets.map(b => ({
      ...b,
      budget_amount: parseFloat(b.budget_amount),
      spent: parseFloat(b.spent)
    })));
  } catch (err) {
    console.error('[Budgets] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /budgets
 * Create or update a budget
 * Body: { month: '2025-04-01', category: 'Food & Dining', budget_amount: 5000 }
 */
router.post('/', async (req, res) => {
  try {
    const { month, category, budget_amount } = req.body;
    
    if (!month || !category || budget_amount == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert 'YYYY-MM' to 'YYYY-MM-01' if needed
    const monthDate = month.length === 7 ? `${month}-01` : month;

    const { rows } = await query(`
      INSERT INTO budgets (month, category, budget_amount)
      VALUES ($1::date, $2, $3)
      ON CONFLICT (month, category) 
      DO UPDATE SET budget_amount = EXCLUDED.budget_amount
      RETURNING *
    `, [monthDate, category, budget_amount]);

    res.json(rows[0]);
  } catch (err) {
    console.error('[Budgets] POST / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
