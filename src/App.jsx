import { useState, useMemo, useEffect } from "react";

/* ============================================================================
   THESIS — congressional trading intelligence
   ----------------------------------------------------------------------------
   HOW TO WIRE YOUR BACKEND:
   Everything renders from the two arrays below (MEMBERS, TRADES) plus META.
   Replace `useThesisData()` with a fetch to your API that returns the same
   shape. Keep the static snapshot pattern: have a cron job write latest.json
   to Cloudflare R2/KV and fetch THAT here — no cold-start backend on the
   critical path, instant loads, always fresh.

   Shapes:
   member = { id, name, party 'D'|'R', chamber 'House'|'Senate', state,
              committees[], stats:{ trades90d, excessReturn1y, winRate } }
   trade  = { id, memberId, ticker, company, sector, side 'buy'|'sell',
              sizeMin, sizeMax,            // STOCK Act bucket bounds, USD
              tradeDate, filedDate,        // ISO strings
              retSince, spySince,          // % since trade date
              committeeNote }              // string | null
   ============================================================================ */

const TODAY = new Date("2026-06-10");

const META = {
  refreshedMinutesAgo: 12,
  trackedMembers: 28,
  filings7d: 41,
};

const MEMBERS = [
  { id: "m1", name: "Dan Crenshaw", party: "R", chamber: "House", state: "TX", committees: ["Energy & Commerce", "Intelligence"], stats: { trades90d: 14, excessReturn1y: 11.2, winRate: 64 } },
  { id: "m2", name: "Nancy Pelosi", party: "D", chamber: "House", state: "CA", committees: [], stats: { trades90d: 6, excessReturn1y: 28.4, winRate: 71 } },
  { id: "m3", name: "Tommy Tuberville", party: "R", chamber: "Senate", state: "AL", committees: ["Armed Services", "Agriculture"], stats: { trades90d: 31, excessReturn1y: 4.1, winRate: 52 } },
  { id: "m4", name: "Ro Khanna", party: "D", chamber: "House", state: "CA", committees: ["Armed Services", "Oversight"], stats: { trades90d: 48, excessReturn1y: 7.8, winRate: 58 } },
  { id: "m5", name: "Markwayne Mullin", party: "R", chamber: "Senate", state: "OK", committees: ["Armed Services", "Environment & Public Works"], stats: { trades90d: 19, excessReturn1y: 15.6, winRate: 61 } },
  { id: "m6", name: "Josh Gottheimer", party: "D", chamber: "House", state: "NJ", committees: ["Financial Services", "Intelligence"], stats: { trades90d: 57, excessReturn1y: 9.3, winRate: 56 } },
  { id: "m7", name: "Michael McCaul", party: "R", chamber: "House", state: "TX", committees: ["Foreign Affairs", "Homeland Security"], stats: { trades90d: 42, excessReturn1y: 12.9, winRate: 60 } },
  { id: "m8", name: "Debbie Wasserman Schultz", party: "D", chamber: "House", state: "FL", committees: ["Appropriations"], stats: { trades90d: 9, excessReturn1y: 5.4, winRate: 55 } },
  { id: "m9", name: "Shelley Moore Capito", party: "R", chamber: "Senate", state: "WV", committees: ["Appropriations", "Commerce"], stats: { trades90d: 11, excessReturn1y: 6.7, winRate: 57 } },
  { id: "m10", name: "Suzan DelBene", party: "D", chamber: "House", state: "WA", committees: ["Ways & Means"], stats: { trades90d: 8, excessReturn1y: 13.1, winRate: 63 } },
];

