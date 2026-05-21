import { useState, useEffect, useCallback, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Panel, Btn, Input3D, StatTile, MetricChip, SideNavItem, DEPTH_CSS, depthC as C, panelBase } from "./depthUI";

const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.PROD
    ? "https://thesis-dashboard-api.onrender.com"
    : "http://localhost:8000");

const THEME_TICKERS = {
  "AI Infrastructure": ["NVDA","AMD","TSM","AVGO","MRVL","MSFT","GOOGL","META","SMCI","ARM"],
  "Defense": ["LMT","RTX","NOC","GD","HII","BA","LDOS","CACI","KTOS","PLTR"],
  "Energy Transition": ["NEE","CEG","VST","FSLR","ENPH","NRG","ETN","PWR","BE","OKE"],
  "Biodefense & Pandemic": ["MRNA","BNTX","PFE","GILD","REGN","ABBV","SIGA","EBS","BIO","QDEL","ILMN","PACB"],
  "Healthcare Infrastructure": ["UNH","JNJ","ABT","TMO","DHR","ISRG","BSX","MDT","A","IQV"],
};

const THEMES = {
  "AI Infrastructure":         { color: C.ai,      icon: "AI",   short: "AI",   alloc: 0.48 },
  "Defense":                   { color: C.defense,  icon: "DEF",  short: "DEF",  alloc: 0.25 },
  "Energy Transition":         { color: C.energy,   icon: "NRG",  short: "NRG",  alloc: 0.10 },
  "Biodefense & Pandemic":     { color: C.bio,      icon: "BIO",  short: "BIO",  alloc: 0.10 },
  "Healthcare Infrastructure": { color: C.health,   icon: "MED",  short: "MED",  alloc: 0.07 },
};

const BASE_CAPITAL = 15_000;
const MAX_POSITION_PCT = 0.05;

const themeForTicker = (tk) => {
  for (const [name, list] of Object.entries(THEME_TICKERS)) {
    if (list.includes(tk)) return name;
  }
  return null;
};

const suggestPositionSize = (tk) => {
  const theme = themeForTicker(tk);
  if (!theme) return null;
  const cfg = THEMES[theme];
  const n = THEME_TICKERS[theme]?.length || 1;
  const slot = (BASE_CAPITAL * cfg.alloc) / n;
  const cap = BASE_CAPITAL * MAX_POSITION_PCT;
  return Math.round(Math.min(slot, cap));
};

const PERIODS = ["1m","3m","6m","1y","3y"];

// ── Data fetching ─────────────────────────────────────────────────────────────
function useApi(path, pollMs = null) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [updated, setUpdated] = useState(null);

  const run = useCallback(async () => {
    try {
      const r = await fetch(`${API}${path}`);
      if (!r.ok) throw new Error(`${r.status}`);
      setData(await r.json());
      setError(null);
      setUpdated(new Date());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => {
    run();
    if (pollMs) { const id = setInterval(run, pollMs); return () => clearInterval(id); }
  }, [run, pollMs]);

  return { data, loading, error, updated, refetch: run };
}

// ── Formatters ────────────────────────────────────────────────────────────────
const f$ = v => v == null ? "—" : v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v.toFixed(2)}`;
const fp = v => v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const ago = iso => {
  if (!iso) return "";
  try {
    const dt = new Date(iso);
    if (isNaN(dt)) return "";
    const s = (Date.now() - dt) / 1000;
    if (s < 0)           return "just now";
    if (s < 60)          return "just now";
    if (s < 3600)        return `${Math.round(s/60)}m`;
    if (s < 86400)       return `${Math.round(s/3600)}h`;
    if (s < 86400 * 30)  return `${Math.round(s/86400)}d`;
    // Older than 30 days — show actual date instead of "Xd"
    return dt.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  } catch { return ""; }
};
const fmtDate = iso => {
  try {
    const d = new Date(iso);
    return isNaN(d) ? iso?.slice(5) ?? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
};

// ── Shared primitives ─────────────────────────────────────────────────────────
const Skel = ({ h=14, w="100%" }) => (
  <div style={{ height:h, width:w, background:C.border2, borderRadius:2, animation:"pulse 1.4s ease infinite" }} />
);

const Mono = ({ children, style={} }) => (
  <span style={{ fontFamily:"'IBM Plex Mono',monospace", ...style }}>{children}</span>
);

const Label = ({ children }) => (
  <div style={{ fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:C.muted, marginBottom:4 }}>
    {children}
  </div>
);

const Divider = () => <div style={{ height:1, background:C.border, margin:"0" }} />;

const SigBadge = ({ signal }) => {
  const col = signal === "BUY" ? C.green : signal === "TRIM" ? C.red : C.yellow;
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:2,
      background: col + "18", color: col, fontFamily:"'IBM Plex Mono',monospace",
      letterSpacing:"0.05em" }}>
      {signal}
    </span>
  );
};

const ThemeTag = ({ theme }) => {
  const cfg = THEMES[theme];
  if (!cfg) return null;
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:2,
      background: cfg.color + "18", color: cfg.color,
      fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em" }}>
      {cfg.short}
    </span>
  );
};

const ProbBar = ({ prob, color }) => (
  <div style={{ height:3, background:C.border2, borderRadius:1, overflow:"hidden" }}>
    <div style={{ height:"100%", width:`${Math.round(prob*100)}%`, background:color, transition:"width 0.4s" }} />
  </div>
);

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:4, padding:"8px 12px", fontSize:11 }}>
      <div style={{ color:C.muted, marginBottom:4, fontFamily:"'IBM Plex Mono',monospace" }}>{fmtDate(label)}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color:THEMES[p.name]?.color ?? C.accent, fontFamily:"'IBM Plex Mono',monospace" }}>
          {THEMES[p.name]?.short}: {f$(p.value)}
        </div>
      ))}
    </div>
  );
};

// ── Candlestick-style sparkline using area chart ──────────────────────────────
function MiniChart({ data, color }) {
  if (!data?.length) return <div style={{ height:40, background:C.border, borderRadius:2 }} />;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top:2, right:0, left:0, bottom:0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="total" stroke={color} strokeWidth={1.5}
          fill={`url(#spark-${color.replace("#","")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Sentiment bar ─────────────────────────────────────────────────────────────
const SentBar = ({ score=0.5 }) => {
  const pct = Math.round(score * 100);
  const col = score > 0.65 ? C.green : score > 0.45 ? C.yellow : C.red;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ flex:1, height:3, background:C.border2, borderRadius:1 }}>
        <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:1, transition:"width 0.4s" }} />
      </div>
      <Mono style={{ fontSize:10, color:col, minWidth:24 }}>{pct}</Mono>
    </div>
  );
};

