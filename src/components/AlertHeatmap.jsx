/*
 * AlertHeatmap.jsx — GitHub-contribution-style heatmap of screener alert
 * frequency: one cell per day, colored by how many alerts fired.
 * Zero dependencies beyond React.
 *
 * THESIS usage (wired to the real /api/screener/alerts response shape —
 * {alerts: [{ticker, rule, severity, message, data, timestamp}], count}):
 *
 *   const [alerts, setAlerts] = useState([]);
 *   useEffect(() => {
 *     fetch(`${API}/api/screener/alerts?limit=500`)
 *       .then(r => r.json()).then(d => setAlerts(d.alerts));
 *   }, []);
 *   <AlertHeatmap alerts={alerts} weeks={16} />
 */
import "./AlertHeatmap.css";

const DAY_MS = 86400000;

function bucketByDay(alerts) {
  const counts = {};
  for (const a of alerts) {
    const day = (a.timestamp || "").slice(0, 10); // YYYY-MM-DD from ISO
    if (day) counts[day] = (counts[day] || 0) + 1;
  }
  return counts;
}

function level(count, max) {
  if (!count) return 0;
  const r = count / Math.max(max, 1);
  if (r > 0.75) return 4;
  if (r > 0.5) return 3;
  if (r > 0.25) return 2;
  return 1;
}

export default function AlertHeatmap({ alerts = [], weeks = 16 }) {
  const counts = bucketByDay(alerts);
  const max = Math.max(0, ...Object.values(counts));

  // Build columns of 7 days, ending today, aligned so the last column's
  // bottom cell is today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = weeks * 7;
  const days = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: counts[key] || 0 });
  }
  const columns = [];
  for (let w = 0; w < weeks; w++) columns.push(days.slice(w * 7, w * 7 + 7));

  return (
    <div className="ah-wrap">
      <div className="ah-grid" role="img" aria-label="Alert frequency by day">
        {columns.map((col, ci) => (
          <div className="ah-col" key={ci}>
            {col.map((d) => (
              <div
                key={d.key}
                className={`ah-cell ah-l${level(d.count, max)}`}
                title={`${d.key}: ${d.count} alert${d.count === 1 ? "" : "s"}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="ah-legend">
        <span>less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={`ah-cell ah-l${l}`} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
