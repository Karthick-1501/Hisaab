/**
 * cleanMerchant — strips UPI refs, long numbers, bank codes
 * so "PRIYA MESS/UPI/123456789/SBI" → "PRIYA MESS"
 *
 * Run on every merchant_raw BEFORE any categorization pass.
 */
export function cleanMerchant(raw) {
  if (!raw || typeof raw !== 'string') return 'UNKNOWN';

  return raw
    .toUpperCase()
    // Remove @handle (paytm, ybl, oksbi etc) — do this FIRST
    .replace(/@[A-Z0-9]+/gi, '')
    // Remove UPI/ followed by only digits/ref codes (not merchant names)
    .replace(/\/UPI\/[\dA-Z]+\//gi, '/')
    .replace(/UPI[-\/][\d]+/gi, '')
    // Remove trailing bank codes after last slash e.g. ".../SBI"
    .replace(/\/[A-Z]{2,5}$/gi, '')
    // Remove UPI- prefix if it's at the start
    .replace(/^UPI[-\/]/gi, '')
    // Strip UPI handle suffixes like -ok, -oksbi before @
    .replace(/[-.]ok\b/gi, '')
    // Strip IFSC codes (4 letters + 0 + 6 alphanumeric, e.g. HDFC0001051, KVBL0001188)
    .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, '')
    // Strip PaytmQR junk codes (PAYTMQR + alphanumeric)
    .replace(/PAYTMQR[A-Z0-9]*/g, '')
    // Strip "PAID VIA SUPERMONE*" and similar payment app suffixes
    .replace(/PAID VIA \w+/g, '')
    .replace(/\bVYAPAR\b/g, '')
    // Strip bare bank abbreviations left over (YESB0PTM, HDFC0MER etc)
    .replace(/\b[A-Z]{3,6}0[A-Z]{2,5}\b/g, '')
    // Strip alphanumeric UPI usernames (e.g. ASARGURU1, SBIN0000823)
    .replace(/\b[A-Z]+\d+[A-Z0-9]*\b/g, '')
    // Strip lone single characters left after cleanup
    .replace(/\b[A-Z]\b/g, '')
    // Strip bare number tokens
    .replace(/\b\d+\b/g, '')
    // Remove long numeric refs (order IDs, UTR numbers 8+ digits)
    .replace(/\d{8,}/g, '')
    // Remove payment method keywords when standalone
    .replace(/\b(NEFT|IMPS|RTGS|UPI|REF|TXN|NA)\b/gi, '')
    // Separators → space
    .replace(/[-\/\\|_.]+/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    || 'UNKNOWN';
}

/*
  Examples:
  "PRIYA MESS/UPI/123456789/SBI"   → "PRIYA MESS"
  "UPI-SUDHAKAR-OK@PAYTM"          → "SUDHAKAR"
  "SWIGGY ORDER 98234567"          → "SWIGGY ORDER"
  "NEFT/ICICI/SALARY MAY"          → "ICICI SALARY MAY"
  "AMAZON PAY/UPI/4829384923"      → "AMAZON PAY"
*/