const TRADES = [
  { id: "t1", memberId: "m2", ticker: "NVDA", company: "NVIDIA Corp", sector: "Semiconductors", side: "buy", sizeMin: 1000001, sizeMax: 5000000, tradeDate: "2026-05-22", filedDate: "2026-06-08", retSince: 6.8, spySince: 1.1, committeeNote: null },
  { id: "t2", memberId: "m7", ticker: "NVDA", company: "NVIDIA Corp", sector: "Semiconductors", side: "buy", sizeMin: 15001, sizeMax: 50000, tradeDate: "2026-05-28", filedDate: "2026-06-06", retSince: 4.2, spySince: 0.8, committeeNote: "Foreign Affairs — chip export policy jurisdiction" },
  { id: "t3", memberId: "m6", ticker: "NVDA", company: "NVIDIA Corp", sector: "Semiconductors", side: "buy", sizeMin: 1001, sizeMax: 15000, tradeDate: "2026-05-30", filedDate: "2026-06-09", retSince: 3.5, spySince: 0.6, committeeNote: null },
  { id: "t4", memberId: "m3", ticker: "LMT", company: "Lockheed Martin", sector: "Defense", side: "buy", sizeMin: 50001, sizeMax: 100000, tradeDate: "2026-04-29", filedDate: "2026-06-05", retSince: 5.9, spySince: 2.3, committeeNote: "Armed Services — defense appropriations oversight" },
  { id: "t5", memberId: "m5", ticker: "LMT", company: "Lockheed Martin", sector: "Defense", side: "buy", sizeMin: 15001, sizeMax: 50000, tradeDate: "2026-05-04", filedDate: "2026-06-02", retSince: 4.7, spySince: 2.0, committeeNote: "Armed Services — defense appropriations oversight" },
  { id: "t6", memberId: "m4", ticker: "AAPL", company: "Apple Inc", sector: "Technology", side: "sell", sizeMin: 15001, sizeMax: 50000, tradeDate: "2026-05-12", filedDate: "2026-05-26", retSince: -2.1, spySince: 1.6, committeeNote: null },
  { id: "t7", memberId: "m1", ticker: "XOM", company: "Exxon Mobil", sector: "Energy", side: "buy", sizeMin: 15001, sizeMax: 50000, tradeDate: "2026-05-18", filedDate: "2026-06-07", retSince: 3.3, spySince: 1.2, committeeNote: "Energy & Commerce — energy policy jurisdiction" },
  { id: "t8", memberId: "m2", ticker: "AVGO", company: "Broadcom Inc", sector: "Semiconductors", side: "buy", sizeMin: 500001, sizeMax: 1000000, tradeDate: "2026-04-15", filedDate: "2026-05-27", retSince: 12.4, spySince: 3.1, committeeNote: null },
  { id: "t9", memberId: "m6", ticker: "JPM", company: "JPMorgan Chase", sector: "Financials", side: "buy", sizeMin: 15001, sizeMax: 50000, tradeDate: "2026-05-20", filedDate: "2026-06-04", retSince: 2.2, spySince: 1.1, committeeNote: "Financial Services — bank regulation jurisdiction" },
  { id: "t10", memberId: "m3", ticker: "RTX", company: "RTX Corp", sector: "Defense", side: "buy", sizeMin: 15001, sizeMax: 50000, tradeDate: "2026-05-06", filedDate: "2026-06-08", retSince: 3.9, spySince: 1.9, committeeNote: "Armed Services — defense appropriations oversight" },
  { id: "t11", memberId: "m10", ticker: "MSFT", company: "Microsoft Corp", sector: "Technology", side: "buy", sizeMin: 50001, sizeMax: 100000, tradeDate: "2026-05-25", filedDate: "2026-06-03", retSince: 2.8, spySince: 0.9, committeeNote: null },
  { id: "t12", memberId: "m8", ticker: "UNH", company: "UnitedHealth Group", sector: "Healthcare", side: "sell", sizeMin: 1001, sizeMax: 15000, tradeDate: "2026-05-15", filedDate: "2026-06-01", retSince: -4.6, spySince: 1.4, committeeNote: null },
  { id: "t13", memberId: "m9", ticker: "NSC", company: "Norfolk Southern", sector: "Industrials", side: "buy", sizeMin: 1001, sizeMax: 15000, tradeDate: "2026-05-08", filedDate: "2026-05-29", retSince: 1.7, spySince: 1.5, committeeNote: "Commerce — rail oversight jurisdiction" },
  { id: "t14", memberId: "m4", ticker: "PLTR", company: "Palantir Technologies", sector: "Software", side: "buy", sizeMin: 1001, sizeMax: 15000, tradeDate: "2026-06-01", filedDate: "2026-06-09", retSince: 5.1, spySince: 0.4, committeeNote: "Armed Services — defense software contracts" },
  { id: "t15", memberId: "m7", ticker: "GD", company: "General Dynamics", sector: "Defense", side: "buy", sizeMin: 15001, sizeMax: 50000, tradeDate: "2026-04-22", filedDate: "2026-06-04", retSince: 7.2, spySince: 2.6, committeeNote: "Homeland Security — border tech contracts" },
  { id: "t16", memberId: "m5", ticker: "OXY", company: "Occidental Petroleum", sector: "Energy", side: "sell", sizeMin: 15001, sizeMax: 50000, tradeDate: "2026-05-27", filedDate: "2026-06-07", retSince: -1.3, spySince: 0.8, committeeNote: null },
  { id: "t17", memberId: "m2", ticker: "GOOGL", company: "Alphabet Inc", sector: "Technology", side: "sell", sizeMin: 250001, sizeMax: 500000, tradeDate: "2026-05-02", filedDate: "2026-06-01", retSince: -0.9, spySince: 2.1, committeeNote: null },
  { id: "t18", memberId: "m1", ticker: "CVX", company: "Chevron Corp", sector: "Energy", side: "buy", sizeMin: 1001, sizeMax: 15000, tradeDate: "2026-06-03", filedDate: "2026-06-09", retSince: 1.1, spySince: 0.3, committeeNote: "Energy & Commerce — energy policy jurisdiction" },
];

/* Stock quotes — replace with your quote feed (e.g. Finnhub/FMP) in the same
   shape. `spark` is the last 8 closes, any scale (rendered relative). */
const STOCKS = [
  { ticker: "NVDA", company: "NVIDIA Corp", sector: "Semiconductors", price: 168.42, chg1d: 1.8, spark: [151, 154, 158, 156, 161, 163, 166, 168.4] },
  { ticker: "AVGO", company: "Broadcom Inc", sector: "Semiconductors", price: 312.10, chg1d: 0.9, spark: [281, 288, 285, 294, 301, 298, 308, 312.1] },
  { ticker: "LMT", company: "Lockheed Martin", sector: "Defense", price: 542.75, chg1d: 0.4, spark: [512, 518, 515, 524, 531, 528, 538, 542.8] },
  { ticker: "RTX", company: "RTX Corp", sector: "Defense", price: 138.20, chg1d: 0.6, spark: [130, 132, 131, 134, 133, 136, 137, 138.2] },
  { ticker: "GD", company: "General Dynamics", sector: "Defense", price: 318.55, chg1d: -0.2, spark: [301, 305, 309, 307, 312, 316, 319, 318.6] },
  { ticker: "PLTR", company: "Palantir Technologies", sector: "Software", price: 92.18, chg1d: 2.6, spark: [84, 86, 85, 88, 87, 90, 89.5, 92.2] },
  { ticker: "MSFT", company: "Microsoft Corp", sector: "Technology", price: 512.30, chg1d: 0.5, spark: [494, 498, 503, 500, 506, 509, 508, 512.3] },
  { ticker: "AAPL", company: "Apple Inc", sector: "Technology", price: 231.64, chg1d: -0.7, spark: [240, 238, 236, 237, 234, 235, 233, 231.6] },
  { ticker: "GOOGL", company: "Alphabet Inc", sector: "Technology", price: 198.40, chg1d: -0.3, spark: [201, 203, 200, 202, 199, 200, 199, 198.4] },
  { ticker: "JPM", company: "JPMorgan Chase", sector: "Financials", price: 287.95, chg1d: 0.8, spark: [274, 277, 276, 280, 282, 284, 286, 288] },
  { ticker: "XOM", company: "Exxon Mobil", sector: "Energy", price: 121.85, chg1d: 1.1, spark: [115, 116, 118, 117, 119, 118.5, 120.4, 121.9] },
  { ticker: "CVX", company: "Chevron Corp", sector: "Energy", price: 162.10, chg1d: 0.7, spark: [156, 158, 157, 159, 160, 159.5, 161, 162.1] },
  { ticker: "OXY", company: "Occidental Petroleum", sector: "Energy", price: 47.32, chg1d: -1.2, spark: [50, 49.4, 49.8, 49, 48.5, 48.8, 47.9, 47.3] },
  { ticker: "UNH", company: "UnitedHealth Group", sector: "Healthcare", price: 402.18, chg1d: -1.6, spark: [428, 422, 425, 418, 414, 410, 408, 402.2] },
  { ticker: "NSC", company: "Norfolk Southern", sector: "Industrials", price: 261.40, chg1d: 0.3, spark: [252, 255, 254, 257, 256, 259, 260, 261.4] },
  { ticker: "TSLA", company: "Tesla Inc", sector: "Automotive", price: 286.50, chg1d: 3.1, spark: [262, 270, 266, 274, 271, 278, 279, 286.5] },
  { ticker: "AMD", company: "Advanced Micro Devices", sector: "Semiconductors", price: 172.85, chg1d: 1.4, spark: [160, 163, 162, 166, 168, 167, 170, 172.9] },
  { ticker: "META", company: "Meta Platforms", sector: "Technology", price: 742.60, chg1d: 0.2, spark: [718, 724, 721, 730, 728, 736, 740, 742.6] },
];

