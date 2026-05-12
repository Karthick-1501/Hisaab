import { useState } from 'react';
import CategoryPicker from './CategoryPicker.jsx';
import ConfidenceBar from './ConfidenceBar.jsx';
import './TransactionCard.css';

/**
 * TransactionCard — a single pending transaction.
 * Shows merchant, amount, date, AI suggestion.
 * Expands on click to show the category picker.
 */
export default function TransactionCard({
  transaction,
  categories,
  onConfirm,
  animatingOut,
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const {
    id,
    date,
    merchant_raw,
    amount,
    debit_credit,
    bank,
    ai_suggestion,
    ai_confidence,
  } = transaction;

  const isDebit = debit_credit === 'DEBIT';
  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  const formattedAmount = Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  async function handleConfirm(category) {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm(id, category);
      setConfirmed(true);
    } catch {
      setConfirming(false);
    }
  }

  function handleQuickConfirm(e) {
    e.stopPropagation();
    if (ai_suggestion) {
      handleConfirm(ai_suggestion);
    }
  }

  const displayCategory = transaction.category || ai_suggestion;
  const isConfirmed = !!transaction.category;

  const cardClass = [
    'txn-card',
    expanded ? 'txn-card--expanded' : '',
    confirmed ? 'txn-card--confirmed' : '',
    animatingOut ? 'txn-card--out' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass} id={`transaction-${id}`}>
      <div className="txn-card__main" onClick={() => setExpanded(!expanded)}>
        <div className="txn-card__left">
          <span className="txn-card__merchant">{merchant_raw}</span>
          <div className="txn-card__meta">
            <span className="txn-card__date">{formattedDate}</span>
            <span className="txn-card__dot">·</span>
            <span className="txn-card__bank">{bank}</span>
          </div>
        </div>

        <div className="txn-card__right">
          <span className={`txn-card__amount ${isDebit ? 'txn-card__amount--debit' : 'txn-card__amount--credit'}`}>
            {isDebit ? '−' : '+'}₹{formattedAmount}
          </span>

          {!isConfirmed && ai_suggestion && !expanded && (
            <button
              className="txn-card__quick-confirm"
              onClick={handleQuickConfirm}
              disabled={confirming}
              title={`Accept: ${ai_suggestion}`}
              id={`quick-confirm-${id}`}
            >
              {confirming ? (
                <span className="txn-card__spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI suggestion / Confirmed Category */}
      {displayCategory && (
        <div className="txn-card__suggestion">
          <span className="txn-card__suggestion-label">{isConfirmed ? 'Category:' : 'AI:'}</span>
          <span
            className="txn-card__suggestion-category"
            data-category={displayCategory.toLowerCase().replace(/[^a-z]/g, '')}
          >
            {displayCategory}
          </span>
          {!isConfirmed && ai_confidence != null && (
            <ConfidenceBar value={ai_confidence} />
          )}
        </div>
      )}

      {/* Expanded category picker */}
      {expanded && (
        <div className="txn-card__picker animate-fade-in">
          <CategoryPicker
            categories={categories}
            selected={displayCategory}
            onSelect={handleConfirm}
            disabled={confirming}
          />
        </div>
      )}
    </div>
  );
}
