import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCategories } from './keywords.js';

let genAI = null;
let model = null;

function getModel() {
  if (model) return model;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set. Add it to your .env file.');
  }
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  return model;
}

/**
 * Pass 3 — Gemini Flash API.
 *
 * Categorizes a single transaction. Returns { category, confidence }.
 * Falls back to { category: 'Other', confidence: 0 } on any API failure
 * so a broken API key never crashes the upload flow.
 *
 * Use categorizeBatch() for multiple transactions — it runs in parallel
 * via Promise.all() which is much faster than sequential calls.
 */
export async function categorizeWithGemini(merchantClean, amount) {
  const categoryList = getCategories().join(', ');

  const prompt = `You are a personal finance categorizer for Indian spending.
Classify this transaction into ONE of these categories:
${categoryList}

Merchant: ${merchantClean}
Amount: Rs.${amount}

Reply with ONLY a JSON object on one line. No other text, no markdown, no explanation.
Format: {"category": "Food & Dining", "confidence": 85}
confidence is 0-100, your estimate of how sure you are.`;

  try {
    const m = getModel();
    const result = await m.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const validCategories = getCategories();
    const category = validCategories.includes(parsed.category) ? parsed.category : 'Other';
    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 60;

    return { category, confidence };
  } catch (err) {
    console.warn(`[Gemini] Failed for "${merchantClean}":`, err.message);
    return { category: 'Other', confidence: 0 };
  }
}

/**
 * Categorize multiple transactions in parallel.
 * Respects Gemini free tier rate limit (15 req/min) by chunking
 * into batches of 10 with a 5s gap between batches.
 *
 * @param {Array<{id, merchant_raw, amount}>} transactions
 * @returns {Array<{id, category, confidence}>}
 */
export async function categorizeBatch(transactions) {
  if (!transactions.length) return [];

  const BATCH_SIZE = 10;
  const results = [];

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const chunk = transactions.slice(i, i + BATCH_SIZE);

    const chunkResults = await Promise.all(
      chunk.map(async (txn) => {
        const { category, confidence } = await categorizeWithGemini(
          txn.merchant_raw,
          txn.amount
        );
        return { id: txn.id, category, confidence };
      })
    );

    results.push(...chunkResults);

    // Rate limit buffer — only wait if there are more batches
    if (i + BATCH_SIZE < transactions.length) {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  return results;
}