/* ------------------------------------------------------------------------- */

function useThesisData() {
  // Swap this for: fetch("https://data.thesis.jeremyxiang.com/latest.json")
  return { members: MEMBERS, trades: TRADES, stocks: STOCKS, meta: META };
}

const fmtMoney = (n) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}M`
  : n >= 1000 ? `$${Math.round(n / 1000)}K`
  : `$${n}`;

const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function ThesisApp() {
  const { members, trades, stocks, meta } = useThesisData();
  const [followed, setFollowed] = useState(new Set(["m2", "m3", "m7"]));
  const [tracked, setTracked] = useState(new Set(["NVDA", "LMT", "PLTR"]));
  const [stockQuery, setStockQuery] = useState("");
  const [openStock, setOpenStock] = useState(null);
  const [tab, setTab] = useState("tape");
  const [query, setQuery] = useState("");
  const [sideFilter, setSideFilter] = useState("all");
  const [chamberFilter, setChamberFilter] = useState("all");
  const [followedOnly, setFollowedOnly] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);

  const toggleFollow = (id) =>
    setFollowed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTrack = (ticker) =>
    setTracked((prev) => {
      const next = new Set(prev);
      next.has(ticker) ? next.delete(ticker) : next.add(ticker);
      return next;
    });

  /* Per-ticker congressional flow over the loaded window */
  const flowByTicker = useMemo(() => {
    const flow = {};
    trades.forEach((t) => {
      const f = (flow[t.ticker] = flow[t.ticker] || {
        buys: 0, sells: 0, buyers: new Set(), committee: 0, totalMin: 0, lastFiled: null,
      });
      if (t.side === "buy") { f.buys++; f.buyers.add(t.memberId); f.totalMin += t.sizeMin; }
      else f.sells++;
      if (t.committeeNote && t.side === "buy") f.committee++;
      if (!f.lastFiled || t.filedDate > f.lastFiled) f.lastFiled = t.filedDate;
    });
    return flow;
  }, [trades]);

  /* Recommendation screen: rank tickers by congressional conviction.
     This is a screen, not advice — the "why" list shows every input. */
  const recommendations = useMemo(() => {
    return stocks
      .map((s) => {
        const f = flowByTicker[s.ticker];
        if (!f || f.buys === 0) return null;
        const net = f.buys - f.sells;
        if (net <= 0) return null;
        let score = 0;
        const why = [];
        if (f.buyers.size >= 2) {
          score += 3 + (f.buyers.size - 2);
          why.push(`Cluster: ${f.buyers.size} members bought within the window`);
        }
        if (f.committee > 0) {
          score += Math.min(4, f.committee * 2);
          why.push(`${f.committee} buy${f.committee > 1 ? "s" : ""} from members with committee jurisdiction over the sector`);
        }
        score += net;
        why.push(`Net congressional flow +${net} (${f.buys} buys / ${f.sells} sells)`);
        if (f.totalMin >= 1000000) { score += 4; why.push(`Combined reported size ≥ ${fmtMoney(f.totalMin)}`); }
        else if (f.totalMin >= 100000) { score += 2; why.push(`Combined reported size ≥ ${fmtMoney(f.totalMin)}`); }
        if (days(f.lastFiled, TODAY) <= 14) { score += 2; why.push(`Most recent filing ${days(f.lastFiled, TODAY)}d ago`); }
        return { ...s, score, why, flow: f };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }, [stocks, flowByTicker]);

  const exits = useMemo(
    () => stocks.filter((s) => {
      const f = flowByTicker[s.ticker];
      return f && f.sells > f.buys;
    }),
    [stocks, flowByTicker]
  );


  const clusters = useMemo(() => {
    const byTicker = {};
    trades.filter((t) => t.side === "buy").forEach((t) => {
      (byTicker[t.ticker] = byTicker[t.ticker] || []).push(t);
    });
    return Object.entries(byTicker)
      .map(([ticker, ts]) => {
        const ids = [...new Set(ts.map((t) => t.memberId))];
        if (ids.length < 2) return null;
        const span = days(
          ts.reduce((a, t) => (t.tradeDate < a ? t.tradeDate : a), ts[0].tradeDate),
          ts.reduce((a, t) => (t.tradeDate > a ? t.tradeDate : a), ts[0].tradeDate)
        );
        if (span > 30) return null;
        const followedCount = ids.filter((id) => followed.has(id)).length;
        return { ticker, company: ts[0].company, trades: ts, memberIds: ids, followedCount,
                 totalMin: ts.reduce((s, t) => s + t.sizeMin, 0) };
      })
      .filter(Boolean)
      .sort((a, b) => b.totalMin - a.totalMin);
  }, [trades, followed]);

  const visibleTrades = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trades
      .filter((t) => {
        const m = memberById[t.memberId];
        if (sideFilter !== "all" && t.side !== sideFilter) return false;
        if (chamberFilter !== "all" && m.chamber !== chamberFilter) return false;
        if (followedOnly && !followed.has(t.memberId)) return false;
        if (q && !(t.ticker.toLowerCase().includes(q) || t.company.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => new Date(b.filedDate) - new Date(a.filedDate));
  }, [trades, query, sideFilter, chamberFilter, followedOnly, followed, memberById]);

  const medianLag = useMemo(() => {
    const lags = trades.map((t) => days(t.tradeDate, t.filedDate)).sort((a, b) => a - b);
    return lags[Math.floor(lags.length / 2)];
  }, [trades]);

  return (
    <div className="thesis-root">
      <style>{CSS}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="th-header">
        <div className="th-wordmark">
          <span className="th-wordmark-plate">Thesis</span>
          <span className="th-tagline">congressional trading intelligence</span>
        </div>
        <div className="th-header-right">
          <input
            className="th-search"
            placeholder="Search ticker or member…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search trades"
          />
          <div className="th-fresh" title="Data pipeline status">
            <span className="th-fresh-dot" />
            refreshed {meta.refreshedMinutesAgo}m ago
          </div>
        </div>
      </header>

      {/* ── Stat strip ──────────────────────────────────────────────────── */}
      <div className="th-stats">
        <Stat label="members tracked" value={meta.trackedMembers} />
        <Stat label="filings, last 7d" value={meta.filings7d} />
        <Stat label="active clusters" value={clusters.length} />
        <Stat label="median filing lag" value={`${medianLag}d`} note="of 45d allowed" />
      </div>

      <div className="th-body">
        {/* ── Following rail ────────────────────────────────────────────── */}
        <aside className="th-rail">
          <div className="th-rail-title">Following · {followed.size}</div>
          {members.filter((m) => followed.has(m.id)).map((m) => {
            const recent = trades.filter((t) => t.memberId === m.id).length;
            return (
              <button key={m.id} className="th-rail-card" onClick={() => { setQuery(m.name); setTab("tape"); }}>
                <span className={`th-party th-party-${m.party}`}>{m.party}</span>
                <span className="th-rail-name">{m.name}</span>
                <span className="th-rail-meta">
                  {recent} filings · <span className={m.stats.excessReturn1y >= 0 ? "pos" : "neg"}>
                    {m.stats.excessReturn1y >= 0 ? "+" : ""}{m.stats.excessReturn1y}% vs SPY
                  </span>
                </span>
              </button>
            );
          })}
          {followed.size === 0 && (
            <div className="th-rail-empty">Follow members from the Members tab to build your watch list.</div>
          )}
          {clusters.filter((c) => c.followedCount >= 2).map((c) => (
            <div key={c.ticker} className="th-cluster-alert">
              <strong>{c.followedCount} followed members</strong> bought {c.ticker} within 30 days
            </div>
          ))}
        </aside>

        {/* ── Main ──────────────────────────────────────────────────────── */}
        <main className="th-main">
          <nav className="th-tabs" role="tablist">
            {[["tape", "The Tape"], ["stocks", "Stocks"], ["members", "Members"], ["signals", "Signals"], ["ideas", "Ideas"]].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k}
                className={`th-tab ${tab === k ? "th-tab-active" : ""}`} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </nav>

          {tab === "tape" && (
            <>
              <div className="th-filters">
                <Seg value={sideFilter} onChange={setSideFilter}
                     options={[["all", "All"], ["buy", "Buys"], ["sell", "Sells"]]} />
                <Seg value={chamberFilter} onChange={setChamberFilter}
                     options={[["all", "Both chambers"], ["House", "House"], ["Senate", "Senate"]]} />
                <label className="th-check">
                  <input type="checkbox" checked={followedOnly} onChange={(e) => setFollowedOnly(e.target.checked)} />
                  Following only
                </label>
              </div>

              <div className="th-legend">
                <span>filed</span><span>member / security</span>
                <span className="th-legend-lag">filing lag — trade date → disclosure (45d window)</span>
                <span>est. size</span><span>vs SPY</span>
              </div>

              {visibleTrades.map((t) => {
                const m = memberById[t.memberId];
                const lag = days(t.tradeDate, t.filedDate);
                const excess = +(t.retSince - t.spySince).toFixed(1);
                const open = expanded === t.id;
                return (
                  <div key={t.id} className={`th-row-wrap ${open ? "th-row-open" : ""}`}>
                    <button className="th-row" onClick={() => setExpanded(open ? null : t.id)} aria-expanded={open}>
                      <span className="th-cell-date">{fmtDate(t.filedDate)}</span>
                      <span className="th-cell-who">
                        <span className={`th-party th-party-${m.party}`}>{m.party}</span>
                        <span className="th-who-text">
                          <span className="th-who-name">{m.name}</span>
                          <span className={`th-side th-side-${t.side}`}>{t.side === "buy" ? "BUY" : "SELL"}</span>
                          <span className="th-ticker">{t.ticker}</span>
                          {t.committeeNote && <span className="th-flag" title={t.committeeNote}>⚑ committee</span>}
                        </span>
                      </span>
                      <span className="th-cell-lag">
                        <LagBar lag={lag} />
                        <span className="th-lag-num">{lag}d</span>
                      </span>
                      <span className="th-cell-size">{fmtMoney(t.sizeMin)}–{fmtMoney(t.sizeMax)}</span>
                      <span className={`th-cell-ret ${excess >= 0 ? "pos" : "neg"}`}>
                        {excess >= 0 ? "+" : ""}{excess}%
                      </span>
                    </button>
                    {open && <TradeDetail trade={t} member={m} excess={excess} />}
                  </div>
                );
              })}
              {visibleTrades.length === 0 && (
                <div className="th-empty">No filings match these filters. Clear a filter to see more of the tape.</div>
              )}
            </>
          )}

          {tab === "stocks" && (
            <StocksPanel
              stocks={stocks}
              tracked={tracked}
              toggleTrack={toggleTrack}
              flowByTicker={flowByTicker}
              trades={trades}
              memberById={memberById}
              stockQuery={stockQuery}
              setStockQuery={setStockQuery}
              openStock={openStock}
              setOpenStock={setOpenStock}
            />
          )}

          {tab === "ideas" && (
            <div className="th-signals">
              <h3 className="th-signal-h">Conviction screen <span>ranked by congressional buying signal — a screen, not advice</span></h3>
              {recommendations.map((r, i) => (
                <div key={r.ticker} className="th-rec-card">
                  <div className="th-rec-rank">{String(i + 1).padStart(2, "0")}</div>
                  <div className="th-rec-main">
                    <div className="th-rec-top">
                      <span className="th-ticker th-ticker-lg">{r.ticker}</span>
                      <span className="th-signal-co">{r.company}</span>
                      <span className="th-rec-px">${r.price.toFixed(2)}
                        <em className={r.chg1d >= 0 ? "pos" : "neg"}> {r.chg1d >= 0 ? "+" : ""}{r.chg1d}%</em>
                      </span>
                      <Sparkline data={r.spark} up={r.spark[r.spark.length - 1] >= r.spark[0]} />
                      <button className={`th-follow ${tracked.has(r.ticker) ? "th-follow-on" : ""}`}
                              onClick={() => toggleTrack(r.ticker)}>
                        {tracked.has(r.ticker) ? "Tracking" : "Track"}
                      </button>
                    </div>
                    <div className="th-rec-score">
                      <span className="th-rec-scorebar"><span style={{ width: `${Math.min(100, r.score * 8)}%` }} /></span>
                      <span className="th-rec-scorenum">{r.score}</span>
                    </div>
                    <ul className="th-rec-why">
                      {r.why.map((w, j) => <li key={j}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              ))}

              {exits.length > 0 && (
                <>
                  <h3 className="th-signal-h">Net selling <span>members are exiting these names</span></h3>
                  {exits.map((s) => {
                    const f = flowByTicker[s.ticker];
                    return (
                      <div key={s.ticker} className="th-signal-card th-signal-thin">
                        <span className="th-side th-side-sell">SELL</span>
                        <span className="th-ticker">{s.ticker}</span>
                        <span className="th-signal-co">{s.company}</span>
                        <span className="th-signal-note">{f.sells} sell{f.sells > 1 ? "s" : ""} vs {f.buys} buy{f.buys === 1 ? "" : "s"} on the tape</span>
                        <span className={`th-rec-px ${s.chg1d >= 0 ? "" : ""}`} style={{ marginLeft: "auto" }}>
                          ${s.price.toFixed(2)} <em className={s.chg1d >= 0 ? "pos" : "neg"}>{s.chg1d >= 0 ? "+" : ""}{s.chg1d}%</em>
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {tab === "members" && (
            <div className="th-member-grid">
              {[...members].sort((a, b) => b.stats.excessReturn1y - a.stats.excessReturn1y).map((m) => (
                <div key={m.id} className="th-member-card">
                  <div className="th-member-top">
                    <span className={`th-party th-party-${m.party}`}>{m.party}</span>
                    <div>
                      <div className="th-member-name">{m.name}</div>
                      <div className="th-member-sub">{m.chamber} · {m.state}</div>
                    </div>
                    <button className={`th-follow ${followed.has(m.id) ? "th-follow-on" : ""}`}
                            onClick={() => toggleFollow(m.id)}>
                      {followed.has(m.id) ? "Following" : "Follow"}
                    </button>
                  </div>
                  <div className="th-member-stats">
                    <div><b className={m.stats.excessReturn1y >= 0 ? "pos" : "neg"}>
                      {m.stats.excessReturn1y >= 0 ? "+" : ""}{m.stats.excessReturn1y}%</b><i>vs SPY, 1y</i></div>
                    <div><b>{m.stats.winRate}%</b><i>win rate</i></div>
                    <div><b>{m.stats.trades90d}</b><i>trades, 90d</i></div>
                  </div>
                  {m.committees.length > 0 && (
                    <div className="th-committees">{m.committees.join(" · ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "signals" && (
            <div className="th-signals">
              <h3 className="th-signal-h">Cluster buys <span>≥2 members, same ticker, 30-day window</span></h3>
              {clusters.map((c) => (
                <div key={c.ticker} className="th-signal-card">
                  <div className="th-signal-top">
                    <span className="th-ticker th-ticker-lg">{c.ticker}</span>
                    <span className="th-signal-co">{c.company}</span>
                    <span className="th-signal-size">≥ {fmtMoney(c.totalMin)} combined</span>
                  </div>
                  <div className="th-signal-members">
                    {c.memberIds.map((id) => (
                      <span key={id} className="th-chip">
                        <span className={`th-party th-party-${memberById[id].party}`}>{memberById[id].party}</span>
                        {memberById[id].name}{followed.has(id) ? " ★" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              <h3 className="th-signal-h">Committee-aligned trades <span>jurisdiction overlaps the sector traded</span></h3>
              {trades.filter((t) => t.committeeNote).map((t) => {
                const m = memberById[t.memberId];
                return (
                  <div key={t.id} className="th-signal-card th-signal-thin">
                    <span className={`th-side th-side-${t.side}`}>{t.side.toUpperCase()}</span>
                    <span className="th-ticker">{t.ticker}</span>
                    <span className="th-signal-co">{m.name}</span>
                    <span className="th-signal-note">{t.committeeNote}</span>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <footer className="th-foot">
        Disclosures sourced from House &amp; Senate financial disclosure filings under the STOCK Act.
        Sizes are reported ranges, not exact amounts. Nothing here is investment advice.
      </footer>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function Stat({ label, value, note }) {
  return (
    <div className="th-stat">
      <div className="th-stat-v">{value}{note && <small> {note}</small>}</div>
      <div className="th-stat-l">{label}</div>
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div className="th-seg" role="group">
      {options.map(([v, label]) => (
        <button key={v} className={`th-seg-btn ${value === v ? "th-seg-on" : ""}`} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Sparkline({ data, up }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * 72},${22 - ((v - min) / range) * 20}`).join(" ");
  return (
    <svg className="th-spark" width="72" height="24" viewBox="0 0 72 24" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={up ? "#3FB68B" : "#E25C5C"} strokeWidth="1.5" />
    </svg>
  );
}

