import './ConfidenceBar.css';

/**
 * ConfidenceBar — visual indicator of AI confidence (0-100).
 * Color shifts from red (low) → yellow (mid) → green (high).
 */
export default function ConfidenceBar({ value }) {
  const clamped = Math.max(0, Math.min(100, value || 0));

  const getColor = () => {
    if (clamped >= 80) return 'var(--success)';
    if (clamped >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="confidence" title={`AI confidence: ${clamped}%`}>
      <div className="confidence__track">
        <div
          className="confidence__fill"
          style={{
            width: `${clamped}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
      <span className="confidence__label" style={{ color: getColor() }}>
        {clamped}%
      </span>
    </div>
  );
}
