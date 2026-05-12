import { useState, useEffect } from 'react';
import './Toast.css';

/**
 * Toast — bottom-anchored notification.
 * Auto-dismisses after 3 seconds.
 */
export default function Toast({ message, type = 'success', onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for exit animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

  return (
    <div
      className={`toast toast--${type} ${visible ? 'toast--enter' : 'toast--exit'}`}
      role="alert"
      id="toast-notification"
    >
      <span className="toast__icon">{icon}</span>
      <span className="toast__message">{message}</span>
    </div>
  );
}
