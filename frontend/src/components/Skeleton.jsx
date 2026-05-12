import './Skeleton.css';

/**
 * Skeleton — loading placeholder for transaction cards.
 * Shows 5 shimmer cards while data is loading.
 */
export default function Skeleton({ count = 5 }) {
  return (
    <div className="skeleton-list" aria-label="Loading transactions">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-card__row">
            <div className="skeleton-card__left">
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--subtitle" />
            </div>
            <div className="skeleton-card__right">
              <div className="skeleton-line skeleton-line--amount" />
            </div>
          </div>
          <div className="skeleton-card__bottom">
            <div className="skeleton-line skeleton-line--chip" />
            <div className="skeleton-line skeleton-line--bar" />
          </div>
        </div>
      ))}
    </div>
  );
}
