import { query } from '../db.js';
import { matchKeyword } from './keywords.js';
import { categorizeBatch } from './gemini.js';

/**
 * 3-pass categorization engine.
 *
 * PASS 1 — History lookup (zero API calls)
 *   Query merchant_map. If hit_count >= 3, use stored category.
 *   Auto-marks reviewed = true (you confirmed this merchant 3+ times before).
 *
 * PASS 2 — Keyword rules (zero API calls)
 *   Match against categories.json alias map.
 *   Sets ai_suggestion + confidence 90, reviewed = false (goes to review queue).
 *
 * PASS 3 — Gemini Flash (only for unknown merchants)
 *   Batched via Promise.all(). Falls back to "Other" on failure.
 *   Sets ai_suggestion + confidence from AI, reviewed = false.
 *
 * @param {number[]} transactionIds - IDs of newly inserted (uncategorized) transactions
 */
export async function categorizeTransactions(transactionIds) {
  if (!transactionIds.length) return;

  // Fetch the transactions we need to categorize
  const { rows: transactions } = await query(
    `SELECT id, merchant_raw, amount FROM transactions
     WHERE id = ANY($1::int[]) AND is_transfer = false AND category IS NULL`,
    [transactionIds]
  );

  if (!transactions.length) return;

  const needsPass2 = [];
  const needsPass3 = [];

  // ── PASS 1: History lookup ─────────────────────────────────
  for (const txn of transactions) {
    const { rows } = await query(
      `SELECT category, hit_count FROM merchant_map
       WHERE merchant_raw = $1`,
      [txn.merchant_raw]
    );

    if (rows.length > 0 && rows[0].hit_count >= 3) {
      // Trusted history — auto-confirm, skip review queue
      await query(
        `UPDATE transactions
         SET category = $1, reviewed = true
         WHERE id = $2`,
        [rows[0].category, txn.id]
      );
      console.log(`[Pass 1] "${txn.merchant_raw}" → ${rows[0].category} (auto-confirmed)`);
    } else {
      needsPass2.push(txn);
    }
  }

  // ── PASS 2: Keyword rules ──────────────────────────────────
  for (const txn of needsPass2) {
    const match = matchKeyword(txn.merchant_raw);

    if (match) {
      await query(
        `UPDATE transactions
         SET ai_suggestion = $1, ai_confidence = $2, reviewed = false
         WHERE id = $3`,
        [match.category, match.confidence, txn.id]
      );
      console.log(`[Pass 2] "${txn.merchant_raw}" → ${match.category} (${match.confidence}%)`);
    } else {
      needsPass3.push(txn);
    }
  }

  // ── PASS 3: Gemini Flash ───────────────────────────────────
  if (needsPass3.length > 0) {
    console.log(`[Pass 3] Calling Gemini for ${needsPass3.length} unknown merchants...`);

    let geminiResults = [];

    try {
      geminiResults = await categorizeBatch(needsPass3);
    } catch (err) {
      // Gemini completely unavailable — fall back to "Other" for all
      console.error('[Pass 3] Gemini batch failed entirely:', err.message);
      geminiResults = needsPass3.map((t) => ({ id: t.id, category: 'Other', confidence: 0 }));
    }

    for (const result of geminiResults) {
      await query(
        `UPDATE transactions
         SET ai_suggestion = $1, ai_confidence = $2, reviewed = false
         WHERE id = $3`,
        [result.category, result.confidence, result.id]
      );
      const txn = needsPass3.find((t) => t.id === result.id);
      console.log(`[Pass 3] "${txn?.merchant_raw}" → ${result.category} (${result.confidence}%)`);
    }
  }

  const summary = {
    total: transactions.length,
    pass1: transactions.length - needsPass2.length,
    pass2: needsPass2.length - needsPass3.length,
    pass3: needsPass3.length,
  };

  console.log(
    `[Categorize] Done — Pass1: ${summary.pass1}, Pass2: ${summary.pass2}, Pass3: ${summary.pass3}`
  );

  return summary;
}
