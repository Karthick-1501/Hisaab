import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /dashboard/summary
 * Query Params: month (YYYY-MM), defaults to current month
 * Returns:
 * {
 *   total_spend: 15000.50,
 *   total_income: 85000.00,
 *   spend_by_category: [{ category: 'Food & Dining', amount: 5000 }, ...]
 * }
 */
router.get('/summary', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      const date = new Date();
      month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const startDate = `${month}-01`;
    // PostgreSQL can calculate the end of the month
    
    // Total spend and income
    const { rows: totals } = await query(`
      SELECT 
        SUM(CASE WHEN debit_credit = 'DEBIT' THEN amount ELSE 0 END) as total_spend,
        SUM(CASE WHEN debit_credit = 'CREDIT' THEN amount ELSE 0 END) as total_income
      FROM transactions
      WHERE reviewed = true AND is_transfer = false 
        AND date >= $1::date AND date < ($1::date + INTERVAL '1 month')
    `, [startDate]);

    // Spend by category
    const { rows: categories } = await query(`
      SELECT category, SUM(amount) as amount
      FROM transactions
      WHERE reviewed = true AND is_transfer = false AND debit_credit = 'DEBIT'
        AND date >= $1::date AND date < ($1::date + INTERVAL '1 month')
        AND category IS NOT NULL
      GROUP BY category
      ORDER BY amount DESC
    `, [startDate]);

    res.json({
      total_spend: parseFloat(totals[0].total_spend || 0),
      total_income: parseFloat(totals[0].total_income || 0),
      spend_by_category: categories.map(c => ({
        category: c.category,
        amount: parseFloat(c.amount)
      }))
    });
  } catch (err) {
    console.error('[Dashboard] GET /summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /dashboard/chart
 * Query Params: month (YYYY-MM), defaults to current month
 * Returns daily spend data for the given month
 */
router.get('/chart', async (req, res) => {
  try {
    let { month } = req.query;
    if (!month) {
      const date = new Date();
      month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    const startDate = `${month}-01`;

    const { rows: dailySpend } = await query(`
      SELECT date, SUM(amount) as amount
      FROM transactions
      WHERE reviewed = true AND is_transfer = false AND debit_credit = 'DEBIT'
        AND date >= $1::date AND date < ($1::date + INTERVAL '1 month')
      GROUP BY date
      ORDER BY date ASC
    `, [startDate]);

    res.json(dailySpend.map(d => ({
      date: d.date.toISOString().split('T')[0],
      amount: parseFloat(d.amount)
    })));
  } catch (err) {
    console.error('[Dashboard] GET /chart error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
