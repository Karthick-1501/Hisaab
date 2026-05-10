import { query } from '../db.js';

/**
 * Transfer detector.
 *
 * After uploading a batch of statements, finds transactions where:
 *   - Same date
 *   - Same amount (within 1 rupee tolerance for rounding)
 *   - One is DEBIT, the other is CREDIT
 *   - From different banks (or same bank, different source files)
 *
 * These are almost certainly internal fund transfers (HDFC → SBI etc.)
 * and should NOT count as expenses.
 *
 * Flags both sides with is_transfer = true and inserts into bank_transfers table.
 *
 * @param {number[]} transactionIds - IDs just inserted in this upload batch
 */
export async function detectTransfers(transactionIds) {
  if (!transactionIds.length) return 0;

  // Look at the uploaded transactions alongside ALL existing transactions
  // from the same date range to catch cross-upload transfer pairs.
  const { rows: uploaded } = await query(
    `SELECT id, date, amount, debit_credit, bank, source_file
     FROM transactions
     WHERE id = ANY($1::int[])`,
    [transactionIds]
  );

  if (!uploaded.length) return 0;

  // Get date range of this batch to limit the cross-match query
  const dates = uploaded.map((t) => t.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  // Fetch all transactions in that date range (including previously uploaded ones)
  const { rows: candidates } = await query(
    `SELECT id, date, amount, debit_credit, bank, source_file
     FROM transactions
     WHERE date BETWEEN $1 AND $2
       AND is_transfer = false`,
    [minDate, maxDate]
  );

  const flaggedIds = new Set();
  const transfers = [];

  // Group by date → check for DEBIT/CREDIT pairs with matching amounts
  const byDate = groupBy(candidates, (t) => t.date);

  for (const [date, txns] of Object.entries(byDate)) {
    const debits = txns.filter((t) => t.debit_credit === 'DEBIT');
    const credits = txns.filter((t) => t.debit_credit === 'CREDIT');

    for (const debit of debits) {
      for (const credit of credits) {
        // Skip if already flagged or same transaction
        if (flaggedIds.has(debit.id) || flaggedIds.has(credit.id)) continue;
        if (debit.id === credit.id) continue;

        // Amount match within ₹1 tolerance (some banks round differently)
        const amountMatch = Math.abs(
          parseFloat(debit.amount) - parseFloat(credit.amount)
        ) < 1.0;

        if (!amountMatch) continue;

        // At least one must be from the newly uploaded batch
        const isNewBatch =
          transactionIds.includes(debit.id) ||
          transactionIds.includes(credit.id);

        if (!isNewBatch) continue;

        // If same bank AND same source file — not a transfer (could be refund)
        // If different bank OR different source file — likely a transfer
        const differentSource =
          debit.bank !== credit.bank ||
          debit.source_file !== credit.source_file;

        if (!differentSource) continue;

        flaggedIds.add(debit.id);
        flaggedIds.add(credit.id);

        transfers.push({
          date,
          amount: debit.amount,
          from_bank: debit.bank,
          to_bank: credit.bank,
          debit_id: debit.id,
          credit_id: credit.id,
        });
      }
    }
  }

  if (!transfers.length) return 0;

  // Flag transactions as transfers
  const allFlaggedIds = [...flaggedIds];
  await query(
    `UPDATE transactions
     SET is_transfer = true, reviewed = true
     WHERE id = ANY($1::int[])`,
    [allFlaggedIds]
  );

  // Insert into bank_transfers table for record
  for (const t of transfers) {
    await query(
      `INSERT INTO bank_transfers (date, amount, from_bank, to_bank)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [t.date, t.amount, t.from_bank, t.to_bank]
    );
    console.log(
      `[Transfers] Flagged ₹${t.amount} on ${t.date} — ${t.from_bank} → ${t.to_bank}`
    );
  }

  return transfers.length;
}

// ── helpers ───────────────────────────────────────────────

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = String(keyFn(item));
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
