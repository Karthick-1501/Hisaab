import './Header.css';

/**
 * Header — app title + live stats bar.
 * Shows pending count, reviewed today, and auto-confirmed merchants.
 */
export default function Header({ stats, refreshing, onRefresh }) {
  return (
    <header className="header">
      <div className="header__inner container">
        <div className="header__brand">
          <h1 className="header__title">
            <span className="header__logo">🧾</span>
            Hisaab
          </h1>
          <p className="header__subtitle">Review Queue</p>
        </div>

        <button
          className={`header__refresh ${refreshing ? 'header__refresh--spinning' : ''}`}
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh"
          id="refresh-button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {stats && (
        <div className="header__stats container">
          <div className="stat-chip" id="stat-pending">
            <span className="stat-chip__value">{stats.pending}</span>
            <span className="stat-chip__label">Pending</span>
          </div>
          <div className="stat-chip stat-chip--success" id="stat-reviewed">
            <span className="stat-chip__value">{stats.reviewed_today}</span>
            <span className="stat-chip__label">Today</span>
          </div>
          <div className="stat-chip stat-chip--accent" id="stat-auto">
            <span className="stat-chip__value">{stats.auto_confirmed}</span>
            <span className="stat-chip__label">Auto</span>
          </div>
          <div className="stat-chip stat-chip--muted" id="stat-total">
            <span className="stat-chip__value">{stats.total}</span>
            <span className="stat-chip__label">Total</span>
          </div>
        </div>
      )}
    </header>
  );
}
