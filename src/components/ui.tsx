import type { ReactNode } from "react";
import type { Highlight, Transaction } from "../core/types";
import { itemInfo } from "../activities/association-rules/data";

const hasAll = (t: Transaction, items: readonly string[]) => items.every((i) => t.includes(i));

export function Token({ item, ring }: { item: string; ring?: boolean }) {
  const info = itemInfo(item);
  return (
    <span className={"tok" + (ring ? " ring" : "")} style={{ background: info.color, color: info.ink ?? "#fff" }} title={item} aria-label={item} role="img">
      {info.tag}
    </span>
  );
}

export function slipState(t: Transaction, h?: Highlight | null): "" | "lit" | "both" | "dim" {
  if (!h || !h.lit.length) return "";
  if (!hasAll(t, h.lit)) return "dim";
  if (h.both?.length) {
    if (hasAll(t, h.both)) return "both";
    return h.only ? "dim" : "lit";
  }
  return "lit";
}

interface SlipsProps {
  data: readonly Transaction[];
  highlight?: Highlight | null;
  compact?: boolean;
  /** Tap mode: receipts become toggle buttons. */
  selected?: Set<number>;
  onToggle?: (i: number) => void;
  marks?: Map<number, "miss" | "extra">;
  label?: string;
}

export function Slips({ data, highlight, compact, selected, onToggle, marks, label }: SlipsProps) {
  const ringed = new Set([...(highlight?.lit ?? []), ...(highlight?.both ?? [])]);
  return (
    <div className={"slips" + (compact ? " compact" : "")} role={onToggle ? "group" : "list"} aria-label={label ?? "Receipts"}>
      {data.map((t, i) => {
        const st = slipState(t, highlight);
        const content = (
          <>
            <span className="no">#{i + 1}</span>
            <span className="toks">
              {t.map((it) => <Token key={it} item={it} ring={ringed.has(it)} />)}
            </span>
          </>
        );
        const summary = `Receipt ${i + 1}: ${t.join(", ")}`;
        if (onToggle) {
          return (
            <button key={i} type="button" className={`slip ${st} ${marks?.get(i) ?? ""}`} aria-pressed={selected?.has(i) ?? false} aria-label={summary} onClick={() => onToggle(i)}>
              {content}
            </button>
          );
        }
        return (
          <div key={i} role="listitem" className={`slip ${st}`} aria-label={summary + (st === "both" ? " (matches both sides)" : st === "lit" ? " (highlighted)" : "")}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function ItemKey({ items }: { items: readonly string[] }) {
  return (
    <div className="key" aria-label="Item key">
      {items.map((it) => (
        <span key={it}><Token item={it} />{it}</span>
      ))}
    </div>
  );
}

export function Owner({ children, tone, level }: { children: ReactNode; tone?: "ok"; level?: string }) {
  return (
    <div className="owner">
      <span className="av" aria-hidden="true">MT</span>
      <div className={"bubble" + (tone ? " " + tone : "")}>
        <span className="who">Mrs Tan:</span>
        {children}
        {level && <span className="lvl">{level}</span>}
      </div>
    </div>
  );
}

export function Stars({ n, size }: { n: number; size?: string }) {
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined} role="img" aria-label={`${n} of 3 stars`}>
      {"★".repeat(n)}
      <span className="e">{"★".repeat(3 - n)}</span>
    </span>
  );
}

export function LockIcon() {
  return (
    <svg className="lock-ic" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function TopBar({ title, sub, home, children }: { title: ReactNode; sub?: ReactNode; home?: string; children?: ReactNode }) {
  return (
    <header className="top">
      <div className="top-in">
        <a className="logo" href={"#" + (home ?? "/")}>
          {title}
          {sub && <small>{sub}</small>}
        </a>
        <div className="top-right">{children}</div>
      </div>
    </header>
  );
}

export function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="frac">
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

export const pct = (x: number, digits = 0) => (x * 100).toFixed(digits).replace(/\.0+$/, "") + "%";
