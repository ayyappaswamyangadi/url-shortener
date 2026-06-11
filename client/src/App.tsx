import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import "./App.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5050/api";

interface UrlEntry {
  shortId: string;
  shortUrl: string;
  originalUrl: string;
  clicks: number;
  createdAt: string;
}

interface ShortenResult {
  shortUrl: string;
  shortId: string;
  clicks: number;
  createdAt: string;
}

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Toast System ─────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="alert">
          <span className="toast-icon" aria-hidden="true">
            {t.type === "success" ? "✓" : "✕"}
          </span>
          <span className="toast-message">{t.message}</span>
          <button
            className="toast-close"
            onClick={() => onRemove(t.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────

function ConfirmModal({
  shortId,
  onConfirm,
  onCancel,
}: {
  shortId: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal">
        <div className="modal-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <h2 id="modal-title" className="modal-title">Delete Short URL?</h2>
        <p className="modal-desc">
          This will permanently remove{" "}
          <code>/{shortId}</code> and cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger-solid" onClick={onConfirm} autoFocus>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<UrlEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await axios.get<UrlEntry[]>(`${API}/urls`);
      setHistory(data);
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Real-time click updates via SSE
  useEffect(() => {
    let es: EventSource;

    function connect() {
      es = new EventSource(`${API}/events`);
      es.onmessage = (e) => {
        const { shortId, clicks } = JSON.parse(e.data) as { shortId: string; clicks: number };
        setHistory((prev) => prev.map((u) => (u.shortId === shortId ? { ...u, clicks } : u)));
        setResult((prev) => (prev?.shortId === shortId ? { ...prev, clicks } : prev));
      };
      es.onerror = () => {
        es.close();
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      es.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  const filteredHistory = useMemo(
    () => history.filter((u) => u.originalUrl.toLowerCase().includes(searchQuery.toLowerCase())),
    [history, searchQuery]
  );

  const handleShorten = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setResult(null);

      const trimmed = inputUrl.trim();
      if (!trimmed) {
        setError("Please enter a URL.");
        return;
      }
      if (!/^https?:\/\//i.test(trimmed)) {
        setError("URL must start with http:// or https://");
        return;
      }
      try {
        new URL(trimmed);
      } catch {
        setError("That doesn't look like a valid URL. Please check and try again.");
        return;
      }
      if (history.some((u) => u.originalUrl === trimmed)) {
        setError("This URL has already been shortened. Search for it below.");
        return;
      }

      setLoading(true);
      try {
        const { data } = await axios.post<ShortenResult>(`${API}/shorten`, {
          originalUrl: trimmed,
        });
        setResult(data);
        setInputUrl("");
        fetchHistory();
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error ?? "Something went wrong. Try again.");
        } else {
          setError("Something went wrong. Try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [inputUrl, history, fetchHistory]
  );

  const handleCopy = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        addToast("error", "Failed to copy. Please copy manually.");
      }
    },
    [addToast]
  );

  const handleDelete = useCallback((shortId: string) => {
    setDeleteTarget(shortId);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await axios.delete(`${API}/urls/${id}`);
      setHistory((prev) => prev.filter((u) => u.shortId !== id));
      setResult((prev) => (prev?.shortId === id ? null : prev));
      addToast("success", "Short URL deleted successfully.");
    } catch {
      addToast("error", "Failed to delete. Please try again.");
    }
  }, [deleteTarget, addToast]);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {deleteTarget && (
        <ConfirmModal
          shortId={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <header className="header">
        <div className="header-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <h1>URL Shortener</h1>
        <p>Paste a long URL and get a short, shareable link instantly.</p>
      </header>

      {/* Shorten Form */}
      <div className="card">
        <form onSubmit={handleShorten} noValidate>
          <div className="form-row">
            <input
              className="url-input"
              type="url"
              placeholder="https://example.com/very/long/url/that/needs/shortening"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Shortening…
                </>
              ) : (
                "Shorten"
              )}
            </button>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </form>

        {/* Result */}
        {result && (
          <div className="result-box">
            <div className="result-info">
              <p className="result-label">Your short link</p>
              <a
                className="result-url"
                href={result.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {result.shortUrl}
              </a>
            </div>
            <button
              className={`copy-btn${copied ? " copied" : ""}`}
              onClick={() => handleCopy(result.shortUrl)}
              aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
            >
              {copied ? (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="section-header">
        <p className="section-title">Recent URLs</p>
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            className="search-input"
            type="search"
            placeholder="Search URLs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search recent URLs"
          />
        </div>
      </div>

      <div className="card">
        {historyLoading ? (
          <div className="skeleton-list" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton skeleton-short" />
                <div className="skeleton skeleton-long" />
                <div className="skeleton skeleton-tiny" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <p>No URLs shortened yet.</p>
            <span>Paste a URL above to get started.</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>No results found.</p>
            <span>Try a different search term.</span>
          </div>
        ) : (
          <table className="url-table">
            <thead>
              <tr>
                <th>Short URL</th>
                <th>Original</th>
                <th>Clicks</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((entry) => (
                <tr key={entry.shortId}>
                  <td data-label="Short">
                    <a
                      className="short-link"
                      href={entry.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {entry.shortUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </td>
                  <td data-label="Original">
                    <a
                      className="original-url"
                      href={entry.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={entry.originalUrl}
                    >
                      {entry.originalUrl}
                    </a>
                  </td>
                  <td data-label="Clicks">
                    <span className="clicks-badge">{entry.clicks}</span>
                  </td>
                  <td data-label="Created">
                    <span className="date-text">{formatDate(entry.createdAt)}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(entry.shortId)}
                      aria-label={`Delete /${entry.shortId}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
