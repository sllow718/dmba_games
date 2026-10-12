import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExploreProps } from "../../core/types";
import { ItemKey, Owner, Slips, Tasks, Token, pct } from "../../components/ui";
import { SATURDAY_ITEMS, WEEK } from "./data";
import { apriori, combinations, count, itemsOf } from "./engine";
import { RuleBuilder, ruleName } from "./RuleBuilder";
import type { Thresholds } from "./RuleBuilder";

const SAT_LABEL = "Corner Mart · Saturday morning · 10 receipts";


function ItemPicker({ items, value, onChange, label }: { items: readonly string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label}>
      <span className="lbl">{label}</span>
      <div className="picks">
        {items.map((it) => (
          <button key={it} type="button" className="pick" aria-pressed={value.includes(it)}
            onClick={() => onChange(value.includes(it) ? value.filter((x) => x !== it) : items.filter((x) => x === it || value.includes(x)))}>
            <Token item={it} />{it}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Receipts as a 0/1 table: one row per transaction, one column per item. */
function BasketTable({ data, items, cells, onToggle, totals }: { data: readonly (readonly string[])[]; items: readonly string[]; cells?: Set<string>; onToggle?: (key: string) => void; totals?: boolean }) {
  const on = (r: number, it: string) => (cells ? cells.has(r + "," + it) : data[r].includes(it));
  return (
    <div className="tablewrap">
      <table className="grid01">
        <thead><tr><th scope="col">Receipt</th>{items.map((it) => <th key={it} scope="col" title={it}><Token item={it} /><span className="sr-only">{it}</span></th>)}</tr></thead>
        <tbody>
          {data.map((_, r) => (
            <tr key={r}>
              <th scope="row">#{r + 1}</th>
              {items.map((it) => (
                <td key={it}>
                  {onToggle
                    ? <button type="button" className={"cell" + (on(r, it) ? " on" : "")} aria-pressed={on(r, it)} aria-label={`Receipt ${r + 1}, ${it}: ${on(r, it) ? 1 : 0}`} onClick={() => onToggle(r + "," + it)}>{on(r, it) ? 1 : 0}</button>
                    : <span className={"cell" + (on(r, it) ? " on" : "")}>{on(r, it) ? 1 : 0}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot><tr><th scope="row">Total</th>{items.map((it) => <td key={it}><b>{data.filter((t) => t.includes(it)).length}</b></td>)}</tr></tfoot>
        )}
      </table>
    </div>
  );
}

const TABLE_ROWS = 4;

/* Mission 1: tap the Bread receipts, turn receipts into a 0/1 table, then count an itemset and build a rule. */
export function ExploreReceipts({ data, onDone, done }: ExploreProps) {
  const target = data.map((t, i) => (t.includes("Bread") ? i : -1)).filter((i) => i >= 0);
  const [phase, setPhase] = useState(done ? 2 : 0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [cells, setCells] = useState<Set<string>>(new Set());
  const [free, setFree] = useState<string[]>(["Eggs"]);
  const [counted, setCounted] = useState(false);
  const [ante, setAnte] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const ruleBuilt = ante.length > 0 && cons.length > 0;
  const tasks = [
    { text: "Tap every receipt with bread", done: phase > 0 },
    { text: "Fill in the first four rows of the receipt table", done: phase > 1 },
    { text: "Count an itemset of your own", done: counted },
    { text: "Build a rule: choose its antecedent and consequent", done: ruleBuilt },
  ];

  const checkTap = () => {
    const missed = target.filter((i) => !picked.has(i));
    const extra = [...picked].filter((i) => !target.includes(i));
    if (!missed.length && !extra.length) { setMsg(null); setPhase(1); return; }
    setTries(tries + 1);
    const bits = [];
    if (missed.length) bits.push(tries ? `Look again at ${missed.map((i) => "#" + (i + 1)).join(", ")}.` : `You've missed ${missed.length}.`);
    if (extra.length) bits.push(`${extra.map((i) => "#" + (i + 1)).join(", ")} ${extra.length > 1 ? "have" : "has"} no bread.`);
    setMsg(bits.join(" "));
  };
  const checkTable = () => {
    const bad = data.slice(0, TABLE_ROWS).map((t, r) => (SATURDAY_ITEMS.every((it) => cells.has(r + "," + it) === t.includes(it)) ? -1 : r)).filter((r) => r >= 0);
    if (!bad.length) { setMsg(null); setPhase(2); return; }
    setMsg(`Check row ${bad.map((r) => "#" + (r + 1)).join(", ")} against its receipt. A 1 means the item is on the receipt, a 0 means it isn't.`);
  };
  // An item can only sit on one side of a rule; the checkpoint opens once both sides have something.
  const setSides = (a: string[], c: string[]) => { setAnte(a); setCons(c); if (a.length && c.length && !done) onDone(); };
  const pickAnte = (v: string[]) => setSides(v, cons.filter((x) => !v.includes(x)));
  const pickCons = (v: string[]) => setSides(ante.filter((x) => !v.includes(x)), v);

  if (phase === 0) {
    return (
      <div className="split">
        <div className="stack">
          <p className="data-label">{SAT_LABEL} · tap to select</p>
          <Slips data={data} selected={picked} label="Receipts: tap the ones with bread"
            onToggle={(i) => { const s = new Set(picked); s.has(i) ? s.delete(i) : s.add(i); setPicked(s); }} />
          <ItemKey items={SATURDAY_ITEMS} />
        </div>
        <div className="stack">
          <Tasks items={tasks} />
          <section className="card">
            <span className="k">Task 1</span>
            <h2>Tap every receipt that has <Token item="Bread" /> Bread</h2>
            <p>Each receipt is one customer's basket, which is one <b>transaction</b>. Each token is one <b>item</b>.</p>
            <div className="row"><button type="button" className="btn" disabled={!picked.size} onClick={checkTap}>Check my picks</button><span className="worth" style={{ marginTop: 0 }}>{picked.size} selected</span></div>
          </section>
          <Owner level={msg ? "Try again" : undefined}>{msg ?? "I want to know how many of Saturday's customers bought bread. Tap their receipts."}</Owner>
        </div>
      </div>
    );
  }
  if (phase === 1) {
    return (
      <div className="split">
        <div className="stack">
          <p className="data-label">{SAT_LABEL}</p>
          <Slips data={data.slice(0, TABLE_ROWS)} label="The first four receipts" />
          <ItemKey items={SATURDAY_ITEMS} />
        </div>
        <div className="stack">
          <Tasks items={tasks} />
          <section className="card">
            <span className="k">Task 2</span>
            <h2>Turn the receipts into a table</h2>
            <p>Computers store receipts as a table: one <b>row</b> per transaction, one <b>column</b> per item. Tap a cell to switch it between <b>0</b> (not bought) and <b>1</b> (bought).</p>
            <BasketTable data={data.slice(0, TABLE_ROWS)} items={SATURDAY_ITEMS} cells={cells}
              onToggle={(k) => { const n = new Set(cells); n.has(k) ? n.delete(k) : n.add(k); setCells(n); }} />
            <div className="row" style={{ marginTop: 10 }}><button type="button" className="btn" onClick={checkTable}>Check my table</button></div>
          </section>
          <Owner level={msg ? "Try again" : undefined}>{msg ?? "The shop's computer can't read slips. Copy the first four receipts into the table."}</Owner>
        </div>
      </div>
    );
  }
  const c = count(data, free);
  return (
    <div className="split">
      <div className="stack">
        <p className="data-label">{SAT_LABEL}</p>
        <Slips data={data} highlight={free.length ? { lit: free } : null} />
        <section className="card">
          <span className="k">All ten receipts as a table</span>
          <BasketTable data={data} items={SATURDAY_ITEMS} totals />
          <p className="worth">Add up a column of 1s and you get that item's count. Bread: 6.</p>
        </section>
      </div>
      <div className="stack">
        <Tasks items={tasks} />
        <Owner tone="ok">That's the same data, ready for a computer. Now try an itemset and a rule of your own.</Owner>
        <section className="card">
          <span className="k">Task 3 · Itemset</span>
          <ItemPicker items={SATURDAY_ITEMS} value={free} onChange={(v) => { setFree(v); setCounted(true); }} label="Build an itemset" />
          <p style={{ marginTop: 12 }}>
            {free.length ? <>Receipts with <b>{free.join(" and ")}</b>: <span className="eq" style={{ display: "inline", fontSize: "1.3rem" }}>{c}</span></> : "Pick one or more items."}
          </p>
          <p className="worth">A receipt only counts if it has every item in the itemset.</p>
        </section>
        <section className="card">
          <span className="k">Task 4 · Rule</span>
          <ItemPicker items={SATURDAY_ITEMS} value={ante} onChange={pickAnte} label="IF the customer buys… (antecedent)" />
          <div style={{ height: 8 }} />
          <ItemPicker items={SATURDAY_ITEMS} value={cons} onChange={pickCons} label="THEN they also buy… (consequent)" />
          <p style={{ marginTop: 12 }}>
            {ruleBuilt
              ? <><b>{ruleName(ante, cons)}</b>: if a customer buys {ante.join(" and ")}, then they buy {cons.join(" and ")}. The <b>antecedent</b> is {"{"}{ante.join(", ")}{"}"} and the <b>consequent</b> is {"{"}{cons.join(", ")}{"}"}.</>
              : "Pick at least one item for each side. An item can't be on both sides."}
          </p>
        </section>
      </div>
    </div>
  );
}

/* Mission 2: support calculator and a minimum-support slider. */
export function ExploreSupport({ data, onDone, done }: ExploreProps) {
  const [sel, setSel] = useState<string[]>(["Bread", "Butter"]);
  const [triedPair, setTriedPair] = useState(false);
  const [min, setMin] = useState(50);
  const sets = useMemo(() => {
    const out: { items: string[]; c: number }[] = [];
    for (const k of [1, 2]) for (const s of combinations(SATURDAY_ITEMS, k)) { const c = count(data, s); if (c) out.push({ items: s, c }); }
    return out;
  }, [data]);
  const c = count(data, sel);
  const finish = (pair: boolean, m: number) => { if (pair && m === 30 && !done) onDone(); };

  return (
    <div className="split">
      <div className="stack">
        <p className="data-label">{SAT_LABEL}</p>
        <Slips data={data} highlight={sel.length ? { lit: sel } : null} />
        <section className="card">
          <span className="k">Support calculator</span>
          <ItemPicker items={SATURDAY_ITEMS} value={sel} onChange={(v) => { setSel(v); if (v.length >= 2) { setTriedPair(true); finish(true, min); } }} label="Pick an itemset" />
          {sel.length > 0 && (
            <p style={{ marginTop: 12, fontWeight: 700 }}>
              support({"{"}{sel.join(", ")}{"}"}) = {c} ÷ {data.length} = <span className="eq" style={{ display: "inline", fontSize: "1.25rem" }}>{pct(c / data.length)}</span>
            </p>
          )}
        </section>
      </div>
      <div className="stack">
        <Tasks items={[
          { text: "Work out the support of a different pair with the calculator", done: triedPair },
          { text: "Set the minimum support to 30%, Mrs Tan's cut-off", done: min === 30 && triedPair },
        ]} />
        <section className="card">
          <label className="lbl" htmlFor="minsup">Minimum support: {min}% ({Math.ceil(min / 10)} of 10 receipts)</label>
          <input id="minsup" className="slider" type="range" min={10} max={60} step={10} value={min} onChange={(e) => { const m = Number(e.target.value); setMin(m); finish(triedPair, m); }} />
          <p className="worth" style={{ marginTop: 6 }}>Itemsets below the line fade out.</p>
          <div className="setlist" style={{ marginTop: 10 }}>
            {sets.map((s) => (
              <div key={s.items.join()} className={"set" + (s.c / data.length < min / 100 - 1e-9 ? " out" : "")}>
                <span className="toks">{s.items.map((i) => <Token key={i} item={i} />)}</span>
                <span className="ct">{pct(s.c / data.length)} <small>({s.c})</small></span>
              </div>
            ))}
          </div>
        </section>
        <Owner>{min === 30 ? `At 30%, ${sets.filter((s) => s.c >= 3).length} itemsets make the cut. Those are the ones worth my shelf space.` : "Drag the slider and watch which combinations survive."}</Owner>
      </div>
    </div>
  );
}

/* Mission 3: build rules and see confidence. */
export function ExploreRules({ data, onDone, done }: ExploreProps) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [strongOther, setStrongOther] = useState(false);
  const t1 = seen.has("Bread → Butter"), t2 = seen.has("Butter → Bread");
  return (
    <RuleBuilder data={data} items={SATURDAY_ITEMS} dataLabel={SAT_LABEL}
      onRule={(r, s) => {
        const n = ruleName(r.if, r.then);
        const next = new Set(seen).add(n);
        setSeen(next);
        const other = !r.if.concat(r.then).some((i) => i === "Bread" || i === "Butter") && s.confidence > 0.6;
        const so = strongOther || other;
        if (other) setStrongOther(true);
        if (!done && next.has("Bread → Butter") && next.has("Butter → Bread") && so) onDone();
      }}
      side={<Tasks items={[
        { text: "Build Bread → Butter. What share of bread buyers took butter?", done: t1 },
        { text: "Flip it: Butter → Bread. Why is the confidence different?", done: t2 },
        { text: "Find a rule above 60% confidence without bread or butter", done: strongOther },
      ]} />}
    />
  );
}

/* Mission 4: compare confidence with the baseline. */
export function ExploreLift({ data, onDone, done }: ExploreProps) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [one, setOne] = useState(false);
  return (
    <RuleBuilder data={data} items={SATURDAY_ITEMS} dataLabel={SAT_LABEL} compare initial={{ if: ["Bread"], then: ["Milk"] }}
      onRule={(r, s) => {
        const next = new Set(seen).add(ruleName(r.if, r.then));
        setSeen(next);
        const isOne = s.count > 0 && Math.abs(s.lift - 1) < 0.005;
        if (isOne) setOne(true);
        if (!done && next.has("Bread → Milk") && next.has("Coffee → Cookies") && (one || isOne)) onDone();
      }}
      side={<Tasks items={[
        { text: "Check the nephew's rule: Bread → Milk", done: seen.has("Bread → Milk") },
        { text: "Compare it with Coffee → Cookies", done: seen.has("Coffee → Cookies") },
        { text: "Find a rule with lift of exactly 1.00", done: one },
      ]} />}
    />
  );
}

/* Mission 5: Apriori, one level at a time: singles → pairs → only the triples worth counting. */
export function ExploreApriori({ data, onDone, done }: ExploreProps) {
  const MIN = 3;
  const res = useMemo(() => apriori(data, MIN, SATURDAY_ITEMS), [data]);
  const [stage, setStage] = useState(0);
  const [l3, setL3] = useState<Record<string, "counted" | "skipped">>({});
  const l1 = res.levels[0].candidates, l2 = res.levels[1].candidates, l3c = res.levels[2].candidates;
  const n = data.length;
  const pairStatus = new Map(l2.map((c) => [c.items.join("·"), c.status === "frequent"]));
  const frequentPairs = l2.filter((c) => c.status === "frequent").length;
  const tripleKey = (c: (typeof l3c)[number]) => c.items.join("·");
  const allDone = l3c.every((c) => l3[tripleKey(c)]);
  const counted = (stage >= 1 ? l1.length : 0) + (stage >= 2 ? l2.length : 0) + Object.values(l3).filter((v) => v === "counted").length;
  const allCombos = res.naiveChecks / n;
  const name = (items: readonly string[]) => items.join(" + ");

  const intro = <>Apriori finds the itemsets that are on at least <b>{MIN} of my {n} receipts</b> (30% support). It goes one size at a time: single items, then pairs, then triples. Start with the single items.</>;
  const [say, setSay] = useState<ReactNode>(intro);

  const countSingles = () => { setStage(1); setSay(<>All {l1.length} items are on at least {MIN} receipts, so all {l1.length} are frequent. Next, count every pair of them.</>); };
  const countPairs = () => {
    setStage(2);
    setSay(<>Only {frequentPairs} of the {l2.length} pairs are frequent. Now the triples. <b>A triple can only be frequent if all three of its pairs are.</b> Look at each triple's pairs, then count it or skip it.</>);
  };
  const act = (c: (typeof l3c)[number], choice: "counted" | "skipped") => {
    const k = name(c.items);
    if (choice === "skipped" && c.status !== "pruned") {
      setSay(<>Careful. All three pairs inside {k} are frequent, so it might be frequent too. You have to count this one.</>);
      return;
    }
    const next = { ...l3, [tripleKey(c)]: choice };
    setL3(next);
    if (choice === "skipped") setSay(<>Good call. {name(c.rareSubset!)} is already too rare, so {k} must be too. No counting needed.</>);
    else if (c.status === "pruned") setSay(<>It's on only {count(data, c.items)} receipt{count(data, c.items) === 1 ? "" : "s"}: too rare, as expected. You could have skipped it, because {name(c.rareSubset!)} was already too rare.</>);
    else setSay(<>{k} is on {c.count} receipts, so it's frequent. That one did need counting.</>);
    if (!done && l3c.every((x) => next[tripleKey(x)])) onDone();
  };

  const Box = ({ items, ct }: { items: readonly string[]; ct?: number }) => {
    const ok = ct !== undefined && ct >= MIN;
    return (
      <div className={"box" + (ct === undefined ? "" : ok ? " ok" : " rare")} aria-label={`${name(items)}: ${ct === undefined ? "not counted yet" : `${ct} receipts, ${ok ? "frequent" : "too rare"}`}`}>
        <span className="toks">{items.map((i) => <Token key={i} item={i} />)}</span>
        <span className="nm">{name(items)}</span>
        <span className="ct">{ct === undefined ? "?" : <>{ct} <small>{ok ? "✓ frequent" : "too rare"}</small></>}</span>
      </div>
    );
  };

  const skipped = Object.values(l3).filter((v) => v === "skipped").length;

  return (
    <>
      <div className="split" style={{ marginBottom: 16 }}>
        <Tasks items={[
          { text: "Step 1: count the single items", done: stage >= 1 },
          { text: "Step 2: count the pairs", done: stage >= 2 },
          { text: "Step 3: for each triple, check its pairs, then count it or skip it", done: allDone },
        ]} />
        <Owner tone={allDone ? "ok" : undefined}>
          {allDone ? <>Done. You counted {counted} itemsets instead of all {allCombos} possible combinations{skipped ? <>, and skipped {skipped} triple{skipped > 1 ? "s" : ""} without counting</> : null}. That's the saving Apriori gives.</> : say}
        </Owner>
      </div>
      <div className="split">
        <div className="stack">
          <div className="shelves">
            <div className="shelf">
              <div className="lab">Step 1 · Single items {stage === 0 && <button type="button" className="btn small" onClick={countSingles}>Count the {l1.length} items</button>}</div>
              <div className="boxes">{l1.map((c) => <Box key={c.items.join()} items={c.items} ct={stage >= 1 ? c.count! : undefined} />)}</div>
            </div>
            {stage >= 1 && (
              <div className="shelf">
                <div className="lab">Step 2 · Pairs of frequent items {stage === 1 && <button type="button" className="btn small" onClick={countPairs}>Count all {l2.length} pairs</button>}</div>
                <div className="boxes">{l2.map((c) => <Box key={c.items.join()} items={c.items} ct={stage >= 2 ? c.count! : undefined} />)}</div>
              </div>
            )}
            {stage >= 2 && (
              <div className="shelf">
                <div className="lab">Step 3 · Triples: count or skip?</div>
                <div className="boxes triples">
                  {l3c.map((c) => {
                    const k = tripleKey(c), st = l3[k];
                    const ct = st === "counted" ? count(data, c.items) : undefined;
                    return (
                      <div key={k} className={"triple" + (!st ? " wait" : st === "skipped" ? " skip" : ct! >= MIN ? " ok" : " rare")}>
                        <span className="toks">{c.items.map((i) => <Token key={i} item={i} />)}</span>
                        <span className="nm">{name(c.items)}</span>
                        <span className="sub">Its pairs:</span>
                        <ul className="pairs">
                          {[[0, 1], [0, 2], [1, 2]].map(([a, b]) => {
                            const pr = [c.items[a], c.items[b]];
                            const fq = pairStatus.get(pr.join("·"));
                            return <li key={pr.join()} className={fq ? "y" : "n"}>{name(pr)} <b>{fq ? "✓ frequent" : "✗ too rare"}</b></li>;
                          })}
                        </ul>
                        {!st ? (
                          <span className="acts">
                            <button type="button" className="btn alt small" onClick={() => act(c, "counted")} aria-label={`Count ${name(c.items)}`}>Count it</button>
                            <button type="button" className="btn small" onClick={() => act(c, "skipped")} aria-label={`Skip ${name(c.items)}`}>Skip it</button>
                          </span>
                        ) : (
                          <span className="ct">{st === "skipped" ? "Skipped: not counted" : <>On {ct} receipt{ct === 1 ? "" : "s"} · {ct! >= MIN ? "✓ frequent" : "too rare"}</>}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="stack">
          <section className="card">
            <span className="k">The rule for this aisle</span>
            <p style={{ margin: 0 }}>An itemset is <b>frequent</b> if it is on at least <b>{MIN} of the {n} receipts</b>. Anything less is <b>too rare</b>.</p>
          </section>
          <section className="card">
            <span className="k">The Apriori shortcut</span>
            <p style={{ margin: 0 }}>If a pair is too rare, any triple that contains it must be too rare as well. You can't buy all three items more often than you buy two of them. So a triple only needs counting when <b>all three of its pairs are frequent</b>.</p>
          </section>
          <section className="card">
            <span className="k">Counting saved</span>
            <p style={{ margin: 0 }}>Itemsets counted so far: <b>{counted}</b>. Counting every possible combination of {l1.length} items would mean {allCombos} counts.</p>
          </section>
        </div>
      </div>
    </>
  );
}

/* Mission 6: build a report of three rules that pass every threshold. */
export const MEETING: Thresholds = { minSupport: 0.2, minConfidence: 0.6, minLift: 1 };
const WEEK_ITEMS = itemsOf(WEEK);

export function ExploreReport({ data, onDone, done }: ExploreProps) {
  const [rule, setRule] = useState<{ name: string; ok: boolean; stats: string; why: string[] } | null>(null);
  const [report, setReport] = useState<{ name: string; stats: string }[]>([]);
  const add = () => {
    if (!rule || !rule.ok || report.some((r) => r.name === rule.name)) return;
    const next = [...report, { name: rule.name, stats: rule.stats }];
    setReport(next);
    if (next.length >= 3 && !done) onDone();
  };
  return (
    <RuleBuilder data={data} items={WEEK_ITEMS} compact thresholds={MEETING} dataLabel="Corner Mart · one week · 30 receipts"
      onRule={(r, s) => {
        const why = [];
        if (s.support < MEETING.minSupport - 1e-9) why.push("support under 20%");
        if (s.confidence < MEETING.minConfidence - 1e-9) why.push("confidence under 60%");
        if (!(s.lift > MEETING.minLift)) why.push("lift not above 1");
        setRule({ name: ruleName(r.if, r.then), ok: why.length === 0, why, stats: `${pct(s.support)} · ${pct(s.confidence)} · lift ${s.lift.toFixed(2)}` });
      }}
      side={
        <section className="card">
          <span className="k">Report for Mrs Tan · {report.length} of 3 rules</span>
          <p className="worth" style={{ marginTop: 2 }}>Each rule needs support ≥ 20%, confidence ≥ 60% and lift above 1.</p>
          {report.length > 0 && <ul className="report" style={{ margin: "8px 0" }}>{report.map((r) => <li key={r.name}>{r.name} <small>{r.stats}</small></li>)}</ul>}
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn" disabled={!rule?.ok || report.some((r) => r.name === rule?.name) || report.length >= 3} onClick={add}>Add this rule</button>
            {rule && !rule.ok && <span className="worth" style={{ marginTop: 0 }}>Can't add: {rule.why.join(", ")}</span>}
            {rule?.ok && report.some((r) => r.name === rule.name) && <span className="worth" style={{ marginTop: 0 }}>Already in the report</span>}
          </div>
        </section>
      }
    />
  );
}

