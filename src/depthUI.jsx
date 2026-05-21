import { useState } from "react";

export const depthC = {
  bg: "#070707",
  surface: "#111111",
  surfaceHi: "#181818",
  border: "#1c1c1c",
  border2: "#2a2a2a",
  borderHi: "#333333",
  text: "#ececec",
  muted: "#7a7a7a",
  dim: "#404040",
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
  ::-webkit-scrollbar{width:6px;height:6px}
  ::-webkit-scrollbar-track{background:${depthC.bg}}
  ::-webkit-scrollbar-thumb{background:${depthC.borderHi};border-radius:3px}
  button{font-family:inherit}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  .thesis-scene{perspective:1400px;perspective-origin:50% 0%}
  .thesis-main{transform-style:preserve-3d}
`;

export function panelBase(extra = {}) {
  return {
    background: depthC.surface,
    border: `1px solid ${depthC.border}`,
    borderTop: `1px solid ${depthC.borderHi}`,
    borderLeft: `1px solid #2e2e2e`,
    borderRadius: 8,
    boxShadow: `0 4px 0 #030303, 0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)`,
    ...extra,
  };
}

export function panelHover() {
  return {
    transform: "translateY(-4px) translateZ(8px)",
    boxShadow: `0 8px 0 #030303, 0 20px 40px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)`,
  };
}

export function Panel({ children, onClick, style = {}, lift = true, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => lift && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...panelBase(),
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        ...(hov ? panelHover() : {}),
        ...(accent ? { borderTop: `2px solid ${accent}`, boxShadow: `0 4px 0 #030303, 0 12px 28px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.06)` } : {}),
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
        padding: small ? "4px 12px" : "7px 20px",
        borderRadius: 6,
        border: `1px solid ${col}`,
        borderTop: `1px solid ${col}cc`,
        background: disabled ? depthC.border : press ? `${col}30` : hov ? `${col}28` : `${col}14`,
        color: col,
        fontSize: small ? 10 : 11,
        fontFamily: "'IBM Plex Mono',monospace",
        fontWeight: 700,
        letterSpacing: "0.06em",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: press
          ? `inset 0 3px 6px rgba(0,0,0,0.5)`
          : hov
            ? `0 4px 0 #030303, 0 8px 16px ${col}33`
            : `0 3px 0 #030303, 0 6px 12px rgba(0,0,0,0.4)`,
        transform: press ? "translateY(2px)" : hov ? "translateY(-1px)" : "none",
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
        padding: "8px 12px",
        background: depthC.bg,
        border: `1px solid ${focus ? depthC.accent : depthC.borderHi}`,
        borderRadius: 6,
        color: depthC.text,
        fontSize: 13,
        fontFamily: "'IBM Plex Mono',monospace",
        outline: "none",
        boxShadow: focus
          ? `inset 0 2px 6px rgba(0,0,0,0.5), 0 0 0 1px ${depthC.accent}44`
          : `inset 0 2px 5px rgba(0,0,0,0.45)`,
        transition: "border-color 0.15s, box-shadow 0.15s",
        ...style,
      }}
    />
  );
}

export function StatTile({ label, value, sub, accent, loading }) {
  return (
    <Panel lift style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: depthC.muted, marginBottom: 4 }}>
        {label}
      </div>
      {loading || value == null ? (
        <div style={{ height: 22, width: "60%", background: depthC.borderHi, borderRadius: 3, animation: "pulse 1.4s ease infinite" }} />
      ) : (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 700, color: accent || depthC.text, display: "block" }}>
          {value}
        </span>
      )}
      {sub && <div style={{ fontSize: 10, color: depthC.dim, marginTop: 4 }}>{sub}</div>}
    </Panel>
  );
}
