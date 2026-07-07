/*
 * SplitFlap.jsx — vintage departure-board price display.
 * Zero dependencies beyond React. Each character sits in its own flap cell;
 * when the value changes, changed cells run a brief flip animation.
 *
 * THESIS usage:
 *   <SplitFlap value={price.toFixed(2)} prefix="$" />
 * Feed it the live price from /api/prices — cells only animate when their
 * character actually changes, so a 5-minute refresh cadence reads as a
 * board update, not constant noise.
 */
import { useEffect, useRef, useState } from "react";
import "./SplitFlap.css";

function FlapCell({ char }) {
  const [display, setDisplay] = useState(char);
  const [flipping, setFlipping] = useState(false);
  const prev = useRef(char);

  useEffect(() => {
    if (char === prev.current) return;
    prev.current = char;
    setFlipping(true);
    const t = setTimeout(() => {
      setDisplay(char);
      setFlipping(false);
    }, 180); // swap the character mid-flip
    return () => clearTimeout(t);
  }, [char]);

  return (
    <span className={`sf-cell${flipping ? " sf-flip" : ""}`}>
      <span className="sf-char">{display}</span>
      <span className="sf-hinge" />
    </span>
  );
}

export default function SplitFlap({ value, prefix = "", className = "" }) {
  const text = `${prefix}${value}`;
  return (
    <span className={`sf-board ${className}`} aria-label={text} role="text">
      {text.split("").map((c, i) => (
        <FlapCell key={i} char={c} />
      ))}
    </span>
  );
}