function StocksPanel({ stocks, tracked, toggleTrack, flowByTicker, trades, memberById,
                       stockQuery, setStockQuery, openStock, setOpenStock }) {
  const q = stockQuery.trim().toLowerCase();
  const results = q
    ? stocks.filter((s) => s.ticker.toLowerCase().includes(q) || s.company.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q))
    : [];
  const trackedStocks = stocks.filter((s) => tracked.has(s.ticker));

  const row = (s) => {
    const f = flowByTicker[s.ticker];
    const open = openStock === s.ticker;
    const tickerTrades = trades
      .filter((t) => t.ticker === s.ticker)
      .sort((a, b) => new Date(b.filedDate) - new Date(a.filedDate));
    return (
      <div key={s.ticker} className={`th-row-wrap ${open ? "th-row-open" : ""}`}>
        <div className="th-stockrow">
          <button className="th-stockrow-main" onClick={() => setOpenStock(open ? null : s.ticker)} aria-expanded={open}>
            <span className="th-ticker th-stock-ticker">{s.ticker}</span>
            <span className="th-stock-co">
              <span>{s.company}</span>
              <span className="th-stock-sector">{s.sector}</span>
            </span>
            <Sparkline data={s.spark} up={s.spark[s.spark.length - 1] >= s.spark[0]} />
            <span className="th-stock-px">${s.price.toFixed(2)}</span>
            <span className={`th-cell-ret ${s.chg1d >= 0 ? "pos" : "neg"}`}>
              {s.chg1d >= 0 ? "+" : ""}{s.chg1d}%
            </span>
            <span className="th-stock-flow">
              {f ? <>
                <span className="pos">{f.buys}B</span>/<span className="neg">{f.sells}S</span>
              </> : <span className="th-stock-noflow">no filings</span>}
            </span>
          </button>
          <button className={`th-follow ${tracked.has(s.ticker) ? "th-follow-on" : ""}`}
                  onClick={() => toggleTrack(s.ticker)}>
            {tracked.has(s.ticker) ? "Tracking" : "Track"}
          </button>
        </div>
        {open && (
          <div className="th-detail">
            {tickerTrades.length > 0 ? (
              <>
                <div className="th-detail-k" style={{ marginBottom: 8 }}>Congressional activity</div>
                {tickerTrades.map((t) => {
                  const m = memberById[t.memberId];
                  return (
                    <div key={t.id} className="th-stock-trade">
                      <span className={`th-side th-side-${t.side}`}>{t.side.toUpperCase()}</span>
                      <span className={`th-party th-party-${m.party}`}>{m.party}</span>
                      <span className="th-who-name">{m.name}</span>
                      <span className="th-cell-size">{fmtMoney(t.sizeMin)}–{fmtMoney(t.sizeMax)}</span>
                      <span className="th-cell-date">traded {fmtDate(t.tradeDate)} · filed {fmtDate(t.filedDate)}</span>
                      {t.committeeNote && <span className="th-flag">⚑</span>}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="th-signal-note">No congressional filings on the tape for {s.ticker} in the loaded window.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <input
        className="th-search th-stock-search"
        placeholder="Search any stock — ticker, company, or sector…"
        value={stockQuery}
        onChange={(e) => setStockQuery(e.target.value)}
        aria-label="Search stocks"
      />

      {q && (
        <>
          <div className="th-section-h">Results · {results.length}</div>
          {results.map(row)}
          {results.length === 0 && (
            <div className="th-empty">No match for “{stockQuery}”. Try a ticker like NVDA or a sector like Defense.</div>
          )}
        </>
      )}

      <div className="th-section-h">Tracked · {trackedStocks.length}</div>
      {trackedStocks.map(row)}
      {trackedStocks.length === 0 && (
        <div className="th-empty">Nothing tracked yet. Search above and hit Track to build your list.</div>
      )}
    </>
  );
}

/* Signature element: the filing-lag bar. Position within the 45-day STOCK Act
   window. Fills paper-cream early, shifts amber past 30d, red past 45d. */
function LagBar({ lag }) {
  const pct = Math.min(100, (lag / 45) * 100);
  const tone = lag > 45 ? "#E25C5C" : lag > 30 ? "#D9A441" : "#EDE6D6";
  return (
    <span className="th-lagbar" aria-hidden="true">
      <span className="th-lagbar-fill" style={{ width: `${pct}%`, background: tone }} />
      <span className="th-lagbar-limit" />
    </span>
  );
}

function TradeDetail({ trade, member, excess }) {
  const [portfolio, setPortfolio] = useState(10000);
  const [pct, setPct] = useState(2);
  const mid = (trade.sizeMin + trade.sizeMax) / 2;
  return (
    <div className="th-detail">
      <div className="th-detail-grid">
        <div>
          <div className="th-detail-k">Trade date</div>
          <div className="th-detail-v">{fmtDate(trade.tradeDate)}</div>
        </div>
        <div>
          <div className="th-detail-k">Disclosed</div>
          <div className="th-detail-v">{fmtDate(trade.filedDate)} ({days(trade.tradeDate, trade.filedDate)}d lag)</div>
        </div>
        <div>
          <div className="th-detail-k">{trade.ticker} since trade</div>
          <div className={`th-detail-v ${trade.retSince >= 0 ? "pos" : "neg"}`}>
            {trade.retSince >= 0 ? "+" : ""}{trade.retSince}%
          </div>
        </div>
        <div>
          <div className="th-detail-k">SPY same period</div>
          <div className="th-detail-v">{trade.spySince >= 0 ? "+" : ""}{trade.spySince}%</div>
        </div>
        <div>
          <div className="th-detail-k">Excess return</div>
          <div className={`th-detail-v ${excess >= 0 ? "pos" : "neg"}`}>{excess >= 0 ? "+" : ""}{excess}%</div>
        </div>
        <div>
          <div className="th-detail-k">Est. size midpoint</div>
          <div className="th-detail-v">{fmtMoney(mid)}</div>
        </div>
      </div>
      {trade.committeeNote && <div className="th-detail-note">⚑ {trade.committeeNote}</div>}
      <div className="th-mirror">
        <span className="th-detail-k">Mirror calculator</span>
        <label>Portfolio $
          <input type="number" value={portfolio} min={0}
                 onChange={(e) => setPortfolio(+e.target.value || 0)} />
        </label>
        <label>Allocation %
          <input type="number" value={pct} min={0} max={100} step={0.5}
                 onChange={(e) => setPct(+e.target.value || 0)} />
        </label>
        <span className="th-mirror-out">= {fmtMoney(Math.round(portfolio * pct / 100))} position</span>
        <span className="th-mirror-warn">
          You'd be entering {days(trade.tradeDate, TODAY)} days after {member.name.split(" ").slice(-1)[0]} did.
        </span>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,650;1,9..144,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.thesis-root {
  --ink: #0E1320; --panel: #161D2E; --panel2: #1C2436; --line: #232C42;
  --text: #DCE2EE; --muted: #8B94A7; --paper: #EDE6D6;
  --buy: #3FB68B; --sell: #E25C5C; --amber: #D9A441;
  background: var(--ink); color: var(--text); min-height: 100vh;
  font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 14px;
}
.thesis-root * { box-sizing: border-box; }
.thesis-root button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
.thesis-root :focus-visible { outline: 2px solid var(--paper); outline-offset: 2px; }
.pos { color: var(--buy); } .neg { color: var(--sell); }

.th-header { display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 18px 24px 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.th-wordmark { display: flex; align-items: baseline; gap: 12px; }
.th-wordmark-plate { font-family: 'Fraunces', serif; font-style: italic; font-weight: 650;
  font-size: 26px; color: var(--ink); background: var(--paper); padding: 1px 12px 4px;
  border-radius: 3px; letter-spacing: -0.01em; }
.th-tagline { color: var(--muted); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
.th-header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.th-search { background: var(--panel); border: 1px solid var(--line); border-radius: 6px;
  color: var(--text); padding: 8px 12px; width: 240px; font: inherit; }
.th-search::placeholder { color: var(--muted); }
.th-fresh { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12px;
  font-family: 'IBM Plex Mono', monospace; }
.th-fresh-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--buy);
  box-shadow: 0 0 6px var(--buy); }

.th-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  border-bottom: 1px solid var(--line); }
.th-stat { padding: 14px 24px; border-right: 1px solid var(--line); }
.th-stat:last-child { border-right: none; }
.th-stat-v { font-family: 'Fraunces', serif; font-weight: 500; font-size: 24px; }
.th-stat-v small { font-size: 12px; color: var(--muted); font-family: 'IBM Plex Sans', sans-serif; }
.th-stat-l { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

.th-body { display: grid; grid-template-columns: 260px 1fr; min-height: 60vh; }
@media (max-width: 860px) { .th-body { grid-template-columns: 1fr; } }

.th-rail { border-right: 1px solid var(--line); padding: 16px; }
@media (max-width: 860px) { .th-rail { border-right: none; border-bottom: 1px solid var(--line); } }
.th-rail-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--muted); margin-bottom: 10px; }
.th-rail-card { display: flex; flex-direction: column; align-items: flex-start; width: 100%;
  text-align: left; background: var(--panel); border: 1px solid var(--line); border-radius: 8px;
  padding: 10px 12px; margin-bottom: 8px; gap: 2px; transition: border-color .15s; }
.th-rail-card:hover { border-color: var(--paper); }
.th-rail-name { font-weight: 600; }
.th-rail-meta { font-size: 12px; color: var(--muted); }
.th-rail-empty { color: var(--muted); font-size: 13px; line-height: 1.5; }
.th-cluster-alert { margin-top: 12px; background: var(--panel2); border-left: 3px solid var(--paper);
  border-radius: 0 6px 6px 0; padding: 10px 12px; font-size: 12.5px; line-height: 1.45; color: var(--text); }

.th-main { padding: 16px 24px 32px; min-width: 0; }
.th-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); margin-bottom: 14px; }
.th-tab { padding: 8px 14px 10px; color: var(--muted); font-weight: 500;
  border-bottom: 2px solid transparent; margin-bottom: -1px; }
.th-tab-active { color: var(--paper); border-bottom-color: var(--paper); }

.th-filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.th-seg { display: inline-flex; background: var(--panel); border: 1px solid var(--line);
  border-radius: 6px; overflow: hidden; }
.th-seg-btn { padding: 6px 12px; font-size: 12.5px; color: var(--muted); }
.th-seg-on { background: var(--panel2); color: var(--text); }
.th-check { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); cursor: pointer; }
.th-check input { accent-color: #EDE6D6; }

.th-legend { display: grid; grid-template-columns: 64px 1fr 150px 130px 70px; gap: 12px;
  padding: 0 12px 6px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.th-legend-lag { text-align: left; }
@media (max-width: 860px) { .th-legend { display: none; } }

.th-row-wrap { border: 1px solid var(--line); border-radius: 8px; margin-bottom: 6px;
  background: var(--panel); overflow: hidden; transition: border-color .15s; }
.th-row-wrap:hover, .th-row-open { border-color: #3A4663; }
.th-row { display: grid; grid-template-columns: 64px 1fr 150px 130px 70px; gap: 12px;
  align-items: center; width: 100%; padding: 11px 12px; text-align: left; }
@media (max-width: 860px) {
  .th-row { grid-template-columns: 1fr auto; grid-template-areas: "who ret" "lag size"; row-gap: 8px; }
  .th-cell-date { display: none; }
  .th-cell-who { grid-area: who; } .th-cell-ret { grid-area: ret; }
  .th-cell-lag { grid-area: lag; } .th-cell-size { grid-area: size; }
}
.th-cell-date { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); }
.th-cell-who { display: flex; align-items: center; gap: 10px; min-width: 0; }
.th-who-text { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.th-who-name { font-weight: 600; }
.th-party { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px;
  border-radius: 4px; font-size: 11px; font-weight: 600; flex: none; }
.th-party-D { background: #1E3A8A; color: #BFD3FF; }
.th-party-R { background: #7A1F2B; color: #FFC9C9; }
.th-side { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500;
  padding: 1px 6px; border-radius: 4px; }
.th-side-buy { color: var(--buy); border: 1px solid var(--buy); }
.th-side-sell { color: var(--sell); border: 1px solid var(--sell); }
.th-ticker { font-family: 'IBM Plex Mono', monospace; font-weight: 500; }
.th-ticker-lg { font-size: 18px; }
.th-flag { font-size: 11px; color: var(--amber); }
.th-cell-lag { display: flex; align-items: center; gap: 8px; }
.th-lagbar { position: relative; flex: 1; height: 6px; background: var(--panel2);
  border-radius: 3px; overflow: hidden; min-width: 60px; }
.th-lagbar-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; }
.th-lagbar-limit { position: absolute; right: 0; top: 0; bottom: 0; width: 2px; background: var(--sell); opacity: .55; }
.th-lag-num { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); width: 32px; text-align: right; }
.th-cell-size { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; color: var(--text); }
.th-cell-ret { font-family: 'IBM Plex Mono', monospace; font-size: 13px; text-align: right; }

.th-detail { border-top: 1px solid var(--line); padding: 14px; background: var(--panel2); }
.th-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
.th-detail-k { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.th-detail-v { font-family: 'IBM Plex Mono', monospace; font-size: 13.5px; margin-top: 2px; }
.th-detail-note { margin-top: 12px; color: var(--amber); font-size: 12.5px; }
.th-mirror { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 14px;
  padding-top: 12px; border-top: 1px dashed var(--line); }
.th-mirror label { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); }
.th-mirror input { width: 90px; background: var(--ink); border: 1px solid var(--line);
  border-radius: 5px; color: var(--text); padding: 5px 8px; font-family: 'IBM Plex Mono', monospace; }
.th-mirror-out { font-family: 'IBM Plex Mono', monospace; color: var(--paper); }
.th-mirror-warn { font-size: 12px; color: var(--muted); }

.th-member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.th-member-card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
.th-member-top { display: flex; align-items: center; gap: 10px; }
.th-member-name { font-weight: 600; }
.th-member-sub { font-size: 12px; color: var(--muted); }
.th-follow { margin-left: auto; border: 1px solid var(--line); border-radius: 6px;
  padding: 5px 12px; font-size: 12.5px; color: var(--muted); transition: all .15s; }
.th-follow:hover { border-color: var(--paper); color: var(--text); }
.th-follow-on { background: var(--paper); color: var(--ink); border-color: var(--paper); font-weight: 600; }
.th-member-stats { display: flex; gap: 18px; margin-top: 12px; }
.th-member-stats b { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 500; }
.th-member-stats i { font-style: normal; font-size: 10.5px; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.06em; }
.th-committees { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line);
  font-size: 12px; color: var(--muted); }

.th-signals .th-signal-h { font-family: 'Fraunces', serif; font-weight: 500; font-size: 18px; margin: 18px 0 10px; }
.th-signals .th-signal-h:first-child { margin-top: 4px; }
.th-signal-h span { font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; color: var(--muted); margin-left: 10px; }
.th-signal-card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
  padding: 14px; margin-bottom: 8px; }
.th-signal-top { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.th-signal-co { color: var(--muted); }
.th-signal-size { margin-left: auto; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; color: var(--paper); }
.th-signal-members { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.th-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--panel2);
  border-radius: 6px; padding: 4px 10px 4px 4px; font-size: 12.5px; }
.th-signal-thin { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.th-signal-note { color: var(--muted); font-size: 12.5px; }

.th-empty { color: var(--muted); padding: 24px 12px; }

.th-stock-search { width: 100%; margin-bottom: 4px; }
.th-section-h { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--muted); margin: 16px 0 8px; }
.th-stockrow { display: flex; align-items: center; gap: 10px; padding: 0 12px 0 0; }
.th-stockrow-main { display: grid; flex: 1; min-width: 0;
  grid-template-columns: 64px 1fr 80px 90px 64px 70px; gap: 12px; align-items: center;
  padding: 11px 0 11px 12px; text-align: left; }
@media (max-width: 860px) {
  .th-stockrow-main { grid-template-columns: 64px 1fr 70px; }
  .th-stockrow-main .th-spark, .th-stockrow-main .th-stock-flow, .th-stockrow-main .th-stock-px { display: none; }
}
.th-stock-ticker { font-size: 15px; }
.th-stock-co { display: flex; flex-direction: column; min-width: 0; }
.th-stock-co > span:first-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.th-stock-sector { font-size: 11px; color: var(--muted); }
.th-stock-px { font-family: 'IBM Plex Mono', monospace; font-size: 13px; text-align: right; }
.th-stock-flow { font-family: 'IBM Plex Mono', monospace; font-size: 12px; text-align: right; }
.th-stock-noflow { color: var(--muted); font-size: 11px; }
.th-spark { flex: none; }
.th-stock-trade { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 7px 0; border-bottom: 1px solid var(--line); }
.th-stock-trade:last-child { border-bottom: none; }

.th-rec-card { display: flex; gap: 14px; background: var(--panel); border: 1px solid var(--line);
  border-radius: 10px; padding: 14px; margin-bottom: 10px; }
.th-rec-rank { font-family: 'Fraunces', serif; font-style: italic; font-size: 22px;
  color: var(--paper); opacity: .85; flex: none; width: 34px; }
.th-rec-main { flex: 1; min-width: 0; }
.th-rec-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.th-rec-px { font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
.th-rec-px em { font-style: normal; font-size: 12px; }
.th-rec-top .th-follow { margin-left: auto; }
.th-rec-score { display: flex; align-items: center; gap: 10px; margin: 10px 0 8px; }
.th-rec-scorebar { flex: 1; max-width: 280px; height: 5px; background: var(--panel2);
  border-radius: 3px; overflow: hidden; }
.th-rec-scorebar span { display: block; height: 100%; background: var(--paper); border-radius: 3px; }
.th-rec-scorenum { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--paper); }
.th-rec-why { margin: 0; padding-left: 18px; color: var(--muted); font-size: 12.5px; line-height: 1.6; }
.th-foot { border-top: 1px solid var(--line); padding: 14px 24px; color: var(--muted);
  font-size: 12px; line-height: 1.5; }

@media (prefers-reduced-motion: reduce) {
  .thesis-root * { transition: none !important; }
}
`;
