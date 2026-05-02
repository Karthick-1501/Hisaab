import express from 'express';
import multer from 'multer';
import { detectAndParse } from '../parsers/index.js';
import { query } from '../db.js';

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
 * Parses it, inserts transactions into DB, returns summary.
 */
router.post('/', upload.single('statement'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send field name: statement' });
  }

  const { originalname, buffer, mimetype } = req.file;

  try {
    // 1. Detect bank + parse into transaction objects
    const { bank, transactions } = detectAndParse(buffer, originalname, mimetype);

    if (!transactions.length) {
      return res.status(422).json({
        error: 'Parsed 0 transactions. Check file format or date range.',
        bank,
      });
    }

    // 2. Bulk insert — skip duplicates (same date + merchant + amount + bank)
    const inserted = await bulkInsert(transactions);

    return res.status(200).json({
      message: 'Upload successful',
      bank,
      filename: originalname,
      parsed: transactions.length,
      inserted: inserted.count,
      skipped: transactions.length - inserted.count,
      sample: transactions.slice(0, 3), // preview first 3 rows
    });

  } catch (err) {
    console.error('[Upload] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── helpers ───────────────────────────────────────────────

async function bulkInsert(transactions) {
  let count = 0;

  // Insert one by one with conflict skip.
  // For Phase 1 this is fine — transactions per upload are small.
  // Phase 2+ can batch with unnest() if needed.
  for (const txn of transactions) {
    const result = await query(
      `INSERT INTO transactions
         (date, merchant_raw, amount, debit_credit, bank, source_file)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [txn.date, txn.merchant_raw, txn.amount, txn.debit_credit, txn.bank, txn.source_file]
    );
    if (result.rowCount > 0) count++;
  }

  return { count };
}

export default router;
