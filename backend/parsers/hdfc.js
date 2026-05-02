import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { cleanMerchant } from '../services/cleanMerchant.js';

/**
 * HDFC parser — handles both CSV and XLS formats.
 *
 * XLS (mobile app):  header at row 20, data from row 22, amounts already numeric
 * CSV (net banking): header sniffed by content, amounts are strings with commas
 * Date format both:  DD/MM/YY
 */

// ── XLS entry point ───────────────────────────────────────

export function parseHDFCXls(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to 2D array — no header, raw values
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // Find the header row (contains "Date" and "Narration")
  const headerIndex = rows.findIndex(
    (r) => r && r[0] && String(r[0]).trim() === 'Date' && r[1] && String(r[1]).trim() === 'Narration'
  );

  if (headerIndex === -1) {
    throw new Error('HDFC XLS: Could not find header row. Check file format.');
  }

  // Data starts 2 rows after header (header + separator row of ***)
  const dataRows = rows.slice(headerIndex + 2);
  const transactions = [];

  for (const row of dataRows) {
    if (!row || !row[0]) continue;

    const dateRaw   = String(row[0]).trim();
    const narration = row[1] ? String(row[1]).trim() : '';
    const withdrawal = row[4]; // numeric in XLS
    const deposit    = row[5]; // numeric in XLS

    // Stop at footer rows — only process date-shaped first column
    if (!dateRaw.match(/^\d{2}\/\d{2}\/\d{2,4}$/)) continue;
    if (!narration) continue;

    const date = parseHDFCDate(dateRaw);
    if (!date) continue;

    const debitAmt  = toNum(withdrawal);
    const creditAmt = toNum(deposit);
    if (debitAmt === 0 && creditAmt === 0) continue;

    const isDebit = debitAmt > 0;

    transactions.push({
      date,
      merchant_raw: cleanMerchant(narration),
      amount: isDebit ? debitAmt : creditAmt,
      debit_credit: isDebit ? 'DEBIT' : 'CREDIT',
      bank: 'HDFC',
      source_file: filename,
    });
  }

  return transactions;
}

// ── CSV entry point ───────────────────────────────────────

export function parseHDFC(csvText, filename) {
  const lines = csvText.split('\n');
  const headerIndex = lines.findIndex((l) =>
    l.toLowerCase().includes('date') && l.toLowerCase().includes('narration')
  );

  if (headerIndex === -1) {
    throw new Error('HDFC CSV: Could not find header row. Check the file format.');
  }

  const cleanCsv = lines.slice(headerIndex).join('\n');

  const { data, errors } = Papa.parse(cleanCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[.\s]+/g, '_'),
  });

  if (errors.length) {
    console.warn('[HDFC Parser] CSV parse warnings:', errors.slice(0, 3));
  }

  const transactions = [];

  for (const row of data) {
    const dateRaw    = row['date'] || row['transaction_date'] || '';
    const narration  = row['narration'] || row['description'] || '';
    const withdrawal = row['withdrawal_amt_'] || row['withdrawal_amt'] || row['debit'] || '';
    const deposit    = row['deposit_amt_'] || row['deposit_amt'] || row['credit'] || '';

    if (!dateRaw || !narration) continue;

    const date = parseHDFCDate(dateRaw.trim());
    if (!date) {
      console.warn('[HDFC Parser] Skipping unreadable date:', dateRaw);
      continue;
    }

    const debitAmt  = parseAmount(withdrawal);
    const creditAmt = parseAmount(deposit);
    if (debitAmt === 0 && creditAmt === 0) continue;

    const isDebit = debitAmt > 0;

    transactions.push({
      date,
      merchant_raw: cleanMerchant(narration),
      amount: isDebit ? debitAmt : creditAmt,
      debit_credit: isDebit ? 'DEBIT' : 'CREDIT',
      bank: 'HDFC',
      source_file: filename,
    });
  }

  return transactions;
}

// ── helpers ───────────────────────────────────────────────

function parseHDFCDate(raw) {
  const parts = raw.split('/');
  if (parts.length !== 3) return null;
  let [dd, mm, yy] = parts;
  if (yy.length === 2) yy = '20' + yy;
  const d = new Date(`${yy}-${mm}-${dd}`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseAmount(raw) {
  if (!raw || raw.toString().trim() === '') return 0;
  const n = parseFloat(raw.toString().replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

function toNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}
