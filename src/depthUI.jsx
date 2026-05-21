import { useState } from "react";

/** Thesis design system — editorial slate (distinct from gold/black terminal clones) */
export const depthC = {
  bg: "#0a0e14",
  surface: "#121820",
  surfaceHi: "#1a2330",
  border: "#2a3544",
  border2: "#354052",
  borderHi: "#4a5d73",
  text: "#e8ecf1",
  muted: "#8b9cb3",
  dim: "#5c6d82",
  accent: "#4f8cff",
  accentSoft: "#4f8cff22",
  green: "#34d399",
  red: "#f87171",
  yellow: "#fbbf24",
  ai: "#7dd3fc",
  defense: "#fb923c",
  energy: "#6ee7b7",
  bio: "#d8b4fe",
  health: "#f9a8d4",
};

export const DEPTH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:6px}
  ::-webkit-scrollbar-track{background:${depthC.bg}}
  ::-webkit-scrollbar-thumb{background:${depthC.borderHi};border-radius:3px}
  button{font-family:inherit;cursor:pointer}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`;

export function panelBase(extra = {}) {
  return {
    background: depthC.surface,
    border: `1px solid ${depthC.border}`,
    borderRadius: 8,
    ...extra,
  };
}

export function Panel({ children, onClick, style = {}, lift = false, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => lift && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...panelBase(),
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s ease, background 0.15s ease",
        background: hov ? depthC.surfaceHi : depthC.surface,
        borderColor: hov ? depthC.borderHi : depthC.border,
        ...(accent ? { borderLeft: `3px solid ${accent}` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Btn({ children, onClick, disabled, accent, small, ghost }) {
  const col = accent || depthC.accent;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "6px 12px" : "8px 16px",
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        fontFamily: "'JetBrains Mono', monospace",
        color: ghost ? col : depthC.bg,
        background: ghost ? "transparent" : col,
        border: ghost ? `1px solid ${depthC.borderHi}` : "none",
        borderRadius: 6,
        opacity: disabled ? 0.45 : 1,
        transition: "opacity 0.15s, filter 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export function Input3D({ value, onChange, placeholder, onKeyDown }) {
  return (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={{
        flex: 1,
        padding: "10px 12px",
        background: depthC.bg,
        border: `1px solid ${depthC.border}`,
        borderRadius: 6,
        color: depthC.text,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        outline: "none",
      }}
    />
  );
}

export function StatTile({ label, value, sub, accent, loading }) {
  return (
    <Panel style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: depthC.muted, marginBottom: 6 }}>
        {label}
      </div>
      {loading ? (
        <div style={{ height: 28, background: depthC.border2, borderRadius: 4, animation: "pulse 1.4s ease infinite" }} />
      ) : (
        <div style={{ fontSize: 22, fontWeight: 700, color: accent || depthC.text, fontFamily: "'JetBrains Mono', monospace" }}>
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
        borderRadius: 4,
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        background: depthC.surfaceHi,
        border: `1px solid ${depthC.border}`,
        color: color || depthC.muted,
      }}
    >
      <span style={{ color: depthC.dim }}>{label}</span>
      {value}
    </span>
  );
}

export function SideNavItem({ active, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 14px",
        border: "none",
        borderRadius: 6,
        marginBottom: 2,
        background: active ? depthC.accentSoft : "transparent",
        borderLeft: active ? `3px solid ${depthC.accent}` : "3px solid transparent",
        color: active ? depthC.text : depthC.muted,
        transition: "background 0.12s ease",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: active ? 600 : 500, letterSpacing: "0.02em" }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: depthC.dim, marginTop: 2 }}>{sub}</div>}
    </button>
  );
}
