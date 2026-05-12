import { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useReview } from './hooks/useReview.js';
import Header from './components/Header.jsx';
import NavBar from './components/NavBar.jsx';
import UploadArea from './components/UploadArea.jsx';
import TransactionCard from './components/TransactionCard.jsx';
import EmptyState from './components/EmptyState.jsx';
import Skeleton from './components/Skeleton.jsx';
import Toast from './components/Toast.jsx';
import Dashboard from './components/Dashboard.jsx';
import './App.css';

export default function App() {
  const {
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
  } = useReview();

  const [toasts, setToasts] = useState([]);
  const [exitingIds, setExitingIds] = useState(new Set());

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  async function handleConfirm(txnId, category) {
    try {
      const result = await confirm(txnId, category);
      setExitingIds((prev) => new Set(prev).add(txnId));
      setTimeout(() => {
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(txnId);
          return next;
        });
      }, 400);

      addToast(`${result.merchant_raw} → ${category}`);
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  }

  async function handleAcceptAll() {
    if (!transactions.length) {
      addToast('No transactions to accept', 'error');
      return;
    }

    const groups = {};
    for (const t of transactions) {
      const category = t.ai_suggestion || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(t.id);
    }

    try {
      let totalConfirmed = 0;
      for (const [category, ids] of Object.entries(groups)) {
        const result = await bulkConfirm(ids, category);
        totalConfirmed += result.confirmed;
      }
      addToast(`Accepted ${totalConfirmed} transactions`);
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  const visibleTransactions = transactions.filter((t) => !exitingIds.has(t.id));

  return (
    <>
      <Header stats={stats} refreshing={refreshing} onRefresh={refresh} />
      
      <main className="main container">
        <NavBar />
        
        <Routes>
          {/* Review Queue Route */}
          <Route path="/" element={
            <>
              <UploadArea onUpload={upload} />

              {transactions.length > 0 && (
                <div className="bulk-bar animate-fade-in" id="bulk-accept-bar">
                  <span className="bulk-bar__text">
                    <strong>{transactions.length}</strong> pending transactions
                  </span>
                  <button
                    className="bulk-bar__button"
                    onClick={handleAcceptAll}
                    id="bulk-accept-button"
                  >
                    Accept All
                  </button>
                </div>
              )}

              {error && (
                <div className="error-banner animate-fade-in" id="error-banner">
                  <span>⚠️ {error}</span>
                  <button className="error-banner__retry" onClick={refresh}>
                    Retry
                  </button>
                </div>
              )}

              {loading && <Skeleton />}

              {!loading && visibleTransactions.length > 0 && (
                <div className="txn-list" id="transaction-list">
                  {visibleTransactions.map((txn) => (
                    <TransactionCard
                      key={txn.id}
                      transaction={txn}
                      categories={categories}
                      onConfirm={handleConfirm}
                      animatingOut={exitingIds.has(txn.id)}
                    />
                  ))}
                </div>
              )}

              {!loading && !error && visibleTransactions.length === 0 && <EmptyState />}
            </>
          } />

          {/* Dashboard Route */}
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onDismiss={() => removeToast(t.id)}
        />
      ))}
    </>
  );
}
