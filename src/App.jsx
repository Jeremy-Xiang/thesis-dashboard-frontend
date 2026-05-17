import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "http://localhost:8000";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#0a0a0a",
  surface: "#111111",
  border:  "#1f1f1f",
  border2: "#2a2a2a",
  text:    "#e8e8e8",
  muted:   "#666666",
  dim:     "#333333",
  accent:  "#f0b429",   // single amber accent
  green:   "#22c55e",
  red:     "#ef4444",
  yellow:  "#f0b429",
  // theme colors — flat, no gradients
  ai:      "#60a5fa",
  defense: "#f97316",
  energy:  "#4ade80",
  bio:     "#c084fc",
  health:  "#f472b6",
};

const THEMES = {
  "AI Infrastructure":         { color: C.ai,      icon: "AI",   short: "AI"       },
  "Defense":                   { color: C.defense,  icon: "DEF",  short: "DEF"      },
  "Energy Transition":         { color: C.energy,   icon: "NRG",  short: "NRG"      },
  "Biodefense & Pandemic":     { color: C.bio,      icon: "BIO",  short: "BIO"      },
  "Healthcare Infrastructure": { color: C.health,   icon: "MED",  short: "MED"      },
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
  const col = signal === "BUY" ? C.green : signal === "REDUCE" ? C.red : C.yellow;
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
  Object.entries(THEMES).forEach(([t, cfg]) => { (cfg.tickers ?? []).forEach(tk => { themeTickerMap[tk] = t; }); });

  const filtered = themeFilter === "All"
    ? Object.entries(tickerSigs)
    : Object.entries(tickerSigs).filter(([tk]) => themeTickerMap[tk] === themeFilter);

  const sorted = [...filtered].sort((a,b) => b[1].outperform_prob - a[1].outperform_prob);

  const sigCol = s => s === "BUY" ? C.green : s === "REDUCE" ? C.red : C.yellow;

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
                  <Mono style={{ fontSize:9, color:C.muted }}>REDUCE ←</Mono>
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

// ── Analyzer tab ──────────────────────────────────────────────────────────────
function AnalyzerTab({ news }) {
  const [text, setText] = useState("");
  const [res,  setRes]  = useState(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch(`${API}/api/sentiment/analyze?text=${encodeURIComponent(text)}`);
      if (!r.ok) throw new Error(await r.text());
      setRes(await r.json());
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const lc = l => l === "positive" ? C.green : l === "negative" ? C.red : C.yellow;

  return (
    <div>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:16, marginBottom:16 }}>
        <Label>Score a headline</Label>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()}
            placeholder="Paste any financial headline and hit Enter"
            style={{ flex:1, padding:"7px 10px", background:C.bg, border:`1px solid ${C.border2}`,
              borderRadius:3, color:C.text, fontSize:12, fontFamily:"'IBM Plex Mono',monospace", outline:"none" }} />
          <button onClick={analyze} disabled={busy||!text.trim()} style={{
            padding:"7px 18px", borderRadius:3, border:`1px solid ${C.accent}`,
            background:busy?C.border:C.accent+"18", color:C.accent, fontSize:11,
            fontFamily:"'IBM Plex Mono',monospace", cursor:busy?"not-allowed":"pointer",
            fontWeight:600, letterSpacing:"0.05em" }}>
            {busy ? "…" : "SCORE →"}
          </button>
        </div>
        {err && <Mono style={{ fontSize:11, color:C.red }}>✗ {err}</Mono>}
        {res && (
          <div style={{ background:C.bg, border:`1px solid ${C.border2}`, borderRadius:3, padding:14,
            display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
            {[
              { label:"LABEL",    val:res.label?.toUpperCase(),                            col:lc(res.label) },
              { label:"SCORE",    val:res.score?.toFixed(3),                               col:C.text },
              { label:"COMPOUND", val:`${res.compound>=0?"+":""}${res.compound?.toFixed(3)}`, col:res.compound>=0?C.green:C.red },
            ].map(({ label, val, col }) => (
              <div key={label}>
                <Label>{label}</Label>
                <Mono style={{ fontSize:18, fontWeight:700, color:col }}>{val}</Mono>
              </div>
            ))}
            <Mono style={{ marginLeft:"auto", fontSize:10, color:C.dim }}>via {res.model}</Mono>
          </div>
        )}
      </div>

      {/* Scored feed */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden" }}>
        <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}` }}>
          <Label>Recent scored headlines</Label>
        </div>
        {(news ?? []).slice(0,20).map((item, i) => {
          const s   = item.sentiment;
          const col = s?.label==="positive" ? C.green : s?.label==="negative" ? C.red : C.yellow;
          return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
              padding:"10px 16px", borderBottom:`1px solid ${C.border}`, gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color:C.text, lineHeight:1.5, marginBottom:4 }}>{item.headline}</div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <ThemeTag theme={item.theme} />
                  <Mono style={{ fontSize:10, color:C.dim }}>{item.source} · {ago(item.published_at)}</Mono>
                </div>
              </div>
              <div style={{ textAlign:"right", minWidth:80 }}>
                <Mono style={{ fontSize:13, fontWeight:700, color:col }}>
                  {s?.compound>=0?"+":""}{s?.compound?.toFixed(2)}
                </Mono>
                <div style={{ fontSize:9, color:col, textTransform:"uppercase", marginTop:2, fontFamily:"'IBM Plex Mono',monospace" }}>
                  {s?.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function ThesisDashboard() {
  const [tab,         setTab]         = useState("overview");
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
    setTimeout(() => { pf.refetch(); px.refetch(); feed.refetch(); }, 2000);
  };

  // Shared nav button
  const Tab = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding:"5px 12px", border:"none", cursor:"pointer", fontSize:11,
      fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.06em", fontWeight:600,
      color: tab===id ? C.accent : C.muted,
      background: "transparent",
      borderBottom: tab===id ? `2px solid ${C.accent}` : "2px solid transparent",
      transition:"all 0.1s",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'IBM Plex Sans',system-ui,sans-serif", fontSize:13, lineHeight:1.5 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:2px}
        button{font-family:inherit}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      {/* Offline banner */}
      {online === false && (
        <div style={{ background:"#1a1100", borderBottom:`1px solid #f0b42940`, padding:"7px 24px" }}>
          <Mono style={{ fontSize:11, color:C.accent }}>
            ⚠ Backend offline. Run: uvicorn main:app --port 8000
          </Mono>
        </div>
      )}

      {/* Header */}
      <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 24px",
        display:"flex", alignItems:"stretch", justifyContent:"space-between", height:48 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12, borderRight:`1px solid ${C.border}`, paddingRight:16, marginRight:4 }}>
          <div style={{ width:24, height:24, background:C.accent, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:11, fontWeight:900, color:C.bg, borderRadius:2,
            fontFamily:"'IBM Plex Mono',monospace" }}>T</div>
          <Mono style={{ fontWeight:700, fontSize:13, letterSpacing:"0.05em" }}>THESIS</Mono>
        </div>

        {/* Nav tabs */}
        <nav style={{ display:"flex", alignItems:"stretch", gap:0 }}>
          {[["overview","OVERVIEW"],["themes","THEMES"],["news","NEWS"],["signals","SIGNALS"],["attribution","ATTRIBUTION"],["analyzer","ANALYZER"]].map(([id,l])=>
            <Tab key={id} id={id} label={l} />
          )}
        </nav>

        {/* Right controls */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginLeft:"auto" }}>
          <button onClick={handleRefresh} style={{ background:"none", border:`1px solid ${C.border2}`,
            borderRadius:2, padding:"4px 10px", color:C.muted, fontSize:10,
            cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" }}>↻ REFRESH</button>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%",
              background:online===false?C.red:C.green,
              boxShadow:online===false?`0 0 4px ${C.red}`:`0 0 4px ${C.green}` }} />
            <Mono style={{ fontSize:10, color:online===false?C.red:C.green }}>
              {online===false?"OFFLINE":"LIVE"}
            </Mono>
          </div>
          <Mono style={{ fontSize:10, color:C.dim }}>
            {now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
          </Mono>
        </div>
      </header>

      <main style={{ padding:"20px 24px", maxWidth:1440, margin:"0 auto" }}>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (<>

          {/* Stats strip */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:1, marginBottom:16,
            border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden" }}>
            {[
              { label:"PORTFOLIO", value:pf.loading?null:f$(totalVal),     sub:"paper trading",           accent:C.accent },
              { label:"RETURN",    value:pf.loading?null:fp(totalRet),      sub:"vs $15k cost basis",      accent:totalRet>=0?C.green:C.red },
              { label:"THEMES",    value:Object.keys(THEMES ?? {}).length,        sub:"investment buckets",      accent:C.muted },
              { label:"TICKERS",   value:px.loading?null:Object.keys(prices ?? {}).length||53, sub:"tracked positions", accent:C.muted },
              { label:"SENTIMENT", value:feed.loading?null:globalSent,      sub:"24h avg compound",        accent:C.muted },
              { label:"ARTICLES",  value:feed.loading?null:news.length,     sub:"scored today",            accent:C.muted },
            ].map(({ label, value, sub, accent }) => (
              <div key={label} style={{ padding:"14px 16px", background:C.surface }}>
                <Label>{label}</Label>
                {value == null
                  ? <Skel h={22} w="60%" />
                  : <Mono style={{ fontSize:20, fontWeight:700, color:accent, display:"block" }}>{value}</Mono>
                }
                <div style={{ fontSize:10, color:C.dim, marginTop:3 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Signal cards — quick view */}
          {Object.keys(signalData?.themes ?? {}).length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:16 }}>
              {Object.entries(signalData?.themes ?? {}).map(([theme, sig]) => {
                const cfg  = THEMES[theme] ?? { color:C.muted, short:"—" };
                const col  = sig.signal==="BUY"?C.green:sig.signal==="REDUCE"?C.red:C.yellow;
                const prob = Math.round(sig.outperform_prob*100);
                return (
                  <div key={theme} onClick={() => setTab("signals")}
                    style={{ padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`,
                      borderRadius:4, borderTop:`2px solid ${col}`, cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <Mono style={{ fontSize:10, color:cfg.color }}>{cfg.short}</Mono>
                      <SigBadge signal={sig.signal} />
                    </div>
                    <Mono style={{ fontSize:18, fontWeight:700, color:col }}>{prob}%</Mono>
                    <ProbBar prob={sig.outperform_prob} color={col} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart + theme cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:12, marginBottom:12 }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:"16px 16px 8px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>Performance by theme</div>
                  <Mono style={{ fontSize:10, color:C.muted }}>
                    {timeline.length ? `${fmtDate(timeline[0]?.date)} – ${fmtDate(timeline.at(-1)?.date)}` : "Loading…"}
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
                    <defs>{Object.entries(THEMES).map(([n,c])=>(
                      <linearGradient key={n} id={`a${n.replace(/\W/g,"")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={c.color} stopOpacity={0.12}/>
                        <stop offset="100%" stopColor={c.color} stopOpacity={0}/>
                      </linearGradient>
                    ))}</defs>
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
                      <Area key={n} type="monotone" dataKey={n} stroke={c.color} strokeWidth={1.5}
                        fill={`url(#a${n.replace(/\W/g,"")})`} dot={false} activeDot={{ r:3, fill:c.color }}/>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Theme cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Object.entries(THEMES).map(([name, cfg]) => {
                const t    = portfolio?.themes?.[name];
                const ret  = t?.return_pct ?? 0;
                const tl   = timeline.map(row => ({ total: row[name] ?? 0 }));
                return (
                  <div key={name} onClick={() => { setThemeFilter(name); setTab("themes"); }}
                    style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
                      padding:"10px 12px", cursor:"pointer", flex:1,
                      borderLeft:`3px solid ${cfg.color}` }}>
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
                  </div>
                );
              })}
            </div>
          </div>

          {/* Position monitor table */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden" }}>
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
          </div>
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

        {/* ══ ANALYZER ══ */}
        {tab === "analyzer" && <AnalyzerTab news={news} />}

      </main>
    </div>
  );
}
