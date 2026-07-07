/*
 * AlertFeed.jsx — severity-colored alert list with expandable detail rows
 * (accordion mechanic, no dependencies). Wired to the exact response shape
 * of /api/screener/alerts.
 *
 * THESIS usage:
 *   <AlertFeed apiBase={import.meta.env.VITE_API_URL} />
 * Renders its own fetch + filter + "Scan now" button (POST /admin/scan).
 */
import { useCallback, useEffect, useState } from "react";
import "./AlertFeed.css";

const SEVERITY_ORDER = ["critical", "warning", "info"];

export default function AlertFeed({ apiBase = "" }) {
  const [alerts, setAlerts] = useState([]);
  const [severity, setSeverity] = useState("");
  const [open, setOpen] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const q = severity ? `&severity=${severity}` : "";
      const r = await fetch(`${apiBase}/api/screener/alerts?limit=100${q}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setAlerts(d.alerts || []);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [apiBase, severity]);

  useEffect(() => { load(); }, [load]);

  const scanNow = async () => {
    setScanning(true);
    try {
      await fetch(`${apiBase}/api/screener/admin/scan`, { method: "POST" });
      await load();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="af-wrap">
      <div className="af-toolbar">
        <div className="af-filters">
          <button className={severity === "" ? "af-on" : ""} onClick={() => setSeverity("")}>all</button>
          {SEVERITY_ORDER.map((s) => (
            <button key={s} className={severity === s ? "af-on" : ""} onClick={() => setSeverity(s)}>
              {s}
            </button>
          ))}
        </div>
        <button className="af-scan" onClick={scanNow} disabled={scanning}>
          {scanning ? "scanning…" : "scan now"}
        </button>
      </div>

      {error && <div className="af-error">Failed to load alerts: {error}</div>}

      <ul className="af-list">
        {alerts.map((a, i) => (
          <li key={i} className={`af-item af-${a.severity}`}>
            <button className="af-row" onClick={() => setOpen(open === i ? null : i)}>
              <span className="af-badge">{a.severity}</span>
              <span className="af-ticker">{a.ticker}</span>
              <span className="af-msg">{a.message}</span>
              <span className="af-time">{(a.timestamp || "").slice(0, 10)}</span>
            </button>
            <div className={`af-detail${open === i ? " af-openrow" : ""}`}>
              <code>{a.rule}</code>
              <pre>{JSON.stringify(a.data, null, 2)}</pre>
            </div>
          </li>
        ))}
        {alerts.length === 0 && !error && <li className="af-empty">No alerts yet — run a scan.</li>}
      </ul>
    </div>
  );
}
