import { parseHDFC, parseHDFCXls } from './hdfc.js';

/**
 * Detect which bank parser to use based on filename + content sniffing.
 * Returns parsed transactions array.
 *
 * Phase 1: HDFC only.
 * Phase 5: SBI, Axis, Paytm, Generic will be added here.
 */
export function detectAndParse(fileBuffer, filename, mimetype) {
  const lower = filename.toLowerCase();

  // ── XLS files (HDFC mobile app) ──────────────────────────
  if (
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'application/xls' ||
    mimetype === 'application/octet-stream' && lower.endsWith('.xls') ||
    lower.endsWith('.xls')
  ) {
    // XLS is always HDFC for now — detect by content if needed in Phase 5
    return { bank: 'HDFC', transactions: parseHDFCXls(fileBuffer, filename) };
  }

  // ── CSV / text files ─────────────────────────────────────
  if (mimetype === 'text/csv' || lower.endsWith('.csv')) {
    const text = fileBuffer.toString('utf-8');
    const bank = detectBankFromContent(text, lower);

    switch (bank) {
      case 'HDFC':
        return { bank: 'HDFC', transactions: parseHDFC(text, filename) };

      // Phase 5 stubs
      case 'AXIS':
        throw new Error('Axis parser not yet implemented. Coming in Phase 5.');
      case 'PAYTM':
        throw new Error('Paytm parser not yet implemented. Coming in Phase 5.');
      default:
        throw new Error(
          `Could not detect bank from file "${filename}". ` +
          'Currently supported: HDFC CSV. More banks coming in Phase 5.'
        );
    }
  }

  // ── PDF files ────────────────────────────────────────────
  if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
    // Phase 5: SBI PDF parser goes here
    throw new Error('PDF parsing (SBI) not yet implemented. Coming in Phase 5.');
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
}

// ── bank detection heuristics ─────────────────────────────

function detectBankFromContent(text, filename) {
  const first500 = text.slice(0, 500).toUpperCase();

  if (filename.includes('hdfc') || first500.includes('HDFC BANK')) return 'HDFC';
  if (filename.includes('axis') || first500.includes('AXIS BANK'))  return 'AXIS';
  if (filename.includes('paytm'))                                    return 'PAYTM';

  // Column header sniffing as fallback
  if (first500.includes('NARRATION') && first500.includes('WITHDRAWAL')) return 'HDFC';
  if (first500.includes('TRAN DATE') && first500.includes('PARTICULARS')) return 'AXIS';

  return 'UNKNOWN';
}
