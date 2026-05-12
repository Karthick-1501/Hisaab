/**
 * API client — thin fetch wrapper for the Hisaab backend.
 * All endpoints return JSON. Errors throw with the server message.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the backend. Is the server running?');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// ── Review endpoints ────────────────────────────────────

export function fetchPending() {
  return request('/review/pending');
}

export function fetchStats() {
  return request('/review/stats');
}

export function fetchCategories() {
  return request('/review/categories');
}

export function confirmTransaction(id, category) {
  return request(`/review/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ category }),
  });
}

export function confirmBulk(ids, category) {
  return request('/review', {
    method: 'PATCH',
    body: JSON.stringify({ ids, category }),
  });
}

// ── Upload endpoint ─────────────────────────────────────

export async function uploadStatement(file) {
  const formData = new FormData();
  formData.append('statement', file);

  let res;
  try {
    res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      // No Content-Type header — browser sets multipart boundary automatically
    });
  } catch {
    throw new Error('Cannot reach the backend. Is the server running?');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Upload failed: ${res.status}`);
  }

  return data;
}

// ── Dashboard endpoints ─────────────────────────────────

export function fetchDashboardSummary(month) {
  const query = month ? `?month=${month}` : '';
  return request(`/dashboard/summary${query}`);
}

export function fetchDashboardChart(month) {
  const query = month ? `?month=${month}` : '';
  return request(`/dashboard/chart${query}`);
}

// ── Budget endpoints ────────────────────────────────────

export function fetchBudgets(month) {
  const query = month ? `?month=${month}` : '';
  return request(`/budgets${query}`);
}

export function saveBudget(month, category, budget_amount) {
  return request('/budgets', {
    method: 'POST',
    body: JSON.stringify({ month, category, budget_amount }),
  });
}

// ── Transaction endpoints ───────────────────────────────

export function fetchTransactions({ page = 1, limit = 50, category, month, date } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (category) params.append('category', category);
  if (month) params.append('month', month);
  if (date) params.append('date', date);
  return request(`/transactions?${params.toString()}`);
}
