import { useState, useRef } from 'react';
import './UploadArea.css';

/**
 * UploadArea — drag-and-drop + click-to-browse file upload.
 * Shows upload progress and result summary.
 */
export default function UploadArea({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  async function processFile(file) {
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.xls') && !ext.endsWith('.pdf')) {
      setError('Only CSV, XLS, and PDF files are accepted.');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const data = await onUpload(file);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function dismissResult() {
    setResult(null);
    setError(null);
  }

  return (
    <div className="upload-section">
      <div
        className={`upload-area ${dragging ? 'upload-area--dragging' : ''} ${uploading ? 'upload-area--uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        id="upload-area"
        role="button"
        tabIndex={0}
        aria-label="Upload bank statement"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.pdf"
          onChange={handleFileSelect}
          hidden
          id="upload-input"
        />

        {uploading ? (
          <div className="upload-area__uploading">
            <div className="upload-area__spinner" />
            <span>Processing statement...</span>
          </div>
        ) : (
          <>
            <div className="upload-area__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="upload-area__text">
              Drop bank statement or <span className="upload-area__link">browse</span>
            </span>
            <span className="upload-area__hint">CSV, XLS — HDFC supported</span>
          </>
        )}
      </div>

      {/* Upload result */}
      {result && (
        <div className="upload-result animate-fade-in" id="upload-result">
          <div className="upload-result__header">
            <span className="upload-result__icon">✅</span>
            <span className="upload-result__title">{result.message}</span>
            <button className="upload-result__close" onClick={dismissResult}>×</button>
          </div>
          <div className="upload-result__grid">
            <div className="upload-result__stat">
              <span className="upload-result__stat-value">{result.parsed}</span>
              <span className="upload-result__stat-label">Parsed</span>
            </div>
            <div className="upload-result__stat">
              <span className="upload-result__stat-value">{result.inserted}</span>
              <span className="upload-result__stat-label">New</span>
            </div>
            <div className="upload-result__stat">
              <span className="upload-result__stat-value">{result.skipped}</span>
              <span className="upload-result__stat-label">Skipped</span>
            </div>
            <div className="upload-result__stat">
              <span className="upload-result__stat-value">{result.transfers_detected}</span>
              <span className="upload-result__stat-label">Transfers</span>
            </div>
          </div>
          {result.categorization && (
            <div className="upload-result__passes">
              <span>Pass 1: {result.categorization.pass1}</span>
              <span>Pass 2: {result.categorization.pass2}</span>
              <span>Pass 3: {result.categorization.pass3}</span>
            </div>
          )}
        </div>
      )}

      {/* Upload error */}
      {error && (
        <div className="upload-error animate-fade-in" id="upload-error">
          <span>❌ {error}</span>
          <button className="upload-error__close" onClick={dismissResult}>×</button>
        </div>
      )}
    </div>
  );
}
