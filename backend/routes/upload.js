import express from 'express';
import multer from 'multer';
import { detectAndParse } from '../parsers/index.js';
import { query } from '../db.js';
import { detectTransfers } from '../services/transferDetector.js';
import { categorizeTransactions } from '../services/categorize.js';

const router = express.Router();

// Store file in memory (no disk writes needed — we parse immediately)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.csv') || ext.endsWith('.pdf') || ext.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, XLS, and PDF files are accepted.'));
    }
  },
});

/**
 * POST /upload
 * Accepts a bank statement file.
 * Parses → inserts → detects transfers → categorizes (3-pass).
 * Returns a full summary of what happened.
 */
router.post('/', upload.single('statement'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send field name: statement' });
  }

  const { originalname, buffer, mimetype } = req.file;

  try {
    // ── Step 1: Parse ─────────────────────────────────────
    const { bank, transactions } = detectAndParse(buffer, originalname, mimetype);

    if (!transactions.length) {
      return res.status(422).json({
        error: 'Parsed 0 transactions. Check file format or date range.',
        bank,
      });
    }

    // ── Step 2: Insert (skip duplicates) ──────────────────
    const insertedIds = await bulkInsert(transactions);

    if (!insertedIds.length) {
      return res.status(200).json({
        message: 'No new transactions — all rows already exist in DB.',
        bank,
        filename: originalname,
        parsed: transactions.length,
        inserted: 0,
        skipped: transactions.length,
      });
    }

    // ── Step 3: Transfer detection ────────────────────────
    const transferCount = await detectTransfers(insertedIds);

    // ── Step 4: 3-pass categorization ─────────────────────
    const categorizeSummary = await categorizeTransactions(insertedIds);

    return res.status(200).json({
      message: 'Upload successful',
      bank,
      filename: originalname,
      parsed: transactions.length,
      inserted: insertedIds.length,
      skipped: transactions.length - insertedIds.length,
      transfers_detected: transferCount,
      categorization: categorizeSummary,
      pending_review: (categorizeSummary?.pass2 ?? 0) + (categorizeSummary?.pass3 ?? 0),
      sample: transactions.slice(0, 3),
    });

  } catch (err) {
    console.error('[Upload] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── helpers ───────────────────────────────────────────────

/**
 * Bulk insert transactions, skip duplicates.
 * Returns array of inserted IDs (not skipped ones).
 */
async function bulkInsert(transactions) {
  const insertedIds = [];

  for (const txn of transactions) {
    const result = await query(
      `INSERT INTO transactions
         (date, merchant_raw, amount, debit_credit, bank, source_file)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (date, merchant_raw, amount, debit_credit, bank) DO NOTHING
       RETURNING id`,
      [txn.date, txn.merchant_raw, txn.amount, txn.debit_credit, txn.bank, txn.source_file]
    );
    if (result.rowCount > 0) {
      insertedIds.push(result.rows[0].id);
    }
  }

  return insertedIds;
}

export default router;
