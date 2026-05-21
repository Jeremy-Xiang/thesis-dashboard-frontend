import { useState } from "react";

/** Institutional palette — warm neutrals + brass accent (no neon blue/purple) */
export const depthC = {
  bg: "#0c0c0c",
  surface: "#161616",
  surfaceHi: "#1f1f1f",
  border: "#2a2a2a",
  border2: "#353535",
  borderHi: "#454545",
  text: "#f0eeea",
  muted: "#a8a6a0",
  dim: "#6e6e6a",
  accent: "#b8954f",
  accentSoft: "rgba(184, 149, 79, 0.14)",
  link: "#e8e4dc",
  green: "#5c9a72",
  red: "#c07070",
  yellow: "#c9a227",
  ai: "#7a8f9e",
  defense: "#a67c52",
  energy: "#6d8f7a",
  bio: "#8a8494",
  health: "#a67d85",
};

const SHADOW_REST =
  "0 5px 0 #000, 0 12px 28px rgba(0,0,0,0.5), 0 1px 0 #3a3a3a inset, inset 0 1px 0 rgba(255,255,255,0.06)";
const SHADOW_HOVER =
  "0 9px 0 #000, 0 20px 40px rgba(0,0,0,0.55), 0 1px 0 #4a4a4a inset, inset 0 1px 0 rgba(255,255,255,0.08)";
const SHADOW_PRESS =
  "0 2px 0 #000, 0 5px 14px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.35)";

export const DEPTH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:6px}
  ::-webkit-scrollbar-track{background:${depthC.bg}}
  ::-webkit-scrollbar-thumb{background:${depthC.borderHi};border-radius:3px}
  button{font-family:inherit;cursor:pointer}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px) translateZ(0)}to{opacity:1;transform:translateY(0) translateZ(0)}}
  .thesis-scene{perspective:1400px;perspective-origin:50% 0%}
  .thesis-main{transform-style:preserve-3d}
`;

export function panelBase(extra = {}) {
  return {
    background: depthC.surface,
    border: `1px solid ${depthC.border}`,
    borderTop: `1px solid ${depthC.borderHi}`,
    borderLeft: `1px solid ${depthC.borderHi}`,
    borderRadius: 8,
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
        transition: "transform 0.2s cubic-bezier(.2,.8,.2,1), box-shadow 0.2s ease, border-color 0.15s",
        transform: hov
          ? `translateY(-5px) translateZ(14px)${tilt ? " rotateX(2deg)" : ""}`
          : `translateZ(0)${tilt ? " rotateX(0.5deg)" : ""}`,
        boxShadow: hov ? SHADOW_HOVER : SHADOW_REST,
        ...(accent ? { borderTop: `3px solid ${accent}`, outline: `1px solid ${accent}33` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Btn({ children, onClick, disabled, accent, small, ghost }) {
  const [hov, setHov] = useState(false);
  const [press, setPress] = useState(false);
  const col = accent || depthC.accent;
  if (ghost) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setPress(false); }}
        onMouseDown={() => setPress(true)}
        onMouseUp={() => setPress(false)}
        style={{
          padding: small ? "6px 12px" : "8px 16px",
          fontSize: small ? 10 : 11,
          fontWeight: 600,
          fontFamily: "'IBM Plex Mono', monospace",
          color: hov ? depthC.text : depthC.muted,
          background: hov ? depthC.surfaceHi : "transparent",
          border: `1px solid ${depthC.borderHi}`,
          borderRadius: 4,
          boxShadow: press ? SHADOW_PRESS : hov ? `0 3px 0 #000` : "none",
          transform: press ? "translateY(2px)" : hov ? "translateY(-1px)" : "none",
          opacity: disabled ? 0.45 : 1,
          transition: "transform 0.12s, box-shadow 0.12s, color 0.12s",
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        padding: small ? "6px 12px" : "8px 16px",
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        fontFamily: "'IBM Plex Mono', monospace",
        color: "#1a1a1a",
        background: hov ? "#c9a55c" : col,
        border: `1px solid ${depthC.borderHi}`,
        borderRadius: 4,
        boxShadow: press
          ? `0 2px 0 #000, inset 0 2px 4px rgba(0,0,0,0.2)`
          : hov
            ? `0 5px 0 #000, 0 8px 16px rgba(0,0,0,0.35)`
            : `0 4px 0 #000`,
        transform: press ? "translateY(3px)" : hov ? "translateY(-2px)" : "translateY(0)",
        opacity: disabled ? 0.45 : 1,
        transition: "transform 0.12s, box-shadow 0.12s, background 0.12s",
      }}
    >
      {children}
    </button>
  );
}

export function Input3D({ value, onChange, placeholder, onKeyDown }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      placeholder={placeholder}
      style={{
        flex: 1,
        padding: "10px 12px",
        background: depthC.bg,
        border: `1px solid ${focus ? depthC.accent : depthC.border}`,
        borderRadius: 4,
        color: depthC.text,
        fontSize: 13,
        fontFamily: "'IBM Plex Mono', monospace",
        outline: "none",
        boxShadow: focus
          ? `inset 0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px ${depthC.accentSoft}`
          : "inset 0 2px 5px rgba(0,0,0,0.3)",
        transform: focus ? "translateY(-1px)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
      }}
    />
  );
}

export function StatTile({ label, value, sub, accent, loading }) {
  return (
    <Panel lift tilt style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: depthC.muted, marginBottom: 6 }}>
        {label}
      </div>
      {loading ? (
        <div style={{ height: 28, background: depthC.border2, borderRadius: 4, animation: "pulse 1.4s ease infinite" }} />
      ) : (
        <div style={{ fontSize: 22, fontWeight: 700, color: accent || depthC.text, fontFamily: "'IBM Plex Mono', monospace" }}>
          {value}
        </div>
      )}
      {sub && <div style={{ fontSize: 10, color: depthC.dim, marginTop: 4 }}>{sub}</div>}
    </Panel>
  );
}

export function MetricChip({ label, value, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 3,
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        background: depthC.surfaceHi,
        border: `1px solid ${depthC.border}`,
        boxShadow: "0 2px 0 #000",
        color: color || depthC.muted,
      }}
    >
      <span style={{ color: depthC.dim }}>{label}</span>
      {value}
    </span>
  );
}

export function SideNavItem({ active, label, sub, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 14px",
        border: "none",
        borderRadius: 4,
        marginBottom: 2,
        background: active ? depthC.accentSoft : hov ? depthC.surfaceHi : "transparent",
        borderLeft: active ? `3px solid ${depthC.accent}` : "3px solid transparent",
        color: active ? depthC.text : depthC.muted,
        boxShadow: active ? "0 2px 0 #000" : "none",
        transform: hov && !active ? "translateX(2px)" : "none",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: active ? 600 : 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: depthC.dim, marginTop: 2 }}>{sub}</div>}
    </button>
  );
}
