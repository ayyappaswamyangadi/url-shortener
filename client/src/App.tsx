import { useState, useEffect, useCallback } from "react";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function App() {
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<UrlEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch URL history
  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await axios.get<UrlEntry[]>(`${API}/urls`);
      setHistory(data);
    } catch {
      // silently fail — history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Shorten URL
  const handleShorten = async (e: React.FormEvent) => {
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

    setLoading(true);
    try {
      const { data } = await axios.post<ShortenResult>(`${API}/shorten`, {
        originalUrl: trimmed,
      });
      setResult(data);
      setInputUrl("");
      fetchHistory(); // refresh history
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? "Something went wrong. Try again.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Delete a short URL
  const handleDelete = async (shortId: string) => {
    if (!confirm("Delete this short URL?")) return;
    try {
      await axios.delete(`${API}/urls/${shortId}`);
      setHistory((prev) => prev.filter((u) => u.shortId !== shortId));
      if (result?.shortId === shortId) setResult(null);
    } catch {
      alert("Failed to delete. Try again.");
    }
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <span className="header-icon">🔗</span>
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
          {error && <p className="error-msg">⚠ {error}</p>}
        </form>

        {/* Result */}
        {result && (
          <div className="result-box">
            <div>
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
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <p className="section-title">Recent URLs</p>
      <div className="card">
        {historyLoading ? (
          <p className="empty-state">Loading…</p>
        ) : history.length === 0 ? (
          <p className="empty-state">No URLs shortened yet. Start above! 👆</p>
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
              {history.map((entry) => (
                <tr key={entry.shortId}>
                  <td>
                    <a
                      className="short-link"
                      href={entry.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {entry.shortUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </td>
                  <td>
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
                  <td>
                    <span className="clicks-badge">{entry.clicks}</span>
                  </td>
                  <td>
                    <span className="date-text">{formatDate(entry.createdAt)}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(entry.shortId)}
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
