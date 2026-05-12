import './EmptyState.css';

/**
 * EmptyState — shown when the review queue is empty.
 * Celebratory message with gentle animation.
 */
export default function EmptyState() {
  return (
    <div className="empty-state animate-slide-up" id="empty-state">
      <div className="empty-state__icon">✨</div>
      <h2 className="empty-state__title">All caught up!</h2>
      <p className="empty-state__text">
        No transactions to review right now.
        <br />
        Upload a bank statement to get started.
      </p>
    </div>
  );
}
