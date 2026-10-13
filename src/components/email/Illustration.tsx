import type { ReactNode } from "react";

/* Simple illustration set. Colours come from CSS: .b = brand colour, .y = yellow, .s = soft shadow. */
const SHAPES: Record<string, ReactNode> = {
  receipts: (
    <>
      <rect className="y" x="30" y="16" width="36" height="52" rx="5" transform="rotate(-9 48 42)" />
      <rect className="b" x="54" y="20" width="34" height="52" rx="5" transform="rotate(8 71 46)" />
      <rect className="w" x="61" y="34" width="20" height="3.5" rx="1.75" transform="rotate(8 71 46)" />
      <rect className="w" x="60" y="43" width="16" height="3.5" rx="1.75" transform="rotate(8 71 46)" />
      <rect className="w" x="59" y="52" width="12" height="3.5" rx="1.75" transform="rotate(8 71 46)" />
    </>
  ),
  approval: (
    <>
      <circle className="y" cx="54" cy="38" r="13" />
      <path className="y" d="M30 78c0-14 11-23 24-23s24 9 24 23z" />
      <circle className="b" cx="80" cy="30" r="12" />
      <path className="ws" d="M74.5 30l4 4 7-7.5" />
    </>
  ),
  clock: (
    <>
      <circle className="y" cx="60" cy="44" r="30" />
      <circle className="w" cx="60" cy="44" r="22" />
      <path className="bs" d="M60 30v14l9 6" />
      <rect className="y" x="34" y="10" width="14" height="8" rx="4" transform="rotate(-30 41 14)" />
      <rect className="y" x="72" y="10" width="14" height="8" rx="4" transform="rotate(30 79 14)" />
    </>
  ),
  wallet: (
    <>
      <rect className="b" x="26" y="26" width="64" height="46" rx="9" />
      <rect className="y" x="62" y="40" width="32" height="18" rx="6" />
      <circle className="w" cx="73" cy="49" r="3.5" />
      <rect className="y" x="34" y="18" width="40" height="12" rx="4" opacity=".9" />
    </>
  ),
  alert: (
    <>
      <path className="y" d="M60 14 94 72H26z" stroke="var(--ill-y)" strokeWidth={8} strokeLinejoin="round" />
      <rect className="d" x="56.5" y="34" width="7" height="20" rx="3.5" />
      <circle className="d" cx="60" cy="63" r="4" />
    </>
  ),
  check: (
    <>
      <circle className="b" cx="60" cy="44" r="28" />
      <path className="ws" d="M47 44l9 9 17-18" />
      <circle className="y" cx="88" cy="22" r="6" />
      <circle className="y" cx="30" cy="66" r="4" />
    </>
  ),
  plane: (
    <>
      <path className="b" d="M24 46 96 20 72 76 58 56z" />
      <path className="y" d="M58 56 96 20 48 50z" />
      <ellipse className="y" cx="34" cy="70" rx="12" ry="5" opacity=".7" />
    </>
  ),
  hotel: (
    <>
      <rect className="y" x="36" y="18" width="48" height="58" rx="5" />
      <g className="b">
        <rect x="44" y="28" width="9" height="9" rx="2" />
        <rect x="58" y="28" width="9" height="9" rx="2" />
        <rect x="72" y="28" width="5" height="9" rx="2" />
        <rect x="44" y="44" width="9" height="9" rx="2" />
        <rect x="58" y="44" width="9" height="9" rx="2" />
        <rect x="54" y="60" width="12" height="16" rx="2" />
      </g>
    </>
  ),
  card: (
    <>
      <rect className="b" x="22" y="24" width="76" height="50" rx="9" />
      <rect className="y" x="32" y="38" width="16" height="12" rx="3" />
      <rect className="w" x="32" y="60" width="40" height="4" rx="2" opacity=".75" />
    </>
  ),
  cart: (
    <>
      <rect className="y" x="48" y="20" width="26" height="22" rx="4" />
      <path className="bs" d="M26 26h10l8 32h36l6-22H40" />
      <circle className="b" cx="50" cy="70" r="5.5" />
      <circle className="b" cx="76" cy="70" r="5.5" />
    </>
  ),
  coins: (
    <>
      <circle className="y" cx="48" cy="48" r="20" />
      <circle className="b" cx="74" cy="40" r="17" />
      <circle className="w" cx="74" cy="40" r="9" opacity=".35" />
      <circle className="w" cx="48" cy="48" r="11" opacity=".45" />
    </>
  ),
};

export function Illustration({ k }: { k: string }) {
  return (
    <svg className="ill" viewBox="0 0 120 96" aria-hidden="true">
      <ellipse className="s" cx="60" cy="86" rx="46" ry="8" />
      {SHAPES[k] || SHAPES.receipts}
    </svg>
  );
}
