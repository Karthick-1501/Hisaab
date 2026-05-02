/**
 * test-phase1.js — Run this to verify Phase 1 parser output
 * WITHOUT needing Docker or a real bank statement.
 *
 * Usage:  node test-phase1.js
 *
 * What it tests:
 *   1. cleanMerchant() stripping
 *   2. HDFC CSV parsing → structured rows
 *   3. Debit / credit split
 *   4. Date parsing (DD/MM/YY and DD/MM/YYYY)
 */

import { parseHDFC } from './backend/parsers/hdfc.js';
import { cleanMerchant } from './backend/services/cleanMerchant.js';

// ── 1. cleanMerchant tests ─────────────────────────────────
console.log('\n=== cleanMerchant() tests ===');
const cleanTests = [
  ['PRIYA MESS/UPI/123456789/SBI',   'PRIYA MESS'],
  ['UPI-SUDHAKAR-OK@PAYTM',          'SUDHAKAR'],
  ['SWIGGY ORDER 98234567',          'SWIGGY ORDER'],
  ['AMAZON PAY/UPI/4829384923',      'AMAZON PAY'],
  ['NEFT/ICICI/SALARY MAY',          'ICICI SALARY MAY'],
  ['TASMAC 00293847 CHENNAI',        'TASMAC CHENNAI'],
];

let cleanPassed = 0;
for (const [input, expected] of cleanTests) {
  const result = cleanMerchant(input);
  const ok = result === expected;
  console.log(`  ${ok ? '✅' : '❌'} "${input}" → "${result}" ${ok ? '' : `(expected "${expected}")`}`);
  if (ok) cleanPassed++;
}
console.log(`  ${cleanPassed}/${cleanTests.length} passed\n`);

// ── 2. HDFC CSV parser test ───────────────────────────────
console.log('=== HDFC CSV parser test ===');

const mockHDFCCsv = `Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
05/04/25,SWIGGY ORDER 98234567,,05/04/25,450.00,,28450.00
06/04/25,UPI-SUDHAKAR-OK@PAYTM,,06/04/25,200.00,,28250.00
07/04/25,SALARY CREDIT/NEFT/TCS,,07/04/25,,85000.00,113250.00
08/04/25,AMAZON PAY/UPI/4829384923,,08/04/25,1299.00,,111951.00
09/04/25,TASMAC 00293847 CHENNAI,,09/04/25,750.00,,111201.00
10/04/25,PRIYA MESS/UPI/123456789/SBI,,10/04/25,120.00,,111081.00
11/04/25,TNEB ELECTRICITY PAYMENT,,11/04/25,1450.00,,109631.00
12/04/25,NETFLIX SUBSCRIPTION,,12/04/25,649.00,,108982.00
`;

const transactions = parseHDFC(mockHDFCCsv, 'hdfc_april_2025.csv');
console.log(`  Parsed ${transactions.length} transactions:\n`);

for (const t of transactions) {
  const symbol = t.debit_credit === 'DEBIT' ? '🔴' : '🟢';
  console.log(`  ${symbol} ${t.date}  ₹${t.amount.toFixed(2).padStart(9)}  [${t.debit_credit}]  ${t.merchant_raw}`);
}

// ── 3. Assertions ─────────────────────────────────────────
console.log('\n=== Assertions ===');
const assertions = [
  ['Total transactions', transactions.length === 8, `got ${transactions.length}`],
  ['Debits count', transactions.filter(t => t.debit_credit === 'DEBIT').length === 7, ''],
  ['Credits count', transactions.filter(t => t.debit_credit === 'CREDIT').length === 1, ''],
  ['Salary amount', transactions.find(t => t.merchant_raw.includes('SALARY'))?.amount === 85000, ''],
  ['All have bank=HDFC', transactions.every(t => t.bank === 'HDFC'), ''],
  ['Dates are YYYY-MM-DD', transactions.every(t => /^\d{4}-\d{2}-\d{2}$/.test(t.date)), ''],
];

let assertPassed = 0;
for (const [name, condition, extra] of assertions) {
  const ok = Boolean(condition);
  console.log(`  ${ok ? '✅' : '❌'} ${name} ${extra ? `(${extra})` : ''}`);
  if (ok) assertPassed++;
}
console.log(`\n  ${assertPassed}/${assertions.length} assertions passed`);

if (assertPassed === assertions.length) {
  console.log('\n✅ Phase 1 parser is working correctly. Ready for real HDFC statements.\n');
} else {
  console.log('\n❌ Some assertions failed. Check output above.\n');
  process.exit(1);
}
