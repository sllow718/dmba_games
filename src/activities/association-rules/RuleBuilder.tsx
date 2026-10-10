import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Transaction } from "../../core/types";
import { ItemKey, Owner, Slips, Token, pct } from "../../components/ui";
import { ruleStats } from "./engine";
import type { RuleStats } from "./engine";

export interface Thresholds { minSupport: number; minConfidence: number; minLift: number }

interface Props {
  data: readonly Transaction[];
  items: readonly string[];
  initial?: { if: string[]; then: string[] };
  compact?: boolean;
  dataLabel: string;
  thresholds?: Thresholds;
  /** Show confidence against the baseline rate of the "then" side (lift lesson). */
  compare?: boolean;
  onRule?: (r: { if: string[]; then: string[] }, s: RuleStats) => void;
  side?: ReactNode;
}

export const ruleName = (a: readonly string[], b: readonly string[]) => `${a.join(" + ")} → ${b.join(" + ")}`;
const lower = (xs: readonly string[]) => xs.join(" and ").toLowerCase();

export function verdict(a: readonly string[], b: readonly string[], s: RuleStats): string {
  if (s.count === 0) return `Nobody bought ${lower(a)} and ${lower(b)} together. Zero support, so forget it.`;
  const base = s.countThen / s.n;
  if (s.lift > 1.05) return `That's a real pattern. Customers who buy ${lower(a)} are ${s.lift.toFixed(1)}× as likely as usual to buy ${lower(b)}.`;
  if (s.lift >= 0.95) return `No effect. People buy ${lower(b)} just as often whether or not they buy ${lower(a)}.`;
  return `Don't be fooled. ${pct(s.confidence)} sounds good, but ${pct(base)} of all my customers buy ${lower(b)} anyway. ${lower(a).replace(/^./, (c) => c.toUpperCase())} doesn't help sell it.`;
}

function Pass({ ok }: { ok: boolean }) {
  return <span className={"pass " + (ok ? "y" : "n")}>{ok ? "✓ passes" : "✕ too low"}</span>;
}

export function RuleBuilder({ data, items, initial, compact, dataLabel, thresholds, compare, onRule, side }: Props) {
  const [A, setA] = useState<string[]>(initial?.if ?? []);
  const [B, setB] = useState<string[]>(initial?.then ?? []);
  const ready = A.length > 0 && B.length > 0;
  const s = useMemo(() => (ready ? ruleStats(data, { if: A, then: B }) : null), [data, A, B, ready]);

  useEffect(() => {
    if (s && onRule) onRule({ if: A, then: B }, s);
    // onRule is a fresh closure each render; only a change of rule should fire it.
  }, [s]);

  const toggle = (side: "A" | "B", it: string) => {
    const [cur, set] = side === "A" ? [A, setA] : [B, setB];
    set(cur.includes(it) ? cur.filter((x) => x !== it) : items.filter((x) => x === it || cur.includes(x)));
  };

  const highlight = A.length ? { lit: A, both: B.length ? B : undefined } : null;
  const base = s ? s.countThen / s.n : 0;
  const t = thresholds;

  return (
    <>
      {side && <div style={{ marginBottom: 16 }}>{side}</div>}
      <div className="split">
        <div className="stack">
          <p className="data-label">{dataLabel}</p>
          <Slips data={data} highlight={highlight} compact={compact} />
          <div className="key">
            <span><i className="sw" style={{ outline: "3px solid var(--lit)", outlineOffset: -3 }} />has the "if" items</span>
            <span><i className="sw" style={{ background: "var(--ok-bg)", outline: "3px solid var(--ok)", outlineOffset: -3 }} />has the "if" and "then" items</span>
          </div>
          <ItemKey items={items} />
        </div>
        <div className="stack">
          <div role="group" aria-label="If a customer buys">
            <span className="lbl">If a customer buys…</span>
            <div className="picks">
              {items.map((it) => (
                <button key={it} type="button" className="pick" aria-pressed={A.includes(it)} disabled={B.includes(it)} onClick={() => toggle("A", it)}>
                  <Token item={it} />{it}
                </button>
              ))}
            </div>
          </div>
          <div role="group" aria-label="Then they also buy">
            <span className="lbl">…then they also buy</span>
            <div className="picks">
              {items.map((it) => (
                <button key={it} type="button" className="pick" aria-pressed={B.includes(it)} disabled={A.includes(it)} onClick={() => toggle("B", it)}>
                  <Token item={it} />{it}
                </button>
              ))}
            </div>
          </div>
          <div className="ruleline" aria-live="polite">
            {ready && (
              <>
                {A.map((i) => <Token key={i} item={i} />)} {A.join(" + ")} <span className="arrow" aria-label="then">→</span> {B.map((i) => <Token key={i} item={i} />)} {B.join(" + ")}
              </>
            )}
          </div>
          <div className="meters">
            <div className="meter">
              <div className="m">Support {s && t && <Pass ok={s.support >= t.minSupport - 1e-9} />}</div>
              <div className="v">{s ? pct(s.support) : "–"}</div>
              <div className="w">{s ? `${s.count} of ${s.n} receipts` : " "}</div>
              <div className="bar"><i style={{ width: s ? `${s.support * 100}%` : 0 }} /></div>
            </div>
            <div className="meter">
              <div className="m">Confidence {s && t && <Pass ok={s.confidence >= t.minConfidence - 1e-9} />}</div>
              <div className="v">{s && s.countIf ? pct(s.confidence) : "–"}</div>
              <div className="w">{s ? `${s.count} of ${s.countIf} "if" receipts` : " "}</div>
              <div className="bar"><i style={{ width: s ? `${s.confidence * 100}%` : 0 }} /></div>
            </div>
            <div className="meter">
              <div className="m">Lift {s && t && <Pass ok={s.lift > t.minLift} />}</div>
              <div className="v">{s && s.countIf && s.countThen ? s.lift.toFixed(2) : "–"}</div>
              <div className="w">{s ? `${pct(s.confidence)} vs ${pct(base)} usual` : " "}</div>
              <div className="bar"><i style={{ width: s ? `${Math.min(s.lift / 3, 1) * 100}%` : 0 }} /></div>
            </div>
          </div>
          {compare && s && (
            <div className="card compare" aria-label="Confidence compared with the usual rate">
              <div className="line"><span>{A.join(" + ")} buyers who buy {B.join(" + ")}</span><span className="track"><i style={{ width: `${s.confidence * 100}%`, background: "var(--brand)" }} /></span><b>{pct(s.confidence)}</b></div>
              <div className="line"><span>All customers who buy {B.join(" + ")}</span><span className="track"><i style={{ width: `${base * 100}%`, background: "var(--sub)" }} /></span><b>{pct(base)}</b></div>
              <div className="w" style={{ fontSize: ".85rem" }}>Lift = {pct(s.confidence)} ÷ {pct(base)} = <b>{s.lift.toFixed(2)}</b></div>
            </div>
          )}
          <Owner>{s ? verdict(A, B, s) : "Pick at least one item on each side and I'll tell you if it's worth anything."}</Owner>
        </div>
      </div>
    </>
  );
}
