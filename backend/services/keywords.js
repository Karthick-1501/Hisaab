import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load categories.json once at startup — no hot reload needed
const CATEGORIES_PATH = join(__dirname, '../../categories.json');
let categoryMap = null;

function loadCategories() {
  if (categoryMap) return categoryMap;
  try {
    const raw = readFileSync(CATEGORIES_PATH, 'utf-8');
    categoryMap = JSON.parse(raw);
    console.log(`[Keywords] Loaded ${Object.keys(categoryMap).length} categories`);
    return categoryMap;
  } catch (err) {
    console.error('[Keywords] Failed to load categories.json:', err.message);
    return {};
  }
}

/**
 * Pass 2 — Keyword rule engine.
 *
 * Checks if any alias from categories.json is contained
 * in the cleaned merchant name. Case-insensitive substring match.
 *
 * Returns: { category: string, confidence: number } or null
 *
 * Confidence is fixed at 90 for keyword matches — high but not 100,
 * so the review screen still shows it for confirmation.
 */
export function matchKeyword(merchantClean) {
  if (!merchantClean || merchantClean === 'UNKNOWN') return null;

  const map = loadCategories();
  const lower = merchantClean.toLowerCase();

  for (const [category, aliases] of Object.entries(map)) {
    if (!Array.isArray(aliases) || aliases.length === 0) continue;

    for (const alias of aliases) {
      if (!alias || typeof alias !== 'string') continue;
      // Substring match — "mess" matches "PRIYA MESS", "MURUGAN MESS" etc.
      if (lower.includes(alias.toLowerCase())) {
        return { category, confidence: 90 };
      }
    }
  }

  return null;
}

/**
 * Returns the full category list (keys from categories.json).
 * Used by the review route to validate user-submitted categories.
 */
export function getCategories() {
  return Object.keys(loadCategories());
}
