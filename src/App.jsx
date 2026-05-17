import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

// In production, set VITE_API_URL (or REACT_APP_API_URL) in your host's env vars.
// Locally it falls back to localhost:8000.
const API =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "http://localhost:8000";

const THEMES = {
  "AI Infrastructure":         { color: "#00e5ff", icon: "◈", description: "Semiconductors, cloud hyperscalers & compute infrastructure for AI workloads" },
  "Defense":                   { color: "#ff6d00", icon: "⬡", description: "Defense contractors, aerospace, drone warfare & battlefield AI" },
  "Energy Transition":         { color: "#69f0ae", icon: "◎", description: "Nuclear renaissance, grid infrastructure & data center power" },
  "Biodefense & Pandemic":     { color: "#e040fb", icon: "⬟", description: "mRNA platforms, antivirals & outbreak response — tracking hantavirus, mpox & emerging zoonotic risk" },
  "Healthcare Infrastructure": { color: "#ff80ab", icon: "✦", description: "Diagnostics, medical devices, lab instruments & health services" },
};

const PERIODS = ["1m","3m","6m","1y","3y"];

// ── Data hook ─────────────────────────────────────────────────────────────────
function useApi(path, pollMs = null) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [updated, setUpdated] = useState(null);

  const run = useCallback(async () => {
    try {
      const r = await fetch(`${API}${path}`);
      if (!r.ok) throw new Error(`${r.status}`);
      setData(await r.json());
      setError(null);
      setUpdated(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => {
    run();
    if (pollMs) { const id = setInterval(run, pollMs); return () => clearInterval(id); }
  }, [run, pollMs]);

  return { data, loading, error, updated, refetch: run };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const f$ = v => v == null ? "—" : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v.toFixed(2)}`;
const fp = v => v == null ? "—" : `${v>=0?"+":""}${v.toFixed(1)}%`;
const ago = iso => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso)) / 1000;
  return s < 3600 ? `${Math.round(s/60)}m ago` : s < 86400 ? `${Math.round(s/3600)}h ago` : `${Math.round(s/86400)}d ago`;
};

// ── UI atoms ──────────────────────────────────────────────────────────────────
const Skel = ({ h=16, w="100%" }) => (
  <div style={{ height: h, width: w, background: "#1a1f2e", borderRadius: 4, animation: "pulse 1.5s ease infinite" }} />
);

const SentBar = ({ score=0.5 }) => {
  const pct = Math.round(score * 100);
  const col = score > 0.65 ? "#69f0ae" : score > 0.45 ? "#ffeb3b" : "#ff5252";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:4, background:"#1a1f2e", borderRadius:2 }}>
        <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:2, transition:"width 0.5s" }} />
      </div>
      <span style={{ fontSize:11, color:col, fontFamily:"monospace", minWidth:28 }}>{pct}</span>
    </div>
  );
};

const Tag = ({ theme }) => {
  const c = THEMES[theme]?.color ?? "#aaa";
  return (
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em", padding:"2px 6px", borderRadius:2,
      background:c+"18", color:c, border:`1px solid ${c}40`, textTransform:"uppercase", fontFamily:"monospace" }}>
      {theme?.split(" ")[0]}
    </span>
  );
};

const StatCard = ({ label, value, sub, accent="#00e5ff", loading }) => (
  <div style={{ padding:"18px 20px", background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, borderLeft:`3px solid ${accent}` }}>
    <div style={{ fontSize:10, color:"#5a6480", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6, fontFamily:"monospace" }}>{label}</div>
    {loading ? <Skel h={26} w="60%" /> : <div style={{ fontSize:22, fontWeight:800, color:"#eef2ff", fontFamily:"'Space Mono',monospace" }}>{value}</div>}
    {sub && <div style={{ fontSize:11, color:"#5a6480", marginTop:4 }}>{sub}</div>}
  </div>
);

const Err = ({ msg, retry }) => (
  <div style={{ padding:"10px 16px", background:"#ff525218", border:"1px solid #ff525240", borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
    <span style={{ fontSize:12, color:"#ff8a80", fontFamily:"monospace" }}>⚠ {msg}</span>
    {retry && <button onClick={retry} style={{ background:"#ff525224", border:"1px solid #ff525240", color:"#ff8a80", borderRadius:4, padding:"3px 10px", fontSize:11, cursor:"pointer" }}>Retry</button>}
  </div>
);

const Spinner = () => (
  <div style={{ height:240, display:"flex", alignItems:"center", justifyContent:"center" }}>
    <div style={{ width:24, height:24, border:"2px solid #1e2533", borderTopColor:"#00e5ff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
  </div>
);

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:6, padding:"10px 14px" }}>
      <div style={{ color:"#5a6480", fontSize:11, marginBottom:6, fontFamily:"monospace" }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color:THEMES[p.name]?.color??"#00e5ff", fontSize:12, fontFamily:"monospace" }}>{p.name}: {f$(p.value)}</div>)}
    </div>
  );
};

// ── FinBERT workbench ─────────────────────────────────────────────────────────
function Analyzer({ news }) {
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

  const lc = l => l === "positive" ? "#69f0ae" : l === "negative" ? "#ff5252" : "#ffeb3b";

  return (
    <>
      <div style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:11, color:"#5a6480", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:14 }}>FinBERT Workbench</div>
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()}
            placeholder="Paste any financial headline — hit Enter to score…"
            style={{ flex:1, padding:"9px 14px", background:"#080c12", border:"1px solid #1e2533", borderRadius:6,
              color:"#eef2ff", fontSize:13, fontFamily:"monospace", outline:"none" }} />
          <button onClick={analyze} disabled={busy||!text.trim()} style={{ padding:"9px 20px", borderRadius:6,
            border:"1px solid #00e5ff40", background:busy?"#00e5ff10":"#00e5ff18", color:"#00e5ff",
            fontSize:12, fontFamily:"monospace", cursor:busy?"not-allowed":"pointer" }}>
            {busy ? "…" : "Analyze →"}
          </button>
        </div>
        {err && <Err msg={err} />}
        {res && (
          <div style={{ display:"flex", gap:20, padding:"12px 16px", background:"#080c12", borderRadius:6, border:"1px solid #1e2533", flexWrap:"wrap" }}>
            {[
              { label:"LABEL",    val: res.label?.toUpperCase(),           col: lc(res.label) },
              { label:"SCORE",    val: res.score?.toFixed(3),              col: "#eef2ff" },
              { label:"COMPOUND", val: `${res.compound>=0?"+":""}${res.compound?.toFixed(3)}`, col: res.compound>=0?"#69f0ae":"#ff5252" },
              ...(res.positive!=null ? [
                { label:"POS%", val:`${(res.positive*100).toFixed(1)}%`,  col:"#69f0ae" },
                { label:"NEU%", val:`${(res.neutral*100).toFixed(1)}%`,   col:"#ffeb3b" },
                { label:"NEG%", val:`${(res.negative*100).toFixed(1)}%`,  col:"#ff5252" },
              ] : []),
            ].map(({ label, val, col }) => (
              <div key={label}>
                <div style={{ fontSize:10, color:"#5a6480", fontFamily:"monospace", marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:16, fontWeight:700, color:col, fontFamily:"Space Mono,monospace" }}>{val}</div>
              </div>
            ))}
            <div style={{ marginLeft:"auto", fontSize:10, color:"#3a4060", fontFamily:"monospace", alignSelf:"flex-end" }}>via {res.model}</div>
          </div>
        )}
      </div>

      <div style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, padding:20 }}>
        <div style={{ fontSize:11, color:"#5a6480", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:14 }}>Scored Feed</div>
        {(news ?? []).slice(0,15).map((item, i) => {
          const s = item.sentiment; const col = lc(s?.label);
          return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0", borderBottom:"1px solid #0f1420" }}>
              <div style={{ flex:1, paddingRight:16 }}>
                <div style={{ fontSize:12, color:"#c8d0f0", lineHeight:1.5, marginBottom:5 }}>{item.headline}</div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Tag theme={item.theme} />
                  <span style={{ fontSize:9, color:"#3a4060", fontFamily:"monospace" }}>{item.source} · {ago(item.published_at)}</span>
                </div>
              </div>
              <div style={{ textAlign:"right", minWidth:110 }}>
                <div style={{ fontSize:13, fontWeight:700, color:col, fontFamily:"Space Mono,monospace" }}>
                  {s?.compound>=0?"+":""}{s?.compound?.toFixed(3)}
                </div>
                <div style={{ fontSize:9, color:col, fontFamily:"monospace", textTransform:"uppercase", marginTop:2 }}>{s?.label}</div>
                <div style={{ marginTop:4, width:80, marginLeft:"auto" }}><SentBar score={s?.score} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function ThesisDashboard() {
  const [tab,        setTab]        = useState("overview");
  const [themeFilter,setThemeFilter]= useState(null);
  const [newsFilter, setNewsFilter] = useState("All");
  const [period,     setPeriod]     = useState("3y");
  const [now,        setNow]        = useState(new Date());
  const [online,     setOnline]     = useState(null);

  // live data
  const pf   = useApi("/api/portfolio",              60_000);
  const px   = useApi("/api/prices",                 60_000);
  const feed = useApi("/api/news?limit=2000",          300_000);
  const attr = useApi(`/api/attribution?period=${period}`, null);

  useEffect(() => { attr.refetch(); }, [period]);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);
  useEffect(() => {
    fetch(`${API}/api/portfolio`).then(r => setOnline(r.ok)).catch(() => setOnline(false));
  }, []);

  // derived
  const portfolio  = pf.data;
  const prices     = px.data    ?? {};
  const news       = feed.data  ?? [];
  const attrData   = attr.data  ?? {};
  const timeline   = portfolio?.timeline ?? [];

  const totalVal = portfolio?.total_value  ?? 0;
  const totalRet = portfolio?.total_return ?? 0;

  // ticker → mean sentiment from news
  const tkSent = {};
  news.forEach(a => (a.tickers ?? []).forEach(tk => {
    tkSent[tk] = tkSent[tk] ?? []; tkSent[tk].push(a.sentiment?.score ?? 0.5);
  }));
  const avgSent = Object.fromEntries(Object.entries(tkSent).map(([k,v]) => [k, v.reduce((a,b)=>a+b,0)/v.length]));
  const globalSent = Object.values(avgSent).length
    ? (Object.values(avgSent).reduce((a,b)=>a+b,0) / Object.values(avgSent).length).toFixed(2)
    : "—";

  const attrRows = Object.entries(attrData)
    .filter(([k]) => k !== "_portfolio")
    .map(([name, v]) => ({ name, return: v.theme_return, benchmark: v.benchmark_return, alpha: v.alpha }));

  const filtNews = newsFilter === "All" ? news : news.filter(n => n.theme === newsFilter);

  const handleRefresh = async () => {
    await fetch(`${API}/api/refresh`, { method:"POST" }).catch(()=>{});
    setTimeout(() => { pf.refetch(); px.refetch(); feed.refetch(); }, 2000);
  };

  const NavBtn = ({ id, label }) => (
    <button className="tab-btn" onClick={() => setTab(id)} style={{
      padding:"5px 12px", borderRadius:4, fontSize:12, fontWeight:500,
      color: tab===id ? "#00e5ff" : "#5a6480",
      background: tab===id ? "#00e5ff14" : "transparent",
      border: tab===id ? "1px solid #00e5ff30" : "1px solid transparent",
      textTransform:"capitalize", letterSpacing:"0.02em",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#080c12", color:"#eef2ff", fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#080c12} ::-webkit-scrollbar-thumb{background:#1e2533;border-radius:2px}
        .tab-btn{background:none;border:none;cursor:pointer;transition:all .15s} .tab-btn:hover{opacity:.85}
        .tr:hover{background:#111622!important} .nc:hover{border-color:#2a3050!important;background:#0f1420!important}
        .tc{transition:all .2s;cursor:pointer} .tc:hover{transform:translateY(-1px)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {online === false && (
        <div style={{ background:"#ff6d0018", borderBottom:"1px solid #ff6d0040", padding:"8px 32px" }}>
          <span style={{ color:"#ff9800", fontSize:12, fontFamily:"monospace" }}>
            ⚠ Backend unreachable — demo data shown. Start with:{" "}
            <code style={{ background:"#1a1f2e", padding:"1px 8px", borderRadius:3 }}>uvicorn main:app --port 8000</code>
          </span>
        </div>
      )}

      {/* Header */}
      <header style={{ borderBottom:"1px solid #1e2533", padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, background:"#0d1117" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:28, height:28, borderRadius:6, background:"linear-gradient(135deg,#00e5ff,#0097a7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900 }}>◈</div>
          <span style={{ fontWeight:700, fontSize:15, letterSpacing:"-0.01em" }}>THESIS</span>
          <span style={{ color:"#1e2533", fontSize:18 }}>|</span>
          <span style={{ color:"#5a6480", fontSize:12, fontFamily:"monospace" }}>Thematic Portfolio Intelligence</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", gap:4 }}>
            {[["overview","Overview"],["themes","Themes"],["news","News"],["attribution","Attribution"],["analyzer","Analyzer"]].map(([id,l])=><NavBtn key={id} id={id} label={l}/>)}
          </div>
          <button onClick={handleRefresh} style={{ background:"#1a1f2e", border:"1px solid #2a3050", borderRadius:4, padding:"4px 10px", color:"#5a6480", fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>↻</button>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:online===false?"#ff6d00":"#69f0ae", boxShadow:`0 0 6px ${online===false?"#ff6d00":"#69f0ae"}` }} />
            <span style={{ fontSize:11, color:online===false?"#ff6d00":"#69f0ae", fontFamily:"monospace" }}>{online===false?"DEMO":"LIVE"}</span>
          </div>
          <span style={{ fontSize:11, color:"#5a6480", fontFamily:"monospace" }}>{now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
        </div>
      </header>

      <main style={{ padding:"24px 32px", maxWidth:1400, margin:"0 auto" }}>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (<>
          {pf.error && <Err msg={pf.error} retry={pf.refetch} />}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
            <StatCard label="Portfolio Value" value={f$(totalVal)}      sub="Paper trading"         accent="#00e5ff" loading={pf.loading} />
            <StatCard label="Total Return"    value={fp(totalRet)}      sub="vs $15k basis"         accent="#69f0ae" loading={pf.loading} />
            <StatCard label="Themes"          value="3"                 sub="AI · Defense · Energy" accent="#ff6d00" loading={false} />
            <StatCard label="Tickers"         value={Object.keys(prices).length||15} sub="All themes" accent="#b39ddb" loading={px.loading} />
            <StatCard label="Avg Sentiment"   value={globalSent}        sub="24h · FinBERT"         accent="#ffeb3b" loading={feed.loading} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, marginBottom:16 }}>
            <div style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, padding:"20px 20px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:11, color:"#5a6480", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:4 }}>Performance by Theme</div>
                  <div style={{ fontSize:12, color:"#3a4060" }}>{timeline.length ? `${timeline[0]?.date} → ${timeline.at(-1)?.date}` : "…"}</div>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  {Object.entries(THEMES).map(([n,c])=>(
                    <div key={n} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:8, height:2, background:c.color, borderRadius:1 }} />
                      <span style={{ fontSize:10, color:"#5a6480" }}>{n.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
              {pf.loading ? <Spinner /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={timeline} margin={{ top:0, right:4, left:-10, bottom:0 }}>
                    <defs>{Object.entries(THEMES).map(([n,c])=>(
                      <linearGradient key={n} id={`g${n.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={c.color} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={c.color} stopOpacity={0}/>
                      </linearGradient>
                    ))}</defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false}/>
                    <XAxis dataKey="date" tick={{ fill:"#3a4060", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} tickFormatter={d=>d?.slice(5)} interval="preserveStartEnd"/>
                    <YAxis tick={{ fill:"#3a4060", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} tickFormatter={v=>f$(v)}/>
                    <Tooltip content={<ChartTip/>}/>
                    {Object.entries(THEMES).map(([n,c])=>(
                      <Area key={n} type="monotone" dataKey={n} stroke={c.color} strokeWidth={2} fill={`url(#g${n.replace(/\s/g,"")})`} dot={false} activeDot={{ r:4, fill:c.color }}/>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {Object.entries(THEMES).map(([name,cfg])=>{
                const t = portfolio?.themes?.[name];
                return (
                  <div key={name} className="tc" onClick={()=>{ setThemeFilter(name); setTab("themes"); }}
                    style={{ background:"#0d1117", border:`1px solid ${themeFilter===name?cfg.color:"#1e2533"}`, borderRadius:8, padding:"14px 16px", flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:10, color:cfg.color, fontFamily:"monospace", letterSpacing:"0.08em", marginBottom:3 }}>{cfg.icon} {name.toUpperCase()}</div>
                        {pf.loading ? <Skel h={24} w={80}/> : <div style={{ fontFamily:"Space Mono,monospace", fontSize:18, fontWeight:700 }}>{f$(t?.current_value)}</div>}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        {pf.loading ? <Skel h={16} w={50}/> : <div style={{ fontSize:13, fontWeight:700, color:(t?.return_pct??0)>=0?"#69f0ae":"#ff5252", fontFamily:"monospace" }}>{fp(t?.return_pct)}</div>}
                        <div style={{ fontSize:10, color:"#3a4060", marginTop:2 }}>{t?.allocation_pct}% alloc</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {(t?.tickers??[]).map(tk=>(
                        <span key={tk} style={{ fontSize:9, padding:"2px 5px", borderRadius:2, background:cfg.color+"14", color:cfg.color+"cc", fontFamily:"monospace", border:`1px solid ${cfg.color}25` }}>{tk}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticker table */}
          <div style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, overflow:"hidden" }}>
            <div style={{ padding:"14px 20px", borderBottom:"1px solid #1e2533", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#5a6480", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"monospace" }}>Position Monitor</span>
              <span style={{ fontSize:10, color:"#3a4060", fontFamily:"monospace" }}>{px.updated ? `Updated ${ago(px.updated)}` : "Prices delayed"} · Sentiment: FinBERT</span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #1e2533" }}>
                  {["Ticker","Theme","Price","Chg%","Sentiment","Weight"].map(h=>(
                    <th key={h} style={{ padding:"8px 20px", textAlign:"left", fontSize:10, color:"#3a4060", fontFamily:"monospace", letterSpacing:"0.08em", fontWeight:400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(THEMES).flatMap(([theme,cfg])=>
                  (portfolio?.themes?.[theme]?.tickers??[]).map(tk=>{
                    const p = prices[tk]; const pos = (p?.change_pct??0)>=0;
                    const sent = avgSent[tk];
                    const alloc = portfolio?.themes?.[theme]?.allocation_pct??0;
                    const w = alloc / (portfolio?.themes?.[theme]?.tickers?.length??1);
                    return (
                      <tr key={tk} className="tr" style={{ borderBottom:"1px solid #0f1420", background:"transparent" }}>
                        <td style={{ padding:"9px 20px", fontFamily:"Space Mono,monospace", fontWeight:700, fontSize:13, color:cfg.color }}>{tk}</td>
                        <td style={{ padding:"9px 20px" }}><Tag theme={theme}/></td>
                        <td style={{ padding:"9px 20px", fontFamily:"monospace", fontSize:12 }}>{px.loading?<Skel h={14} w={60}/>:p?`$${p.price.toFixed(2)}`:"—"}</td>
                        <td style={{ padding:"9px 20px", fontFamily:"monospace", fontSize:12, color:pos?"#69f0ae":"#ff5252" }}>{px.loading?<Skel h={14} w={40}/>:p?fp(p.change_pct):"—"}</td>
                        <td style={{ padding:"9px 20px", width:180 }}>{feed.loading?<Skel h={4}/>:<SentBar score={sent}/>}</td>
                        <td style={{ padding:"9px 20px", fontFamily:"monospace", fontSize:11, color:"#5a6480" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:60, height:3, background:"#1a1f2e", borderRadius:2 }}>
                              <div style={{ width:`${Math.min((w/15)*100,100)}%`, height:"100%", background:cfg.color, borderRadius:2 }}/>
                            </div>
                            <span>{w.toFixed(1)}%</span>
                          </div>
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
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <button className="tab-btn" onClick={()=>setThemeFilter(null)} style={{ padding:"7px 14px", borderRadius:4, fontSize:12, color:!themeFilter?"#00e5ff":"#5a6480", background:!themeFilter?"#00e5ff18":"#0d1117", border:`1px solid ${!themeFilter?"#00e5ff40":"#1e2533"}`, fontFamily:"monospace" }}>All</button>
              {Object.entries(THEMES).map(([n,c])=>(
                <button key={n} className="tab-btn" onClick={()=>setThemeFilter(n===themeFilter?null:n)} style={{ padding:"7px 14px", borderRadius:4, fontSize:12, color:themeFilter===n?c.color:"#5a6480", background:themeFilter===n?c.color+"18":"#0d1117", border:`1px solid ${themeFilter===n?c.color+"50":"#1e2533"}`, fontFamily:"monospace" }}>
                  {c.icon} {n}
                </button>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
              {(themeFilter?[[themeFilter,THEMES[themeFilter]]]:Object.entries(THEMES)).map(([name,cfg])=>{
                const t = portfolio?.themes?.[name];
                return (
                  <div key={name} style={{ background:"#0d1117", border:`1px solid ${cfg.color}30`, borderRadius:8, overflow:"hidden" }}>
                    <div style={{ padding:"16px 20px", borderBottom:`1px solid ${cfg.color}20`, background:cfg.color+"08" }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{cfg.icon}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:cfg.color, marginBottom:4 }}>{name}</div>
                      <div style={{ fontSize:11, color:"#5a6480", lineHeight:1.5, marginBottom:t?12:0 }}>{cfg.description}</div>
                      {t && (
                        <div style={{ display:"flex", gap:16 }}>
                          <div><div style={{ fontSize:10, color:"#3a4060", fontFamily:"monospace" }}>VALUE</div><div style={{ fontSize:16, fontWeight:700, fontFamily:"Space Mono,monospace" }}>{f$(t.current_value)}</div></div>
                          <div><div style={{ fontSize:10, color:"#3a4060", fontFamily:"monospace" }}>RETURN</div><div style={{ fontSize:16, fontWeight:700, color:t.return_pct>=0?"#69f0ae":"#ff5252", fontFamily:"Space Mono,monospace" }}>{fp(t.return_pct)}</div></div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding:16 }}>
                      <div style={{ fontSize:10, color:"#5a6480", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Holdings</div>
                      {(t?.tickers??[]).map(tk=>{
                        const p=prices[tk]; const pos=(p?.change_pct??0)>=0;
                        return (
                          <div key={tk} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #0f1420" }}>
                            <div style={{ flex:1 }}>
                              <span style={{ fontFamily:"Space Mono,monospace", fontWeight:700, fontSize:13 }}>{tk}</span>
                              <div style={{ marginTop:4, width:120 }}><SentBar score={avgSent[tk]}/></div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:12, fontFamily:"monospace" }}>{p?`$${p.price.toFixed(2)}`:"—"}</div>
                              <div style={{ fontSize:11, color:pos?"#69f0ae":"#ff5252", fontFamily:"monospace" }}>{p?fp(p.change_pct):"—"}</div>
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
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ display:"flex", gap:8 }}>
                {["All",...Object.keys(THEMES)].map(f=>(
                  <button key={f} className="tab-btn" onClick={()=>setNewsFilter(f)} style={{ padding:"6px 14px", borderRadius:4, fontSize:11, color:newsFilter===f?"#00e5ff":"#5a6480", background:newsFilter===f?"#00e5ff14":"#0d1117", border:`1px solid ${newsFilter===f?"#00e5ff30":"#1e2533"}`, fontFamily:"monospace" }}>
                    {f==="All"?"All Themes":THEMES[f].icon+" "+f}
                  </button>
                ))}
              </div>
              <span style={{ fontSize:11, color:"#3a4060", fontFamily:"monospace" }}>{filtNews.length} articles · {feed.updated?ago(feed.updated):""}</span>
            </div>
            {feed.error && <Err msg={feed.error} retry={feed.refetch}/>}
            {feed.loading
              ? [...Array(5)].map((_,i)=><div key={i} style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, padding:"16px 20px", marginBottom:10 }}><Skel h={12} w="30%"/><div style={{height:8}}/><Skel h={16} w="90%"/></div>)
              : filtNews.length === 0
                ? <div style={{ padding:40, textAlign:"center", color:"#3a4060", fontFamily:"monospace" }}>No articles — set NewsAPI key in config.py</div>
                : filtNews.map((item,i)=>{
                    const cfg=THEMES[item.theme]??{color:"#aaa"}; const s=item.sentiment;
                    const pos=(s?.compound??0)>=0;
                    return (
                      <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none", display:"block", marginBottom:10 }}>
                        <div className="nc" style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, padding:"16px 20px", display:"grid", gridTemplateColumns:"1fr auto", gap:16, alignItems:"center" }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                              <Tag theme={item.theme}/>
                              {(item.tickers??[]).slice(0,3).map(tk=><span key={tk} style={{ fontFamily:"monospace", fontSize:11, color:cfg.color, fontWeight:700 }}>{tk}</span>)}
                              <span style={{ fontSize:10, color:"#3a4060" }}>· {item.source} · {ago(item.published_at)}</span>
                            </div>
                            <div style={{ fontSize:13, color:"#c8d0f0", lineHeight:1.5, marginBottom:10, fontWeight:500 }}>{item.headline}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              <span style={{ fontSize:10, color:"#5a6480", fontFamily:"monospace" }}>SENTIMENT</span>
                              <div style={{ width:80 }}><SentBar score={s?.score}/></div>
                              {s?.model && <span style={{ fontSize:9, color:"#2a3050", fontFamily:"monospace" }}>via {s.model}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign:"right", minWidth:70 }}>
                            <div style={{ fontSize:15, fontWeight:700, color:pos?"#69f0ae":"#ff5252", fontFamily:"Space Mono,monospace" }}>{pos?"+":""}{s?.compound?.toFixed(2)}</div>
                            <div style={{ fontSize:9, color:pos?"#69f0ae":"#ff5252", fontFamily:"monospace", textTransform:"uppercase", marginTop:3 }}>{s?.label}</div>
                          </div>
                        </div>
                      </a>
                    );
                  })
            }
          </div>
        )}

        {/* ══ ATTRIBUTION ══ */}
        {tab === "attribution" && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              {PERIODS.map(p=>(
                <button key={p} className="tab-btn" onClick={()=>setPeriod(p)} style={{ padding:"5px 14px", borderRadius:4, fontSize:11, color:period===p?"#00e5ff":"#5a6480", background:period===p?"#00e5ff14":"#0d1117", border:`1px solid ${period===p?"#00e5ff30":"#1e2533"}`, fontFamily:"monospace" }}>{p.toUpperCase()}</button>
              ))}
            </div>
            {attr.error && <Err msg={attr.error} retry={attr.refetch}/>}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <div style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, padding:"20px 20px 12px" }}>
                <div style={{ fontSize:11, color:"#5a6480", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:16 }}>Theme Returns vs SPY · {period.toUpperCase()}</div>
                {attr.loading ? <Spinner/> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={attrRows} barGap={6} margin={{ top:0, right:0, left:-10, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false}/>
                      <XAxis dataKey="name" tick={{ fill:"#3a4060", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} tickFormatter={n=>n.split(" ")[0]}/>
                      <YAxis tick={{ fill:"#3a4060", fontSize:10, fontFamily:"monospace" }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                      <Tooltip contentStyle={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:6, fontSize:11, fontFamily:"monospace" }} formatter={(v,n)=>[`${v?.toFixed(1)}%`, n==="return"?"Theme":"SPY"]}/>
                      <Bar dataKey="return"    name="return"    radius={[3,3,0,0]}>{attrRows.map((_,i)=><Cell key={i} fill={Object.values(THEMES)[i]?.color??"#00e5ff"}/>)}</Bar>
                      <Bar dataKey="benchmark" name="benchmark" fill="#1e2533" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, padding:20 }}>
                <div style={{ fontSize:11, color:"#5a6480", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:16 }}>Alpha Attribution</div>
                {attr.loading ? [...Array(3)].map((_,i)=><div key={i} style={{marginBottom:18}}><Skel h={40}/></div>) :
                  attrRows.map((row,i)=>{
                    const cfg=Object.values(THEMES)[i]; const mx=Math.max(...attrRows.map(r=>r.return),1);
                    return (
                      <div key={row.name} style={{ marginBottom:18 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:12, color:cfg?.color, fontFamily:"monospace" }}>{row.name.split(" ")[0].toUpperCase()}</span>
                          <div style={{ display:"flex", gap:14 }}>
                            <span style={{ fontSize:11, color:"#5a6480", fontFamily:"monospace" }}>Return: <span style={{color:"#69f0ae"}}>{fp(row.return)}</span></span>
                            <span style={{ fontSize:11, color:"#5a6480", fontFamily:"monospace" }}>α: <span style={{color:"#ffeb3b"}}>{fp(row.alpha)}</span></span>
                          </div>
                        </div>
                        <div style={{ height:6, background:"#1a1f2e", borderRadius:3, position:"relative" }}>
                          <div style={{ position:"absolute", width:`${(row.benchmark/mx)*100}%`, height:"100%", background:"#2a3050", borderRadius:3 }}/>
                          <div style={{ position:"absolute", width:`${Math.min((row.return/mx)*100,100)}%`, height:"100%", background:cfg?.color, borderRadius:3, opacity:0.85 }}/>
                        </div>
                      </div>
                    );
                  })
                }
                {attrData._portfolio && (
                  <div style={{ marginTop:20, padding:"14px 16px", background:"#00e5ff08", border:"1px solid #00e5ff20", borderRadius:6 }}>
                    <div style={{ fontSize:10, color:"#5a6480", fontFamily:"monospace", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Portfolio vs SPY · {period.toUpperCase()}</div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <div><div style={{ fontSize:20, fontWeight:800, color:"#69f0ae", fontFamily:"Space Mono,monospace" }}>{fp(attrData._portfolio.total_return)}</div><div style={{ fontSize:10, color:"#5a6480", marginTop:2 }}>THESIS</div></div>
                      <div style={{textAlign:"right"}}><div style={{ fontSize:20, fontWeight:800, color:"#3a4060", fontFamily:"Space Mono,monospace" }}>{fp(attrData._portfolio.benchmark_return)}</div><div style={{ fontSize:10, color:"#5a6480", marginTop:2 }}>SPY</div></div>
                      <div style={{textAlign:"right"}}><div style={{ fontSize:20, fontWeight:800, color:"#ffeb3b", fontFamily:"Space Mono,monospace" }}>{fp(attrData._portfolio.portfolio_alpha)}</div><div style={{ fontSize:10, color:"#5a6480", marginTop:2 }}>Alpha</div></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Thesis journal */}
            <div style={{ background:"#0d1117", border:"1px solid #1e2533", borderRadius:8, padding:20 }}>
              <div style={{ fontSize:11, color:"#5a6480", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:14 }}>Thesis Journal</div>
              {[
                { date:"Jan 2023", theme:"AI Infrastructure",         entry:"Initiating NVDA position. AI training compute demand will be structurally underestimated by market for 3-5 years. GPU scarcity analogous to picks-and-shovels. Adding MSFT, GOOGL, META as hyperscaler beneficiaries." },
                { date:"Apr 2023", theme:"Defense",                   entry:"Adding LMT & RTX. Ukraine conflict reveals Western stockpile depletion; multi-year re-armament cycle ahead. Adding PLTR — AI battlefield analytics is a structural shift, not a cyclical contract." },
                { date:"Sep 2024", theme:"Energy Transition",         entry:"Initiating nuclear basket (CEG, VST). AI data center power demand creates new demand base for always-on carbon-free baseload. Thesis: AI → energy scarcity → nuclear renaissance." },
                { date:"Jan 2025", theme:"Biodefense & Pandemic",     entry:"Initiating biodefense basket. CDC flagging elevated hantavirus cases; rodent-borne hemorrhagic fever with ~38% CFR and no approved antiviral. mRNA platforms (MRNA, BNTX) can compress vaccine timelines from years to months. SIGA holds the only FDA-approved smallpox antiviral — strategic stockpile contract provides recurring revenue floor." },
                { date:"Mar 2025", theme:"Healthcare Infrastructure", entry:"Adding diagnostics and lab infrastructure. TMO and DHR are picks-and-shovels for both pandemic response and genomics secular growth. ABT rapid-test infrastructure was stress-tested by COVID — positioned for next outbreak." },
              ].map((e,i,a)=>(
                <div key={i} style={{ display:"flex", gap:16, marginBottom:16, paddingBottom:16, borderBottom:i<a.length-1?"1px solid #1a1f2e":"none" }}>
                  <div style={{ minWidth:70, fontFamily:"monospace", fontSize:10, color:"#3a4060", paddingTop:2 }}>{e.date}</div>
                  <div><div style={{ marginBottom:4 }}><Tag theme={e.theme}/></div><div style={{ fontSize:12, color:"#8892b0", lineHeight:1.6 }}>{e.entry}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ ANALYZER ══ */}
        {tab === "analyzer" && (
          <div>
            <div style={{ fontSize:11, color:"#5a6480", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"monospace", marginBottom:16 }}>FinBERT Sentiment Workbench</div>
            <Analyzer news={news}/>
          </div>
        )}

      </main>
    </div>
  );
}