// ── Signals tab ───────────────────────────────────────────────────────────────
function SignalsTab({ signalData, signals }) {
  const [customTicker,  setCustomTicker]  = useState("");
  const [lookupResult,  setLookupResult]  = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError,   setLookupError]   = useState(null);
  const [themeFilter,   setThemeFilter]   = useState("All");

  const lookup = async () => {
    const t = customTicker.trim().toUpperCase();
    if (!t) return;
    setLookupLoading(true); setLookupResult(null); setLookupError(null);
    try {
      const r = await fetch(`${API}/api/signals/ticker/${t}`);
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Not found"); }
      setLookupResult(await r.json());
    } catch(e) { setLookupError(e.message); }
    finally { setLookupLoading(false); }
  };

  const themeSigs  = signalData?.themes  ?? {};
  const tickerSigs = signalData?.tickers ?? {};

  const themeTickerMap = {};
  Object.entries(THEME_TICKERS).forEach(([t, list]) => { list.forEach(tk => { themeTickerMap[tk] = t; }); });

  const filtered = themeFilter === "All"
    ? Object.entries(tickerSigs)
    : Object.entries(tickerSigs).filter(([tk]) => themeTickerMap[tk] === themeFilter);

  const sorted = [...filtered].sort((a,b) => b[1].outperform_prob - a[1].outperform_prob);

  const sigCol = s => s === "BUY" ? C.green : s === "TRIM" ? C.red : C.yellow;

  return (
    <div>
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>Prediction Signals</div>
        <Mono style={{ fontSize:11, color:C.muted }}>
          Random Forest · 3y training · 30-day outperformance vs SPY
          {signals.data?.trained_at && ` · trained ${new Date(signals.data.trained_at).toLocaleDateString()}`}
        </Mono>
      </div>

      {/* Custom lookup */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:16, marginBottom:16 }}>
        <Label>Analyze any ticker</Label>
        <div style={{ display:"flex", gap:8, marginBottom:lookupResult || lookupError ? 12 : 0 }}>
          <input value={customTicker}
            onChange={e => setCustomTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="AAPL, TSLA, INO, MRNA…"
            style={{ flex:1, padding:"7px 10px", background:C.bg, border:`1px solid ${C.border2}`,
              borderRadius:3, color:C.text, fontSize:12, fontFamily:"'IBM Plex Mono',monospace", outline:"none" }}
          />
          <button onClick={lookup} disabled={lookupLoading || !customTicker.trim()} style={{
            padding:"7px 18px", borderRadius:3, border:`1px solid ${C.accent}`,
            background: lookupLoading ? C.border : C.accent + "18", color:C.accent,
            fontSize:11, fontFamily:"'IBM Plex Mono',monospace", cursor:lookupLoading?"not-allowed":"pointer",
            letterSpacing:"0.05em", fontWeight:600,
          }}>
            {lookupLoading ? "…" : "RUN →"}
          </button>
        </div>

        {lookupError && (
          <Mono style={{ fontSize:11, color:C.red }}>✗ {lookupError}</Mono>
        )}

        {lookupResult && (() => {
          const sig  = lookupResult.signal;
          const col  = sigCol(sig);
          const prob = Math.round(lookupResult.outperform_prob * 100);
          return (
            <div style={{ background:C.bg, border:`1px solid ${C.border2}`, borderRadius:4, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:20, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color:C.text, marginBottom:6 }}>
                    {lookupResult.ticker ?? customTicker}
                  </div>
                  <div style={{ display:"flex", gap:14 }}>
                    {lookupResult.current_price && <Mono style={{ fontSize:12 }}>${lookupResult.current_price}</Mono>}
                    {lookupResult.change_pct != null && (
                      <Mono style={{ fontSize:12, color:lookupResult.change_pct>=0?C.green:C.red }}>
                        {lookupResult.change_pct>=0?"+":""}{lookupResult.change_pct?.toFixed(2)}%
                      </Mono>
                    )}
                    {lookupResult.mom_20d != null && (
                      <Mono style={{ fontSize:11, color:C.muted }}>20d {lookupResult.mom_20d>=0?"+":""}{lookupResult.mom_20d?.toFixed(1)}%</Mono>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:26, fontWeight:800, color:col, fontFamily:"'IBM Plex Mono',monospace" }}>{sig}</div>
                  <Mono style={{ fontSize:11, color:C.muted }}>{prob}% vs SPY</Mono>
                </div>
              </div>

              {/* Probability ruler */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <Mono style={{ fontSize:9, color:C.muted }}>TRIM ←</Mono>
                  <Mono style={{ fontSize:9, color:C.muted }}>40% / 60%</Mono>
                  <Mono style={{ fontSize:9, color:C.muted }}>→ BUY</Mono>
                </div>
                <div style={{ height:8, background:C.border2, borderRadius:2, position:"relative" }}>
                  <div style={{ position:"absolute", left:"40%", width:1, height:"100%", background:C.border }} />
                  <div style={{ position:"absolute", left:"60%", width:1, height:"100%", background:C.border }} />
                  <div style={{ position:"absolute", left:`${prob}%`, transform:"translateX(-50%)",
                    width:10, height:10, borderRadius:"50%", background:col, top:-1,
                    boxShadow:`0 0 6px ${col}88` }} />
                  <div style={{ width:`${prob}%`, height:"100%", background:col+"28", borderRadius:2 }} />
                </div>
              </div>

              {/* Feature importance */}
              {lookupResult.feature_importance && (
                <div>
                  <Label>What's driving this</Label>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {Object.entries(lookupResult.feature_importance)
                      .sort((a,b)=>b[1]-a[1])
                      .map(([feat, imp]) => (
                        <div key={feat} style={{ padding:"3px 8px", background:C.border, borderRadius:2 }}>
                          <Mono style={{ fontSize:10, color:C.muted }}>{feat} </Mono>
                          <Mono style={{ fontSize:10, color:col }}>{(imp*100).toFixed(0)}%</Mono>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              <div style={{ marginTop:10 }}>
                <Mono style={{ fontSize:10, color:C.dim }}>
                  AUC {lookupResult.auc?.toFixed(3)} · {lookupResult.n_samples} training days · {lookupResult.source}
                </Mono>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Theme signals row */}
      {Object.keys(themeSigs ?? {}).length > 0 && (
        <div style={{ marginBottom:16 }}>
          <Label>Theme signals</Label>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
            {Object.entries(themeSigs).map(([theme, sig]) => {
              const cfg  = THEMES[theme] ?? { color:C.muted, short:"—" };
              const col  = sigCol(sig.signal);
              const prob = Math.round(sig.outperform_prob * 100);
              return (
                <div key={theme} style={{ padding:"12px 14px", background:C.surface,
                  border:`1px solid ${C.border}`, borderRadius:4, borderTop:`2px solid ${col}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <Mono style={{ fontSize:10, color:cfg.color }}>{cfg.short}</Mono>
                    <SigBadge signal={sig.signal} />
                  </div>
                  <div style={{ fontSize:20, fontWeight:800, color:col, fontFamily:"'IBM Plex Mono',monospace", marginBottom:6 }}>{prob}%</div>
                  <ProbBar prob={sig.outperform_prob} color={col} />
                  <Mono style={{ fontSize:9, color:C.dim, marginTop:6 }}>AUC {sig.auc?.toFixed(2)}</Mono>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter row */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {["All", ...Object.keys(THEMES)].map(t => (
          <button key={t} onClick={() => setThemeFilter(t)} style={{
            padding:"4px 10px", borderRadius:2, fontSize:10, fontFamily:"'IBM Plex Mono',monospace",
            cursor:"pointer", letterSpacing:"0.05em",
            color: themeFilter===t ? C.bg : C.muted,
            background: themeFilter===t ? C.accent : "transparent",
            border: `1px solid ${themeFilter===t ? C.accent : C.border}`,
          }}>
            {t === "All" ? "ALL" : THEMES[t].short}
          </button>
        ))}
        <Mono style={{ marginLeft:"auto", fontSize:10, color:C.dim }}>
          {sorted.length} tickers · sorted by probability
        </Mono>
      </div>

      {/* Ticker grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8 }}>
        {sorted.map(([ticker, sig]) => {
          const theme = themeTickerMap[ticker];
          const cfg   = THEMES[theme] ?? { color:C.muted };
          const col   = sigCol(sig.signal);
          const prob  = Math.round(sig.outperform_prob * 100);
          return (
            <div key={ticker}
              onClick={() => { setCustomTicker(ticker); setLookupResult({...sig, ticker}); }}
              style={{ padding:"12px 14px", background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:4, cursor:"pointer", borderLeft:`3px solid ${col}`,
                transition:"border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = col}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <Mono style={{ fontSize:14, fontWeight:700, color:C.text }}>{ticker}</Mono>
                  <div style={{ marginTop:3 }}><ThemeTag theme={theme} /></div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <SigBadge signal={sig.signal} />
                  <Mono style={{ fontSize:11, color:C.muted, display:"block", marginTop:4 }}>{prob}%</Mono>
                </div>
              </div>
              <ProbBar prob={sig.outperform_prob} color={col} />
              <Mono style={{ fontSize:9, color:C.dim, marginTop:6 }}>AUC {sig.auc?.toFixed(2)}</Mono>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Smart Money / Flow tab — congress + SEC insiders ─────────────────────────
function FlowTab({ flowData, flowLoading, flowStatus, onAnalyze, signalData }) {
  const congress = flowData?.congress ?? {};
  const trades = congress?.trades ?? [];
  const insiders = flowData?.insiders ?? [];
  const convergence = flowData?.convergence ?? [];
  const stats = flowData?.stats ?? {};
  const status = flowStatus ?? {};

  const TxBadge = ({ tx }) => {
    const buy = tx === "BUY" || tx === "Purchase" || (tx && String(tx).toLowerCase().includes("purchase"));
    return (
      <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
        fontFamily: "'JetBrains Mono', monospace",
        color: buy ? C.green : C.red,
        background: buy ? `${C.green}18` : `${C.red}18`,
      }}>{buy ? "BUY" : "SELL"}</span>
    );
  };

  return (
    <div style={{ animation: "fadeUp 0.35s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>Smart money</h1>
        <p style={{ fontSize: 13, color: C.muted, maxWidth: 640, lineHeight: 1.6 }}>
          Congressional STOCK Act filings and SEC Form 4 insider disclosures on your thesis universe.
          Public data only — delayed vs trade date. Not financial advice.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        <StatTile label="Congress trades" value={stats.congress_trades ?? "—"} sub={congress?.source === "stonkwhisper" ? "StonkWhisper" : "Public disclosures"} accent={C.accent} loading={flowLoading} />
        <StatTile label="Form 4 filings" value={stats.insider_filings ?? "—"} sub="SEC EDGAR (free)" accent={C.green} loading={flowLoading} />
        <StatTile label="Confluence" value={stats.convergence_hits ?? "—"} sub="overlap w/ signals" accent={C.yellow} loading={flowLoading} />
        <StatTile label="Tracked reps" value={status.watched_politicians?.length ?? 8} sub="Pelosi + watchlist" loading={false} />
      </div>

      {congress?.message && (
        <Panel accent={C.accent} style={{ padding: 14, marginBottom: 16 }}>
          <Mono style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{congress.message}</Mono>
        </Panel>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginBottom: 14 }}>
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
            <Mono style={{ fontSize: 12, fontWeight: 600 }}>Congressional trades</Mono>
            <Mono style={{ fontSize: 9, color: C.dim }}>watched politicians</Mono>
          </div>
          {flowLoading ? <Mono style={{ padding: 16, color: C.dim }}>Loading…</Mono>
            : trades.length ? trades.slice(0, 12).map((t, i) => (
              <div key={i} onClick={() => t.ticker && onAnalyze(t.ticker)}
                style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, cursor: t.ticker ? "pointer" : "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Mono style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>{t.ticker || "—"}</Mono>
                  <TxBadge tx={t.transaction} />
                </div>
                <Mono style={{ fontSize: 10, color: C.muted, display: "block", marginTop: 4 }}>{t.politician}</Mono>
                <Mono style={{ fontSize: 9, color: C.dim }}>{t.amount_range || "—"} · filed {t.filed || "—"}</Mono>
                {t.doc_url && (
                  <a href={t.doc_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ fontSize: 9, color: C.accent, marginTop: 4, display: "inline-block" }}>PTR filing →</a>
                )}
              </div>
            )) : <Mono style={{ padding: 16, color: C.dim }}>No congress trades yet.</Mono>}
        </Panel>

        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
            <Mono style={{ fontSize: 12, fontWeight: 600 }}>SEC Form 4 — corporate insiders</Mono>
          </div>
          {flowLoading ? <Mono style={{ padding: 16, color: C.dim }}>Loading…</Mono>
            : insiders.slice(0, 10).map((t, i) => (
              <div key={i} onClick={() => onAnalyze(t.ticker)}
                style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Mono style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>{t.ticker}</Mono>
                  <Mono style={{ fontSize: 9, color: C.dim }}>{t.filed}</Mono>
                </div>
                <Mono style={{ fontSize: 10, color: C.muted }}>{t.insider}</Mono>
                {t.sec_url && (
                  <a href={t.sec_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ fontSize: 9, color: C.accent, marginTop: 4, display: "inline-block" }}>SEC filing →</a>
                )}
              </div>
            ))}
        </Panel>
      </div>

      <Panel style={{ padding: 16 }}>
        <Mono style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Confluence — congress / Form 4 + ML signal</Mono>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {convergence.slice(0, 16).map(row => {
            const sig = signalData?.tickers?.[row.ticker];
            return (
              <div key={row.ticker} onClick={() => onAnalyze(row.ticker)}
                style={{ padding: 10, background: C.bg, borderRadius: 6, border: `1px solid ${C.border}`, cursor: "pointer" }}>
                <Mono style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{row.ticker}</Mono>
                <Mono style={{ fontSize: 9, color: C.dim, display: "block", marginTop: 4 }}>
                  {row.congress_buy ? "CONG " : ""}{row.insider_filing ? "SEC4 " : ""}{sig?.signal || row.signal}
                </Mono>
                <Mono style={{ fontSize: 11, color: C.green, marginTop: 4 }}>{(row.confluence_score * 100).toFixed(0)}%</Mono>
              </div>
            );
          })}
        </div>
        {!convergence.length && !flowLoading && (
          <Mono style={{ fontSize: 11, color: C.dim }}>No overlap yet — refresh after signals train.</Mono>
        )}
      </Panel>
    </div>
  );
}

// ── Framework tab — THESIS investment process ─────────────────────────────────
function FrameworkTab({ portfolio, signalData, attrData, avgSent, onAnalyze }) {
  const [journal, setJournal] = useState(() => {
    try { return JSON.parse(localStorage.getItem("thesis_journal") || "[]"); }
    catch { return []; }
  });
  const [note, setNote] = useState("");

  const attrRows = Object.entries(attrData || {})
    .filter(([k]) => k !== "_portfolio")
    .map(([name, v]) => ({ name, alpha: v.alpha, themeReturn: v.theme_return }));

  const tickerSigs = signalData?.tickers ?? {};
  const buys = [];
  const trims = [];
  const watch = [];

  Object.entries(tickerSigs).forEach(([tk, sig]) => {
    const prob = sig.outperform_prob ?? 0.5;
    const sent = avgSent[tk] ?? 0.5;
    const theme = themeForTicker(tk);
    const themeAlpha = attrRows.find(r => r.name === theme)?.alpha ?? 0;
    const row = { tk, prob, sent, signal: sig.signal, theme, themeAlpha, size: suggestPositionSize(tk) };

    if (prob >= 0.6 && sent >= 0.55) {
      const tier = prob >= 0.65 && sent >= 0.58 && themeAlpha > 0 ? "A" : prob >= 0.62 ? "B" : "C";
      buys.push({ ...row, tier });
    } else if (prob <= 0.4 || sent < 0.4 || sig.signal === "TRIM") {
      trims.push(row);
    } else if (prob >= 0.55) {
      watch.push(row);
    }
  });

  buys.sort((a, b) => b.prob - a.prob);
  trims.sort((a, b) => a.prob - b.prob);

  const saveNote = () => {
    if (!note.trim()) return;
    const entry = { date: new Date().toISOString().slice(0, 10), text: note.trim() };
    const next = [entry, ...journal].slice(0, 20);
    setJournal(next);
    localStorage.setItem("thesis_journal", JSON.stringify(next));
    setNote("");
  };

  const ActionRow = ({ row, type }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 12px", borderBottom:`1px solid ${C.border}`,
      cursor:"pointer" }}
      onClick={() => onAnalyze(row.tk)}
      onMouseEnter={e => { e.currentTarget.style.background = C.surfaceHi; e.currentTarget.style.transform = "translateX(4px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "none"; }}>
      <div>
        <Mono style={{ fontSize:13, fontWeight:700, color:C.accent }}>{row.tk}</Mono>
        <Mono style={{ fontSize:9, color:C.muted, display:"block", marginTop:2 }}>
          {row.theme?.split(" ")[0] || "—"} · signal {row.signal} · {(row.prob*100).toFixed(0)}% · sent {row.sent.toFixed(2)}
        </Mono>
      </div>
      <div style={{ textAlign:"right" }}>
        {type === "buy" && row.tier && (
          <Mono style={{ fontSize:10, color: row.tier==="A"?C.green:row.tier==="B"?C.yellow:C.muted }}>
            TIER {row.tier}
          </Mono>
        )}
        {row.size && <Mono style={{ fontSize:11, color:C.text, display:"block" }}>~${row.size}</Mono>}
        <Mono style={{ fontSize:9, color:C.dim }}>ANALYZE →</Mono>
      </div>
    </div>
  );

  return (
    <div>
      <Panel style={{ marginBottom:14, padding:18 }}>
        <Label>THESIS Framework</Label>
        <div style={{ fontSize:13, color:C.muted, lineHeight:1.65, marginTop:6 }}>
          Systematic process: <b style={{color:C.text}}>Themes → Signals → Evidence → Sentiment → Invest → Review</b>.
          Only size positions when multiple signals align. Not financial advice — edge comes from discipline.
        </div>
      </Panel>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginBottom:14 }}>
        {[
          { k:"T", t:"Themes", d:"Attribution alpha" },
          { k:"H", t:"Heuristics", d:"ML BUY/TRIM" },
          { k:"E", t:"Evidence", d:"Analyzer" },
          { k:"S", t:"Sentiment", d:"News NLP" },
          { k:"I", t:"Invest", d:"Size & entry" },
          { k:"S", t:"Review", d:"Journal" },
        ].map(({k,t,d}) => (
          <Panel key={k} lift style={{ padding:"12px", textAlign:"center" }}>
            <Mono style={{ fontSize:18, fontWeight:800, color:C.accent }}>{k}</Mono>
            <Mono style={{ fontSize:10, color:C.text, display:"block", marginTop:4 }}>{t}</Mono>
            <Mono style={{ fontSize:8, color:C.dim }}>{d}</Mono>
          </Panel>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
        <Panel lift accent={C.green} style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
            <Mono style={{ fontSize:12, fontWeight:700, color:C.green }}>BUY QUEUE ({buys.length})</Mono>
            <Mono style={{ fontSize:9, color:C.muted, display:"block" }}>prob ≥60% · sentiment ≥0.55</Mono>
          </div>
          {buys.length ? buys.slice(0, 8).map(r => <ActionRow key={r.tk} row={r} type="buy" />)
            : <Mono style={{ padding:16, fontSize:11, color:C.dim }}>No BUY candidates right now.</Mono>}
        </Panel>

        <Panel lift accent={C.red} style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
            <Mono style={{ fontSize:12, fontWeight:700, color:C.red }}>TRIM / EXIT ({trims.length})</Mono>
            <Mono style={{ fontSize:9, color:C.muted, display:"block" }}>prob ≤40% or sentiment &lt;0.40</Mono>
          </div>
          {trims.length ? trims.slice(0, 8).map(r => <ActionRow key={r.tk} row={r} type="trim" />)
            : <Mono style={{ padding:16, fontSize:11, color:C.dim }}>No trim signals.</Mono>}
        </Panel>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }}>
        <Panel lift style={{ padding:16 }}>
          <Label>Position rules</Label>
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.8, marginTop:8 }}>
            Base capital: <b style={{color:C.accent}}>${BASE_CAPITAL.toLocaleString()}</b><br/>
            Max per stock: <b style={{color:C.text}}>{(MAX_POSITION_PCT*100)}%</b> (~${BASE_CAPITAL*MAX_POSITION_PCT})<br/>
            Max new trades/week: <b style={{color:C.text}}>2</b><br/>
            Stop-loss: <b style={{color:C.red}}>-15%</b> from entry<br/>
            Cash reserve: <b style={{color:C.text}}>10%</b>
          </div>
        </Panel>
        <Panel lift style={{ padding:16 }}>
          <Label>Theme alpha (vs SPY)</Label>
          {attrRows.length ? attrRows.map(r => (
            <div key={r.name} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0",
              borderBottom:`1px solid ${C.border}` }}>
              <Mono style={{ fontSize:10, color:THEMES[r.name]?.color || C.muted }}>{THEMES[r.name]?.short || r.name}</Mono>
              <Mono style={{ fontSize:10, color:r.alpha>=0?C.green:C.red }}>{fp(r.alpha)}</Mono>
            </div>
          )) : <Mono style={{ fontSize:10, color:C.dim }}>Loading attribution…</Mono>}
        </Panel>
        <Panel lift style={{ padding:16 }}>
          <Label>Watchlist</Label>
          {watch.slice(0, 5).map(r => (
            <div key={r.tk} onClick={() => onAnalyze(r.tk)} style={{ cursor:"pointer", padding:"4px 0",
              borderBottom:`1px solid ${C.border}` }}>
              <Mono style={{ fontSize:11, color:C.text }}>{r.tk}</Mono>
              <Mono style={{ fontSize:9, color:C.dim }}>{(r.prob*100).toFixed(0)}% prob</Mono>
            </div>
          ))}
        </Panel>
      </div>

      <Panel lift style={{ padding:16 }}>
        <Label>Trade journal</Label>
        <div style={{ display:"flex", gap:8, marginTop:10, marginBottom:12 }}>
          <Input3D value={note} onChange={e => setNote(e.target.value)}
            placeholder="What you bought/sold and why…" />
          <Btn onClick={saveNote}>LOG</Btn>
        </div>
        {journal.map((e, i) => (
          <div key={i} style={{ fontSize:11, color:C.muted, padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
            <Mono style={{ color:C.dim, marginRight:8 }}>{e.date}</Mono>{e.text}
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ── Analyzer tab — live market data (no in-app AI) ─────────────────────────────
function AnalyzerTab({ initialTicker = "", onTickerApplied }) {
  const [ticker, setTicker] = useState(initialTicker);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [aiStatus, setAiStatus] = useState({ cohere: false, anthropic: false, any: false });
  const [showAgentPrompt, setShowAgentPrompt] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    if (initialTicker) setTicker(initialTicker);
    onTickerApplied?.();
  }, [initialTicker]);

  useEffect(() => {
    fetch(`${API}/api/analyze/ai-status`).then(r => r.ok ? r.json() : null)
      .then(s => s && setAiStatus(s)).catch(() => {});
  }, []);

  useEffect(() => {
    if (reportRef.current) reportRef.current.scrollTop = reportRef.current.scrollHeight;
  }, [report]);

  const fmt = (v, prefix="", suffix="", dec=2) => {
    if (v == null || isNaN(v)) return "N/A";
    if (Math.abs(v) >= 1e12) return `${prefix}${(v/1e12).toFixed(1)}T${suffix}`;
    if (Math.abs(v) >= 1e9)  return `${prefix}${(v/1e9).toFixed(1)}B${suffix}`;
    if (Math.abs(v) >= 1e6)  return `${prefix}${(v/1e6).toFixed(1)}M${suffix}`;
    return `${prefix}${Number(v).toFixed(dec)}${suffix}`;
  };

  const pct = v => v == null ? "N/A" : `${(v*100).toFixed(1)}%`;
  const num = (v, d=2) => v == null ? "N/A" : Number(v).toFixed(d);
  const priceTag = (price, sma) => {
    if (price == null || sma == null) return null;
    const above = price > sma;
    return { text: above ? "above" : "below", color: above ? C.green : C.red };
  };

  const agentPrompt = (sym) => `📈 Analyze ${sym} using live data: ${API}/api/analyze/${sym}

Write an institutional report (valuation, earnings, technicals, risks, bull/bear, verdict).`;

  const analyze = async () => {
    const sym = ticker.trim().toUpperCase();
    if (!sym) return;
    setLoading(true); setError(null); setQuote(null); setReport(""); setReportError(null);
    try {
      const r = await fetch(`${API}/api/analyze/${sym}?_=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || `Failed to fetch ${sym}`);
      }
      const data = await r.json();
      setQuote(data);
      if (!data.sector && !data.market_cap) {
        setError("Fundamentals empty — add ALPHA_VANTAGE_API_KEY on Render, redeploy backend, hard-refresh.");
      }
    } catch (e) {
      setError(e.message || "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    const sym = ticker.trim().toUpperCase();
    if (!sym || !quote) return;
    setReportLoading(true); setReport(""); setReportError(null);
    try {
      const resp = await fetch(`${API}/api/analyze/${sym}/report`);
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.detail || "Report failed");
      }
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("Streaming not supported");
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const j = JSON.parse(line.slice(6));
            if (j.error) throw new Error(j.error);
            if (j.text) setReport(prev => prev + j.text);
          } catch (err) {
            if (err instanceof SyntaxError) continue;
            throw err;
          }
        }
      }
    } catch (e) {
      setReportError(e.message || "Report failed");
    } finally {
      setReportLoading(false);
    }
  };

  const renderMd = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return (
        <div key={i} style={{ marginTop:20, marginBottom:8 }}>
          <Mono style={{ fontSize:10, color:C.accent, letterSpacing:"0.1em", textTransform:"uppercase" }}>
            {line.replace("## ","")}
          </Mono>
          <div style={{ height:1, background:C.border2, marginTop:4 }}/>
        </div>
      );
      if (line.startsWith("### ")) return (
        <div key={i} style={{ fontSize:12, fontWeight:600, color:"#60a5fa", marginTop:12, marginBottom:4 }}>
          {line.replace("### ","")}
        </div>
      );
      if (line.startsWith("| ") && line.includes("|")) return (
        <div key={i} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10,
          color:C.muted, borderBottom:`1px solid ${C.border}`, padding:"4px 0" }}>{line}</div>
      );
      if (line.startsWith("- ") || line.startsWith("• ")) return (
        <div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
          <span style={{ color:C.accent, flexShrink:0 }}>▸</span>
          <span style={{ fontSize:12, color:C.text, lineHeight:1.6 }}>
            {line.replace(/^[-•] /,"").replace(/\*\*(.*?)\*\*/g,"$1")}
          </span>
        </div>
      );
      if (!line.trim()) return <div key={i} style={{ height:6 }}/>;
      return (
        <div key={i} style={{ fontSize:12, color:"#94a3b8", lineHeight:1.7, marginBottom:2 }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>") }}/>
      );
    });
  };

  const panel = { ...panelBase(), padding:16, marginBottom:12 };
  const row = { display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.border}` };
  const DataRow = ({ label, value, color=C.text }) => (
    <div style={row}>
      <Mono style={{ fontSize:10, color:C.muted }}>{label}</Mono>
      <Mono style={{ fontSize:11, fontWeight:600, color }}>{value}</Mono>
    </div>
  );

  const q = quote;
  const pctChange = q?.price && q?.prev_close ? ((q.price/q.prev_close-1)*100) : null;

  return (
    <div>
      <Panel style={{ marginBottom:16, padding:16 }}>
        <Label>Stock Lookup — Live Market Data</Label>
        <Mono style={{ fontSize:10, color:C.dim, display:"block", marginBottom:10 }}>
          Live fundamentals + technicals (Yahoo). Optional AI report uses your free Cohere key (same as news sentiment).
        </Mono>
        <Mono style={{ fontSize:9, color: API.includes("localhost") ? C.red : C.dim, display:"block", marginBottom:8 }}>
          API: {API}
          {API.includes("localhost") && " — wrong for production; set VITE_API_URL on Vercel"}
        </Mono>
        <div style={{ display:"flex", gap:8 }}>
          <Input3D value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&!loading&&analyze()}
            placeholder="NVDA, AAPL, MSFT, LMT, SIGA, BRK-B…" />
          <Btn onClick={analyze} disabled={loading||!ticker.trim()}>{loading ? "FETCHING…" : "LOOKUP →"}</Btn>
        </div>
        {error && <Mono style={{ fontSize:11, color:C.red, marginTop:8 }}>✗ {error}</Mono>}
        {q?.fundamentals_error && (
          <Mono style={{ fontSize:10, color:C.yellow, marginTop:6 }}>
            ⚠ Fundamentals: {q.fundamentals_error}
          </Mono>
        )}
        <div style={{ marginTop:10, display:"flex", gap:8, alignItems:"center" }}>
          <button type="button" onClick={() => setShowAgentPrompt(v => !v)} style={{
            background:"transparent", border:`1px solid ${C.border2}`, borderRadius:2,
            padding:"3px 10px", color:C.muted, fontSize:10, cursor:"pointer",
            fontFamily:"'IBM Plex Mono',monospace" }}>
            {showAgentPrompt ? "HIDE CURSOR PROMPT" : "CURSOR PROMPT →"}
          </button>
          {ticker.trim() && (
            <button type="button" onClick={() => navigator.clipboard?.writeText(agentPrompt(ticker.trim().toUpperCase()))}
              style={{ background:"transparent", border:`1px solid ${C.border2}`, borderRadius:2,
                padding:"3px 10px", color:C.accent, fontSize:10, cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace" }}>COPY PROMPT</button>
          )}
        </div>
        {showAgentPrompt && (
          <pre style={{ marginTop:10, padding:12, background:C.bg, border:`1px solid ${C.border}`,
            borderRadius:3, fontSize:10, color:C.muted, whiteSpace:"pre-wrap", lineHeight:1.5,
            fontFamily:"'IBM Plex Mono',monospace", maxHeight:120, overflowY:"auto" }}>
            {agentPrompt(ticker.trim().toUpperCase() || "[TICKER]")}
          </pre>
        )}
      </Panel>

      {q && (
        <Panel style={{ padding:"12px 16px", marginBottom:16,
          display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:12 }}>
          {[
            { label:"PRICE",     value:`$${q.price?.toFixed(2)}`,
              color: pctChange!=null ? (pctChange>=0?C.green:C.red) : C.text },
            { label:"CHANGE",    value: pctChange!=null ? `${pctChange>=0?"+":""}${pctChange.toFixed(2)}%` : "N/A",
              color: pctChange!=null ? (pctChange>=0?C.green:C.red) : C.text },
            { label:"52W HIGH",  value:`$${q.week52_high?.toFixed(2)}` },
            { label:"52W LOW",   value:`$${q.week52_low?.toFixed(2)}` },
            { label:"52W POS",   value:q.pct_of_52w_range!=null?`${q.pct_of_52w_range}%`:"N/A",
              color: q.pct_of_52w_range>80?C.green:q.pct_of_52w_range<20?C.red:C.yellow },
            { label:"MKT CAP",   value:fmt(q.market_cap,"$") },
            { label:"P/E TTM",   value:q.pe_ttm?.toFixed(1)||"N/A" },
            { label:"FWD P/E",   value:q.forward_pe?.toFixed(1)||"N/A" },
            { label:"RSI(14)",   value:q.rsi_14?.toFixed(1)||"N/A",
              color: q.rsi_14>70?C.red:q.rsi_14<30?C.green:C.text },
            { label:"MACD HIST", value:q.macd_hist!=null?(q.macd_hist>=0?"+":"")+q.macd_hist?.toFixed(3):"N/A",
              color: q.macd_hist>=0?C.green:C.red },
            { label:"SMA 200",   value:q.sma_200?`$${q.sma_200?.toFixed(0)}`:"N/A",
              color: q.price&&q.sma_200?(q.price>q.sma_200?C.green:C.red):C.text },
            { label:"BB UPPER",  value:q.bb_upper?`$${q.bb_upper?.toFixed(2)}`:"N/A" },
            { label:"TARGET",    value:q.target_mean?`$${q.target_mean?.toFixed(2)}`:"N/A", color:"#60a5fa" },
            { label:"UPSIDE",    value:q.target_mean&&q.price?`${((q.target_mean/q.price-1)*100).toFixed(1)}%`:"N/A",
              color: q.target_mean&&q.price?(q.target_mean>q.price?C.green:C.red):C.text },
            { label:"CONSENSUS", value:q.recommendation?.toUpperCase()||"N/A",
              color:["buy","strong_buy"].includes(q.recommendation)?C.green:
                    q.recommendation==="sell"?C.red:C.yellow },
            { label:"BETA",      value:q.beta?.toFixed(2)||"N/A" },
            { label:"SHORT %",   value:q.short_pct_float?pct(q.short_pct_float):"N/A" },
            { label:"VOL TREND", value:q.volume_trend!=null?(q.volume_trend>=0?"+":"")+q.volume_trend+"%":"N/A",
              color: q.volume_trend>=10?C.green:q.volume_trend<=-10?C.red:C.text },
          ].map(({label,value,color=C.text})=>(
            <MetricChip key={label} label={label} value={value} color={color} />
          ))}
        </Panel>
      )}

      {q && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>
          <Panel lift tilt style={{ padding:16 }}>
            <Label>Company</Label>
            <DataRow label="Name" value={q.long_name || q.symbol} color={C.accent}/>
            <DataRow label="Sector" value={q.sector || "N/A"}/>
            <DataRow label="Industry" value={q.industry || "N/A"}/>
            <DataRow label="Exchange" value={q.exchange || "N/A"}/>
            <DataRow label="Employees" value={q.employees?.toLocaleString() || "N/A"}/>
            <DataRow label="Market Cap" value={fmt(q.market_cap,"$")}/>
            <DataRow label="Avg Volume" value={fmt(q.avg_volume,"","",0)}/>
          </Panel>

          <Panel lift tilt style={{ padding:16 }}>
            <Label>Valuation</Label>
            <DataRow label="P/E (TTM)" value={num(q.pe_ttm,1)}/>
            <DataRow label="Forward P/E" value={num(q.forward_pe,1)}/>
            <DataRow label="PEG" value={num(q.peg_ratio,2)}/>
            <DataRow label="Price/Sales" value={num(q.price_to_sales,2)}/>
            <DataRow label="Price/Book" value={num(q.price_to_book,2)}/>
            <DataRow label="EV/EBITDA" value={num(q.ev_ebitda,2)}/>
            <DataRow label="EV/Revenue" value={num(q.ev_revenue,2)}/>
          </Panel>

          <Panel lift tilt style={{ padding:16 }}>
            <Label>Financials</Label>
            <DataRow label="Revenue (TTM)" value={fmt(q.revenue,"$")}/>
            <DataRow label="Gross Margin" value={pct(q.gross_margins)}/>
            <DataRow label="Operating Margin" value={pct(q.operating_margins)}/>
            <DataRow label="Profit Margin" value={pct(q.profit_margins)}/>
            <DataRow label="Revenue Growth" value={pct(q.revenue_growth)}/>
            <DataRow label="Earnings Growth" value={pct(q.earnings_growth)}/>
            <DataRow label="Free Cash Flow" value={fmt(q.free_cashflow,"$")}/>
            <DataRow label="Cash / Debt" value={`${fmt(q.total_cash,"$")} / ${fmt(q.total_debt,"$")}`}/>
            <DataRow label="ROE / ROA" value={`${pct(q.roe)} / ${pct(q.roa)}`}/>
          </Panel>

          <Panel lift tilt accent={C.green} style={{ padding:16 }}>
            <Label>Technicals</Label>
            <DataRow label="RSI (14)" value={num(q.rsi_14,1)}
              color={q.rsi_14>70?C.red:q.rsi_14<30?C.green:C.text}/>
            <DataRow label="MACD" value={num(q.macd,4)}/>
            <DataRow label="MACD Signal" value={num(q.macd_signal,4)}/>
            <DataRow label="MACD Hist" value={num(q.macd_hist,4)}
              color={q.macd_hist>=0?C.green:C.red}/>
            <DataRow label="SMA 20" value={`$${num(q.sma_20)}`}
              color={priceTag(q.price,q.sma_20)?.color}/>
            <DataRow label="SMA 50" value={`$${num(q.sma_50)}`}
              color={priceTag(q.price,q.sma_50)?.color}/>
            <DataRow label="SMA 200" value={`$${num(q.sma_200)}`}
              color={priceTag(q.price,q.sma_200)?.color}/>
            <DataRow label="Bollinger" value={`${num(q.bb_lower)} – ${num(q.bb_upper)}`}/>
            <DataRow label="ATR (14)" value={`$${num(q.atr_14)}`}/>
            <DataRow label="Volume Trend" value={q.volume_trend!=null?`${q.volume_trend>=0?"+":""}${q.volume_trend}%`:"N/A"}
              color={q.volume_trend>=10?C.green:q.volume_trend<=-10?C.red:C.text}/>
          </Panel>

          <Panel lift tilt accent="#60a5fa" style={{ padding:16 }}>
            <Label>Analyst Consensus</Label>
            <DataRow label="Rating" value={(q.recommendation||"N/A").toUpperCase()}
              color={["buy","strong_buy"].includes(q.recommendation)?C.green:q.recommendation==="sell"?C.red:C.yellow}/>
            <DataRow label="Target Mean" value={`$${num(q.target_mean)}`} color="#60a5fa"/>
            <DataRow label="Target High / Low" value={`$${num(q.target_high)} / $${num(q.target_low)}`}/>
            <DataRow label="Strong Buy" value={q.analyst_strong_buy ?? 0}/>
            <DataRow label="Buy" value={q.analyst_buy ?? 0}/>
            <DataRow label="Hold" value={q.analyst_hold ?? 0}/>
            <DataRow label="Sell" value={q.analyst_sell ?? 0}/>
            <DataRow label="Strong Sell" value={q.analyst_strong_sell ?? 0}/>
          </Panel>

          <Panel lift tilt style={{ padding:16 }}>
            <Label>Positioning</Label>
            <DataRow label="Beta" value={num(q.beta,2)}/>
            <DataRow label="Short % Float" value={pct(q.short_pct_float)}/>
            <DataRow label="Insider %" value={pct(q.insider_pct)}/>
            <DataRow label="Institutional %" value={pct(q.institution_pct)}/>
            <DataRow label="Dividend Yield" value={q.dividend_yield ? pct(q.dividend_yield) : "None"}/>
          </Panel>
        </div>
      )}

      {q && (q.earnings_history?.length > 0) && (
        <Panel lift style={{ marginTop:14, padding:16 }}>
          <Label>Earnings — Last 4 Quarters</Label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginTop:8,
            paddingBottom:6, borderBottom:`1px solid ${C.border2}` }}>
            {["Quarter","EPS Actual","EPS Est","Surprise"].map(h=>(
              <Mono key={h} style={{ fontSize:9, color:C.muted, letterSpacing:"0.08em" }}>{h}</Mono>
            ))}
          </div>
          {(q.earnings_history||[]).map((e,i)=>{
            const surprise = e.actual!=null && e.estimate
              ? ((e.actual-e.estimate)/Math.abs(e.estimate)*100).toFixed(1)+"%" : "N/A";
            const beat = e.actual!=null && e.estimate && e.actual >= e.estimate;
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, padding:"6px 0",
                borderBottom:`1px solid ${C.border}` }}>
                <Mono style={{ fontSize:11, color:C.text }}>{e.date}</Mono>
                <Mono style={{ fontSize:11 }}>${num(e.actual)}</Mono>
                <Mono style={{ fontSize:11, color:C.muted }}>${num(e.estimate)}</Mono>
                <Mono style={{ fontSize:11, color:beat?C.green:C.red }}>{surprise}</Mono>
              </div>
            );
          })}
        </Panel>
      )}

      {q?.description && (
        <Panel lift style={{ marginTop:14, padding:16 }}>
          <Label>Business Summary</Label>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.65, marginTop:8 }}>{q.description}</div>
        </Panel>
      )}

      {q && (
        <Panel style={{ marginTop:14, padding:14, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          {aiStatus.any ? (
            <button type="button" onClick={generateReport} disabled={reportLoading} style={{
              padding:"7px 18px", borderRadius:3, border:`1px solid #60a5fa`,
              background:reportLoading?"#60a5fa10":"#60a5fa18", color:"#60a5fa", fontSize:11,
              fontFamily:"'IBM Plex Mono',monospace", cursor:reportLoading?"wait":"pointer", fontWeight:700 }}>
              {reportLoading ? "WRITING REPORT…" : "AI REPORT →"}
            </button>
          ) : (
            <Mono style={{ fontSize:10, color:C.muted }}>
              No AI key on server — add COHERE_API_KEY on Render (free) or use Cursor prompt below
            </Mono>
          )}
          {aiStatus.cohere && (
            <Mono style={{ fontSize:9, color:C.green }}>FREE · COHERE</Mono>
          )}
          {reportError && <Mono style={{ fontSize:10, color:C.red }}>✗ {reportError}</Mono>}
          {q.fundamentals_source && (
            <Mono style={{ fontSize:9, color:C.dim }}>data: {q.fundamentals_source}</Mono>
          )}
        </Panel>
      )}

      {report && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
          overflow:"hidden", marginTop:12 }}>
          <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <Mono style={{ fontSize:13, fontWeight:700, color:C.accent }}>{ticker} — Analyst Report</Mono>
            <span style={{ fontSize:9, padding:"2px 7px", borderRadius:2,
              background:aiStatus.cohere?"#22c55e18":"#60a5fa18",
              color:aiStatus.cohere?C.green:"#60a5fa",
              border:`1px solid ${aiStatus.cohere?C.green:"#60a5fa"}30`,
              fontFamily:"'IBM Plex Mono',monospace", fontWeight:600 }}>
              {aiStatus.cohere ? "COHERE FREE" : "ANTHROPIC"}
            </span>
          </div>
          <div ref={reportRef} style={{ padding:"16px 20px", maxHeight:500, overflowY:"auto" }}>
            {renderMd(report)}
          </div>
        </div>
      )}

      {!loading && !q && !error && (
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
          padding:48, textAlign:"center" }}>
          <Mono style={{ fontSize:11, color:C.muted, display:"block", marginBottom:16 }}>
            Enter any ticker for live fundamentals, technicals, and earnings
          </Mono>
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            {["NVDA","AAPL","MSFT","TSLA","GOOGL","SIGA","LMT","CEG","PWR","RTX"].map(t=>(
              <button key={t} onClick={()=>setTicker(t)} style={{
                padding:"3px 10px", borderRadius:2, border:`1px solid ${C.border2}`,
                background:"transparent", color:C.muted, fontSize:10,
                fontFamily:"'IBM Plex Mono',monospace", cursor:"pointer" }}>{t}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function ThesisDashboard() {
  const [tab,         setTab]         = useState("overview");
  const [analyzerFocus, setAnalyzerFocus] = useState("");
  const [themeFilter, setThemeFilter] = useState(null);
  const [newsFilter,  setNewsFilter]  = useState("All");
  const [period,      setPeriod]      = useState("3y");
  const [now,         setNow]         = useState(new Date());
  const [online,      setOnline]      = useState(null);

  const pf      = useApi("/api/portfolio",           60_000);
  const px      = useApi("/api/prices",              60_000);
  const feed    = useApi("/api/news?limit=2000",     300_000);
  const attr    = useApi(`/api/attribution?period=${period}`, null);
  const signals = useApi("/api/signals",             3_600_000);
  const flow      = useApi("/api/flow/universe",     3_600_000);
  const flowStat  = useApi("/api/flow/status",       600_000);

  useEffect(() => { attr.refetch?.(); }, [period]);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);
  useEffect(() => {
    fetch(`${API}/api/portfolio`).then(r => setOnline(r.ok)).catch(() => setOnline(false));
  }, []);

  const portfolio  = pf.data;
  const prices     = px.data    ?? {};
  const news       = feed.data  ?? [];
  const attrData   = attr.data  ?? {};
  const signalData = signals.data ?? { themes:{}, tickers:{} };
  const timeline   = portfolio?.timeline ?? [];
  const totalVal   = portfolio?.total_value  ?? 0;
  const totalRet   = portfolio?.total_return ?? 0;

  // Ticker sentiment from news
  const tkSent = {};
  news.forEach(a => (a.tickers ?? []).forEach(tk => {
    tkSent[tk] = tkSent[tk] ?? [];
    tkSent[tk].push(a.sentiment?.score ?? 0.5);
  }));
  const avgSent = Object.fromEntries(
    Object.entries(tkSent).map(([k,v]) => [k, v.reduce((a,b)=>a+b,0)/v.length])
  );
  const globalSent = Object.values(avgSent).length
    ? (Object.values(avgSent).reduce((a,b)=>a+b,0)/Object.values(avgSent).length).toFixed(2)
    : "—";

  const attrRows = Object.entries(attrData)
    .filter(([k]) => k !== "_portfolio")
    .map(([name, v]) => ({ name, return: v.theme_return, benchmark: v.benchmark_return, alpha: v.alpha }));

  const filtNews = newsFilter === "All" ? news : news.filter(n => n.theme === newsFilter);

  const handleRefresh = async () => {
    await fetch(`${API}/api/refresh`, { method:"POST" }).catch(()=>{});
    setTimeout(() => { pf.refetch(); px.refetch(); feed.refetch(); flow.refetch(); flowStat.refetch(); }, 2000);
  };

  const NAV = [
    ["overview", "Overview", "Portfolio"],
    ["flow", "Smart money", "Congress · SEC"],
    ["framework", "Framework", "THESIS process"],
    ["themes", "Themes", "Buckets"],
    ["news", "News", "Sentiment"],
    ["signals", "Signals", "ML"],
    ["attribution", "Attribution", "Alpha"],
    ["analyzer", "Analyzer", "Deep dive"],
  ];

  return (
    <div className="thesis-scene" style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:13, lineHeight:1.5, display:"flex" }}>
      <style>{DEPTH_CSS}</style>
      <div className="thesis-main" style={{ display:"flex", width:"100%", minHeight:"100vh" }}>

      <aside style={{
        ...panelBase({ borderRadius: 0, marginBottom: 0, borderRight: `1px solid ${C.border}`, borderLeft: "none" }),
        width: 220, flexShrink: 0, padding: "16px 12px",
        display: "flex", flexDirection: "column", minHeight: "100vh",
        position: "sticky", top: 0, alignSelf: "flex-start",
      }}>
        <div style={{ padding: "4px 8px 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: C.accent, color: C.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
            boxShadow: `0 4px 0 #06080c, 0 8px 20px ${C.accent}44`,
            marginBottom: 10,
          }}>T</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: C.text }}>Thesis</div>
          <Mono style={{ fontSize: 9, color: C.dim, display: "block", marginTop: 4 }}>research dashboard</Mono>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV.map(([id, label, sub]) => (
            <SideNavItem key={id} active={tab === id} label={label} sub={sub}
              onClick={() => setTab(id)} />
          ))}
        </nav>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <Btn small ghost onClick={handleRefresh}>Refresh data</Btn>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: online === false ? C.red : C.green }} />
            <Mono style={{ fontSize: 9, color: online === false ? C.red : C.green }}>
              {online === false ? "Offline" : "Live"}
            </Mono>
            <Mono style={{ fontSize: 9, color: C.dim, marginLeft: "auto" }}>
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Mono>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
      {online === false && (
        <div style={{ background: `${C.red}12`, borderBottom: `1px solid ${C.red}33`, padding: "8px 24px" }}>
          <Mono style={{ fontSize: 11, color: C.red }}>Backend offline — start uvicorn on port 8000</Mono>
        </div>
      )}

      <main className="thesis-main" style={{ padding: "24px 28px", maxWidth: 1280, animation: "fadeUp 0.4s ease" }}>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (<>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:16 }}>
            {[
              { label:"PORTFOLIO", value:pf.loading?null:f$(totalVal),     sub:"3-year thesis",          accent:C.accent },
              { label:"RETURN",    value:pf.loading?null:fp(totalRet),      sub:"vs $15k cost basis",      accent:totalRet>=0?C.green:C.red },
              { label:"THEMES",    value:Object.keys(THEMES ?? {}).length,        sub:"investment buckets",      accent:C.muted },
              { label:"TICKERS",   value:px.loading?null:Object.keys(prices ?? {}).length||53, sub:"tracked positions", accent:C.muted },
              { label:"SENTIMENT", value:feed.loading?null:globalSent,      sub:"24h avg compound",        accent:C.muted },
              { label:"ARTICLES",  value:feed.loading?null:news.length,     sub:"in feed",            accent:C.muted },
            ].map(({ label, value, sub, accent }) => (
              <StatTile key={label} label={label} value={value} sub={sub} accent={accent} loading={value == null} />
            ))}
          </div>

          {/* Signal cards — quick view */}
          {Object.keys(signalData?.themes ?? {}).length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:16 }}>
              {Object.entries(signalData?.themes ?? {}).map(([theme, sig]) => {
                const cfg  = THEMES[theme] ?? { color:C.muted, short:"—" };
                const col  = sig.signal==="BUY"?C.green:sig.signal==="TRIM"?C.red:C.yellow;
                const prob = Math.round(sig.outperform_prob*100);
                return (
                  <Panel key={theme} onClick={() => setTab("signals")} accent={col}
                    style={{ padding:"10px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <Mono style={{ fontSize:10, color:cfg.color }}>{cfg.short}</Mono>
                      <SigBadge signal={sig.signal} />
                    </div>
                    <Mono style={{ fontSize:18, fontWeight:700, color:col }}>{prob}%</Mono>
                    <ProbBar prob={sig.outperform_prob} color={col} />
                  </Panel>
                );
              })}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:12, marginBottom:12 }}>
            <Panel style={{ padding:"16px 16px 8px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>Performance by theme</div>
                  <Mono style={{ fontSize:10, color:C.muted }}>
                    {timeline.length ? (() => { const sorted = [...timeline].sort((a,b)=>a.date>b.date?1:-1); return `${fmtDate(sorted[0]?.date)} – ${fmtDate(sorted.at(-1)?.date)}`; })() : "Loading…"}
                  </Mono>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  {Object.entries(THEMES).map(([n,c])=>(
                    <div key={n} style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:6, height:6, borderRadius:1, background:c.color }} />
                      <Mono style={{ fontSize:9, color:C.muted }}>{c.short}</Mono>
                    </div>
                  ))}
                </div>
              </div>
              {pf.loading ? (
                <div style={{ height:220, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Mono style={{ fontSize:11, color:C.dim }}>Loading price history…</Mono>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timeline} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="date" tick={{ fill:C.dim, fontSize:9, fontFamily:"'IBM Plex Mono',monospace" }}
                      axisLine={false} tickLine={false} tickFormatter={d => {
                        try {
                          const dt = new Date(d);
                          return isNaN(dt) ? "" : dt.toLocaleDateString("en-US",{month:"short",year:"2-digit"});
                        } catch { return ""; }
                      }}
                      interval={Math.max(1, Math.floor((timeline.length || 1) / 6))}
                    />
                    <YAxis tick={{ fill:C.dim, fontSize:9, fontFamily:"'IBM Plex Mono',monospace" }}
                      axisLine={false} tickLine={false} tickFormatter={v=>f$(v)}/>
                    <Tooltip content={<ChartTip/>}/>
                    {Object.entries(THEMES).map(([n,c])=>(
                      <Area key={n} type="monotone" dataKey={n} stroke={c.color} strokeWidth={2}
                        fill={c.color} fillOpacity={0.06} dot={false} activeDot={{ r:4, fill:c.color, strokeWidth:0 }}/>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Panel>

            {/* Theme cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Object.entries(THEMES).map(([name, cfg]) => {
                const t    = portfolio?.themes?.[name];
                const ret  = t?.return_pct ?? 0;
                const tl   = timeline.map(row => ({ total: row[name] ?? 0 }));
                return (
                  <Panel key={name} onClick={() => { setThemeFilter(name); setTab("themes"); }}
                    accent={cfg.color} style={{ padding:"10px 12px", flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                      <Mono style={{ fontSize:10, color:cfg.color }}>{cfg.short}</Mono>
                      {pf.loading
                        ? <Skel h={14} w={40}/>
                        : <Mono style={{ fontSize:12, fontWeight:700, color:ret>=0?C.green:C.red }}>{fp(ret)}</Mono>
                      }
                    </div>
                    {pf.loading
                      ? <Skel h={18} w={60}/>
                      : <Mono style={{ fontSize:16, fontWeight:700, color:C.text }}>{f$(t?.current_value)}</Mono>
                    }
                    <div style={{ marginTop:6 }}>
                      <MiniChart data={tl} color={cfg.color} />
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>

          <Panel style={{ overflow:"hidden", padding:0 }}>
            <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
              <div style={{ fontSize:12, fontWeight:600 }}>Positions</div>
              <Mono style={{ fontSize:10, color:C.dim }}>
                {px.updated ? `prices ${ago(px.updated)} ago` : "loading…"} · sentiment from news NLP
              </Mono>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                  {["Ticker","Theme","Price","Day","20d","Sentiment","Weight"].map(h=>(
                    <th key={h} style={{ padding:"7px 16px", textAlign:"left", fontSize:9, color:C.dim,
                      fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.08em", fontWeight:400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(THEMES).flatMap(([theme,cfg])=>
                  (portfolio?.themes?.[theme]?.tickers??[]).map(tk=>{
                    const p    = prices[tk];
                    const pos  = (p?.change_pct ?? 0) >= 0;
                    const sent = avgSent[tk];
                    const alloc = portfolio?.themes?.[theme]?.allocation_pct ?? 0;
                    const w    = alloc / (portfolio?.themes?.[theme]?.tickers?.length ?? 1);
                    // 20d momentum from price history — approx from change_pct
                    const sigData = signalData.tickers?.[tk];
                    return (
                      <tr key={tk} style={{ borderBottom:`1px solid ${C.border}` }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.border}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"8px 16px" }}>
                          <Mono style={{ fontSize:13, fontWeight:700, color:cfg.color }}>{tk}</Mono>
                        </td>
                        <td style={{ padding:"8px 16px" }}><ThemeTag theme={theme}/></td>
                        <td style={{ padding:"8px 16px" }}>
                          {px.loading ? <Skel h={12} w={50}/> : <Mono style={{ fontSize:12 }}>{p?`$${p.price.toFixed(2)}`:"—"}</Mono>}
                        </td>
                        <td style={{ padding:"8px 16px" }}>
                          {px.loading ? <Skel h={12} w={40}/> : (
                            <Mono style={{ fontSize:12, color:pos?C.green:C.red }}>
                              {p?fp(p.change_pct):"—"}
                            </Mono>
                          )}
                        </td>
                        <td style={{ padding:"8px 16px" }}>
                          {sigData ? (
                            <SigBadge signal={sigData.signal} />
                          ) : <Mono style={{ fontSize:10, color:C.dim }}>—</Mono>}
                        </td>
                        <td style={{ padding:"8px 16px", width:140 }}>
                          {feed.loading ? <Skel h={3}/> : <SentBar score={sent}/>}
                        </td>
                        <td style={{ padding:"8px 16px" }}>
                          <Mono style={{ fontSize:10, color:C.muted }}>{w.toFixed(1)}%</Mono>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Panel>
        </>)}

        {/* ══ THEMES ══ */}
        {tab === "themes" && (
          <div>
            <div style={{ display:"flex", gap:6, marginBottom:16 }}>
              <button onClick={()=>setThemeFilter(null)} style={{
                padding:"4px 12px", borderRadius:2, fontSize:10, cursor:"pointer",
                fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em",
                color:!themeFilter?C.bg:C.muted,
                background:!themeFilter?C.accent:"transparent",
                border:`1px solid ${!themeFilter?C.accent:C.border}`,
              }}>ALL</button>
              {Object.entries(THEMES).map(([n,c])=>(
                <button key={n} onClick={()=>setThemeFilter(n===themeFilter?null:n)} style={{
                  padding:"4px 12px", borderRadius:2, fontSize:10, cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em",
                  color:themeFilter===n?C.bg:C.muted,
                  background:themeFilter===n?c.color:"transparent",
                  border:`1px solid ${themeFilter===n?c.color:C.border}`,
                }}>{c.short}</button>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {(themeFilter?[[themeFilter,THEMES[themeFilter]]]:Object.entries(THEMES)).map(([name,cfg])=>{
                const t = portfolio?.themes?.[name];
                return (
                  <div key={name} style={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:4, overflow:"hidden" }}>
                    <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`,
                      borderLeft:`4px solid ${cfg.color}` }}>
                      <Mono style={{ fontSize:11, color:cfg.color, marginBottom:6 }}>{name.toUpperCase()}</Mono>
                      {t && (
                        <div style={{ display:"flex", gap:20 }}>
                          <div>
                            <Label>VALUE</Label>
                            <Mono style={{ fontSize:18, fontWeight:700 }}>{f$(t.current_value)}</Mono>
                          </div>
                          <div>
                            <Label>RETURN</Label>
                            <Mono style={{ fontSize:18, fontWeight:700, color:t.return_pct>=0?C.green:C.red }}>
                              {fp(t.return_pct)}
                            </Mono>
                          </div>
                          <div>
                            <Label>ALLOC</Label>
                            <Mono style={{ fontSize:18, fontWeight:700, color:C.muted }}>{t.allocation_pct}%</Mono>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding:0 }}>
                      {(t?.tickers??[]).map((tk,i)=>{
                        const p    = prices[tk];
                        const pos  = (p?.change_pct??0)>=0;
                        const sent = avgSent[tk];
                        return (
                          <div key={tk} style={{ display:"flex", justifyContent:"space-between",
                            alignItems:"center", padding:"9px 16px",
                            borderBottom:i<(t?.tickers?.length??0)-1?`1px solid ${C.border}`:"none" }}>
                            <div style={{ flex:1 }}>
                              <Mono style={{ fontSize:13, fontWeight:700 }}>{tk}</Mono>
                              <div style={{ marginTop:4, width:100 }}><SentBar score={sent}/></div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <Mono style={{ fontSize:12 }}>{p?`$${p.price.toFixed(2)}`:"—"}</Mono>
                              <Mono style={{ fontSize:11, color:pos?C.green:C.red, display:"block" }}>
                                {p?fp(p.change_pct):"—"}
                              </Mono>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ NEWS ══ */}
        {tab === "news" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ display:"flex", gap:6 }}>
                {["All",...Object.keys(THEMES)].map(f=>(
                  <button key={f} onClick={()=>setNewsFilter(f)} style={{
                    padding:"4px 10px", borderRadius:2, fontSize:10, cursor:"pointer",
                    fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em",
                    color:newsFilter===f?C.bg:C.muted,
                    background:newsFilter===f?C.accent:"transparent",
                    border:`1px solid ${newsFilter===f?C.accent:C.border}`,
                  }}>{f==="All"?"ALL":THEMES[f].short}</button>
                ))}
              </div>
              <Mono style={{ fontSize:10, color:C.dim }}>
                {filtNews.length} articles
                {feed.updated ? ` · updated ${ago(feed.updated)} ago` : ""}
              </Mono>
            </div>

            {feed.loading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                {[...Array(8)].map((_,i)=>(
                  <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:4, padding:"12px 16px" }}>
                    <Skel h={12} w="30%"/><div style={{height:6}}/>
                    <Skel h={14} w="85%"/>
                  </div>
                ))}
              </div>
            ) : filtNews.length === 0 ? (
              <Mono style={{ fontSize:12, color:C.dim, padding:40, textAlign:"center", display:"block" }}>
                No articles found.
              </Mono>
            ) : (
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden" }}>
                {filtNews.map((item, i) => {
                  const cfg = THEMES[item.theme] ?? { color:C.muted };
                  const s   = item.sentiment;
                  const pos = (s?.compound ?? 0) >= 0;
                  return (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                      style={{ textDecoration:"none", display:"block" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 100px",
                        padding:"11px 16px", borderBottom:`1px solid ${C.border}`,
                        gap:16, alignItems:"center" }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.border}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5 }}>
                            <ThemeTag theme={item.theme}/>
                            <Mono style={{ fontSize:10, color:"#888888" }}>
                              {item.source} · {ago(item.published_at)}
                            </Mono>
                          </div>
                          <div style={{ fontSize:12, color:"#f0f0f0", lineHeight:1.6, marginBottom:6 }}>
                            {item.headline}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <Mono style={{ fontSize:9, color:"#777777" }}>SENT</Mono>
                            <div style={{ width:80 }}><SentBar score={s?.score}/></div>
                            {s?.model && <Mono style={{ fontSize:9, color:"#555555" }}>via {s.model}</Mono>}
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <Mono style={{ fontSize:16, fontWeight:800, color:pos?C.green:C.red }}>
                            {pos?"+":""}{s?.compound?.toFixed(2)}
                          </Mono>
                          <Mono style={{ fontSize:9, color:pos?C.green:C.red, display:"block",
                            textTransform:"uppercase", letterSpacing:"0.08em", marginTop:3 }}>{s?.label}</Mono>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ SIGNALS ══ */}
        {tab === "signals" && (
          <SignalsTab signalData={signalData} signals={signals} />
        )}

        {/* ══ ATTRIBUTION ══ */}
        {tab === "attribution" && (
          <div>
            <div style={{ display:"flex", gap:6, marginBottom:16 }}>
              {PERIODS.map(p=>(
                <button key={p} onClick={()=>setPeriod(p)} style={{
                  padding:"4px 10px", borderRadius:2, fontSize:10, cursor:"pointer",
                  fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em",
                  color:period===p?C.bg:C.muted,
                  background:period===p?C.accent:"transparent",
                  border:`1px solid ${period===p?C.accent:C.border}`,
                }}>{p.toUpperCase()}</button>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:"16px 16px 8px" }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:16 }}>Theme returns vs SPY · {period.toUpperCase()}</div>
                {attr.loading ? (
                  <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Mono style={{ fontSize:11, color:C.dim }}>Loading…</Mono>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={attrRows} barGap={4} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false}/>
                      <XAxis dataKey="name" tick={{ fill:C.dim, fontSize:9, fontFamily:"'IBM Plex Mono',monospace" }}
                        axisLine={false} tickLine={false} tickFormatter={n=>THEMES[n]?.short??n.split(" ")[0]}/>
                      <YAxis tick={{ fill:C.dim, fontSize:9, fontFamily:"'IBM Plex Mono',monospace" }}
                        axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                      <Tooltip contentStyle={{ background:C.surface, border:`1px solid ${C.border2}`,
                        borderRadius:4, fontSize:10, fontFamily:"'IBM Plex Mono',monospace" }}
                        formatter={(v,n)=>[`${v?.toFixed(1)}%`, n==="return"?"Theme":"SPY"]}/>
                      <Bar dataKey="return" name="return" radius={[2,2,0,0]}>
                        {attrRows.map((_,i)=><Cell key={i} fill={Object.values(THEMES)[i]?.color??C.accent}/>)}
                      </Bar>
                      <Bar dataKey="benchmark" name="benchmark" fill={C.border2} radius={[2,2,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:16 }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:16 }}>Alpha by theme</div>
                {attr.loading ? [...Array(3)].map((_,i)=>(
                  <div key={i} style={{ marginBottom:16 }}><Skel h={36}/></div>
                )) : attrRows.map((row,i)=>{
                  const cfg = Object.values(THEMES)[i];
                  const mx  = Math.max(...attrRows.map(r=>r.return), 1);
                  return (
                    <div key={row.name} style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <Mono style={{ fontSize:11, color:cfg?.color }}>{THEMES[row.name]?.short ?? row.name.split(" ")[0]}</Mono>
                        <div style={{ display:"flex", gap:16 }}>
                          <Mono style={{ fontSize:11, color:C.muted }}>
                            return <span style={{color:C.green}}>{fp(row.return)}</span>
                          </Mono>
                          <Mono style={{ fontSize:11, color:C.muted }}>
                            α <span style={{color:C.accent}}>{fp(row.alpha)}</span>
                          </Mono>
                        </div>
                      </div>
                      <div style={{ height:5, background:C.border2, borderRadius:2, position:"relative" }}>
                        <div style={{ position:"absolute", width:`${(row.benchmark/mx)*100}%`, height:"100%", background:C.dim, borderRadius:2 }}/>
                        <div style={{ position:"absolute", width:`${Math.min((row.return/mx)*100,100)}%`, height:"100%", background:cfg?.color, borderRadius:2, opacity:0.85 }}/>
                      </div>
                    </div>
                  );
                })}

                {attrData._portfolio && (
                  <div style={{ marginTop:16, padding:"12px 14px", background:C.bg,
                    border:`1px solid ${C.border2}`, borderRadius:3 }}>
                    <Label>Portfolio vs SPY · {period.toUpperCase()}</Label>
                    <div style={{ display:"flex", gap:24, marginTop:6 }}>
                      <div>
                        <Mono style={{ fontSize:18, fontWeight:700, color:C.green }}>
                          {fp(attrData._portfolio.total_return)}
                        </Mono>
                        <Mono style={{ fontSize:9, color:C.dim, display:"block", marginTop:2 }}>THESIS</Mono>
                      </div>
                      <div>
                        <Mono style={{ fontSize:18, fontWeight:700, color:C.dim }}>
                          {fp(attrData._portfolio.benchmark_return)}
                        </Mono>
                        <Mono style={{ fontSize:9, color:C.dim, display:"block", marginTop:2 }}>SPY</Mono>
                      </div>
                      <div>
                        <Mono style={{ fontSize:18, fontWeight:700, color:C.accent }}>
                          {fp(attrData._portfolio.portfolio_alpha)}
                        </Mono>
                        <Mono style={{ fontSize:9, color:C.dim, display:"block", marginTop:2 }}>ALPHA</Mono>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thesis journal */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden" }}>
              <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, fontWeight:600 }}>Thesis journal</div>
              </div>
              {[
                { date:"Jan 2023", theme:"AI Infrastructure",         entry:"Initiated NVDA. AI training compute will be undersupplied for 3–5 years. GPU shortage = picks-and-shovels. Added MSFT, GOOGL, META as hyperscaler beneficiaries." },
                { date:"Apr 2023", theme:"Defense",                   entry:"Added LMT, RTX. Ukraine conflict exposes Western stockpile depletion — multi-year re-armament cycle ahead. Added PLTR: AI battlefield analytics is structural, not a one-time contract." },
                { date:"Sep 2024", theme:"Energy Transition",         entry:"Initiated nuclear basket (CEG, VST). AI data center power demand creates sustained need for carbon-free baseload. Thesis: AI → energy scarcity → nuclear." },
                { date:"Jan 2025", theme:"Biodefense & Pandemic",     entry:"Initiated biodefense basket. CDC tracking elevated hantavirus. 38% CFR, no approved antiviral. mRNA platforms can cut vaccine development from years to months. SIGA holds the only FDA-approved smallpox antiviral." },
                { date:"Mar 2025", theme:"Healthcare Infrastructure", entry:"Added TMO, DHR — lab infrastructure is picks-and-shovels for pandemic response and genomics. ABT rapid testing was proven at scale during COVID." },
              ].map((e,i,a)=>(
                <div key={i} style={{ display:"flex", gap:16, padding:"12px 16px",
                  borderBottom:i<a.length-1?`1px solid ${C.border}`:"none" }}>
                  <Mono style={{ minWidth:72, fontSize:10, color:C.dim, paddingTop:1 }}>{e.date}</Mono>
                  <div>
                    <div style={{ marginBottom:5 }}><ThemeTag theme={e.theme}/></div>
                    <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{e.entry}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "flow" && (
          <FlowTab
            flowData={flow.data}
            flowLoading={flow.loading}
            flowStatus={flowStat.data}
            signalData={signalData}
            onAnalyze={(tk) => { setAnalyzerFocus(tk); setTab("analyzer"); }}
          />
        )}

        {/* ══ FRAMEWORK ══ */}
        {tab === "framework" && (
          <FrameworkTab
            portfolio={portfolio}
            signalData={signalData}
            attrData={attrData}
            avgSent={avgSent}
            onAnalyze={(tk) => { setAnalyzerFocus(tk); setTab("analyzer"); }}
          />
        )}

        {/* ══ ANALYZER ══ */}
        {tab === "analyzer" && (
          <AnalyzerTab
            initialTicker={analyzerFocus}
            onTickerApplied={() => setAnalyzerFocus("")}
          />
        )}

      </main>
      </div>
      </div>
    </div>
  );
}
