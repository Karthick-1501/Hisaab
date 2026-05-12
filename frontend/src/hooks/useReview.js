import { useState, useEffect, useCallback } from 'react';
import {
  fetchPending,
  fetchStats,
  fetchCategories,
  confirmTransaction,
  confirmBulk,
  uploadStatement,
} from '../api.js';

/**
 * useReview — data fetching + mutation hook for the review workflow.
 *
 * Returns everything the ReviewPage needs:
 *   - transactions, stats, categories (data)
 *   - confirm, bulkConfirm, upload (mutations)
 *   - loading, error, refreshing (UI state)
 */
export function useReview() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ── Initial load ────────────────────────────────────────
  const loadAll = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      const [pendingData, statsData, catData] = await Promise.all([
        fetchPending(),
        fetchStats(),
        fetchCategories(),
      ]);

      setTransactions(pendingData.transactions);
      setStats(statsData);
      setCategories(catData.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Confirm single transaction ──────────────────────────
  const confirm = useCallback(async (id, category) => {
    const result = await confirmTransaction(id, category);

    // Optimistic removal from the list
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setStats((prev) =>
      prev ? { ...prev, pending: prev.pending - 1, reviewed_today: prev.reviewed_today + 1 } : prev
    );

    return result;
  }, []);

  // ── Bulk confirm ────────────────────────────────────────
  const bulkConfirm = useCallback(async (ids, category) => {
    const result = await confirmBulk(ids, category);

    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
    setStats((prev) =>
      prev
        ? { ...prev, pending: prev.pending - result.confirmed, reviewed_today: prev.reviewed_today + result.confirmed }
        : prev
    );

    return result;
  }, []);

  // ── Upload ──────────────────────────────────────────────
  const upload = useCallback(async (file) => {
    const result = await uploadStatement(file);
    // Reload everything after upload to show new transactions
    await loadAll(true);
    return result;
  }, [loadAll]);

  // ── Refresh ─────────────────────────────────────────────
  const refresh = useCallback(() => loadAll(true), [loadAll]);

  return {
    transactions,
    stats,
    categories,
    loading,
    refreshing,
    error,
    confirm,
    bulkConfirm,
    upload,
    refresh,
  };
}
