import { useState } from "react";

export const depthC = {
  bg: "#050505",
  surface: "#0f0f0f",
  surfaceHi: "#161616",
  border: "#222",
  border2: "#2e2e2e",
  borderHi: "#444",
  text: "#f0f0f0",
  muted: "#888",
  dim: "#555",
  accent: "#f0b429",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f0b429",
  ai: "#60a5fa",
  defense: "#f97316",
  energy: "#4ade80",
  bio: "#c084fc",
  health: "#f472b6",
};

export const DEPTH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:8px}
  ::-webkit-scrollbar-track{background:${depthC.bg}}
  ::-webkit-scrollbar-thumb{background:${depthC.borderHi};border-radius:4px}
  button{font-family:inherit}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
  @keyframes glow{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 20px ${depthC.accent}33}}
  .thesis-scene{perspective:1600px;perspective-origin:50% -10%}
  .thesis-main{transform-style:preserve-3d}
`;

const SHADOW_REST = `0 6px 0 #020202, 0 14px 40px rgba(0,0,0,0.7), 0 2px 0 #333 inset, inset 0 1px 0 rgba(255,255,255,0.08)`;
const SHADOW_HOVER = `0 10px 0 #020202, 0 28px 50px rgba(0,0,0,0.85), 0 2px 0 #444 inset, inset 0 1px 0 rgba(255,255,255,0.12)`;

export function panelBase(extra = {}) {
  return {
    background: depthC.surface,
    border: `1px solid ${depthC.border}`,
    borderTop: `1px solid ${depthC.borderHi}`,
    borderLeft: `1px solid #3a3a3a`,
    borderRadius: 10,
    boxShadow: SHADOW_REST,
    transform: "translateZ(0)",
    ...extra,
  };
}

export function Panel({ children, onClick, style = {}, lift = true, accent, tilt = false }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => lift && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...panelBase(),
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s cubic-bezier(.2,.8,.2,1), box-shadow 0.2s ease",
        transform: hov
          ? `translateY(-6px) translateZ(12px)${tilt ? " rotateX(2deg)" : ""}`
          : `translateZ(0)${tilt ? " rotateX(1deg)" : ""}`,
        boxShadow: hov ? SHADOW_HOVER : SHADOW_REST,
        ...(accent ? { borderTop: `3px solid ${accent}`, outline: `1px solid ${accent}33` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Btn({ children, onClick, disabled, accent, small }) {
  const [hov, setHov] = useState(false);
  const [press, setPress] = useState(false);
  const col = accent || depthC.accent;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        padding: small ? "5px 14px" : "9px 22px",
        borderRadius: 8,
        border: `1px solid ${col}`,
        borderTop: `2px solid ${col}dd`,
        background: disabled ? depthC.border : press ? `${col}40` : hov ? `${col}30` : `${col}18`,
        color: col,
        fontSize: small ? 10 : 11,
        fontFamily: "'IBM Plex Mono',monospace",
        fontWeight: 700,
        letterSpacing: "0.08em",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: press
          ? "inset 0 4px 8px rgba(0,0,0,0.6)"
          : hov
            ? `0 6px 0 #020202, 0 12px 24px ${col}44`
            : `0 4px 0 #020202, 0 8px 16px rgba(0,0,0,0.5)`,
        transform: press ? "translateY(3px) scale(0.98)" : hov ? "translateY(-2px)" : "none",
        transition: "all 0.12s ease",
      }}
    >
      {children}
    </button>
  );
}

export function Input3D({ value, onChange, onKeyDown, placeholder, style = {} }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        flex: 1,
        padding: "10px 14px",
        background: "#080808",
        border: `1px solid ${focus ? depthC.accent : depthC.borderHi}`,
        borderTop: focus ? `2px solid ${depthC.accent}` : `1px solid #3a3a3a`,
        borderRadius: 8,
        color: depthC.text,
        fontSize: 13,
        fontFamily: "'IBM Plex Mono',monospace",
        outline: "none",
        boxShadow: focus
          ? `inset 0 3px 8px rgba(0,0,0,0.6), 0 4px 0 #020202, 0 0 16px ${depthC.accent}33`
          : `inset 0 3px 8px rgba(0,0,0,0.55), 0 3px 0 #020202`,
        transform: focus ? "translateY(-1px)" : "none",
        transition: "all 0.15s ease",
        ...style,
      }}
    />
  );
}

export function StatTile({ label, value, sub, accent, loading }) {
  return (
    <Panel lift tilt style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: depthC.muted, marginBottom: 6 }}>
        {label}
      </div>
      {loading || value == null ? (
        <div style={{ height: 26, width: "65%", background: depthC.borderHi, borderRadius: 4, animation: "pulse 1.4s ease infinite" }} />
      ) : (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 700, color: accent || depthC.text, display: "block", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          {value}
        </span>
      )}
      {sub && <div style={{ fontSize: 10, color: depthC.dim, marginTop: 6 }}>{sub}</div>}
    </Panel>
  );
}

export function MetricChip({ label, value, color }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: hov ? depthC.surfaceHi : "#0a0a0a",
        border: `1px solid ${hov ? depthC.borderHi : depthC.border}`,
        boxShadow: hov ? "0 4px 0 #020202, inset 0 1px 0 rgba(255,255,255,0.06)" : "inset 0 2px 6px rgba(0,0,0,0.4)",
        transform: hov ? "translateY(-2px) scale(1.02)" : "none",
        transition: "all 0.15s ease",
      }}
    >
      <Mono style={{ fontSize: 9, color: depthC.muted, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
        {label}
      </Mono>
      <Mono style={{ fontSize: 15, fontWeight: 700, color: color || depthC.text }}>{value}</Mono>
    </div>
  );
}

const Mono = ({ children, style = {} }) => (
  <span style={{ fontFamily: "'IBM Plex Mono',monospace", ...style }}>{children}</span>
);
