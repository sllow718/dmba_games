import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExploreProps } from "../../core/types";
import { ItemKey, Owner, Slips, Tasks, Token, pct } from "../../components/ui";
import { SATURDAY_ITEMS, WEEK } from "./data";
import { apriori, combinations, count, itemsOf } from "./engine";
import { RuleBuilder, ruleName } from "./RuleBuilder";
import { OneHot } from "./table";
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

/* Mission 1: see the receipts as a 0/1 table, then build a rule. */
export function ExploreReceipts({ data, onDone, done }: ExploreProps) {
  const [view, setView] = useState<"receipts" | "table">(done ? "table" : "receipts");
  const [t, setT] = useState({ table: done, rule: done });
  const [ante, setAnte] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);

  const tick = (k: keyof typeof t) => {
    if (t[k]) return;
    const nt = { ...t, [k]: true };
    setT(nt);
    if (nt.table && nt.rule && !done) onDone();
  };
  const pickRule = (side: "A" | "B", v: string[]) => {
    const [a, b] = side === "A" ? [v, cons.filter((x) => !v.includes(x))] : [ante.filter((x) => !v.includes(x)), v];
    setAnte(a); setCons(b);
    if (a.length && b.length) tick("rule");
  };
  const lit = [...ante, ...cons];
  const say: ReactNode = !t.table
    ? <>Each receipt is one customer's basket: one <b>transaction</b>. Press <b>0/1 table</b> to see how a computer stores these same receipts.</>
    : !t.rule
      ? <>Each row is a receipt and each column is an item: 1 means bought, 0 means not. Now build a <b>rule</b>: pick an antecedent and a consequent.</>
      : <>That's a rule: <b>if</b> a customer buys the antecedent, <b>then</b> they also buy the consequent. Whether it's a <i>good</i> rule comes in Aisles 2 to 4.</>;

  return (
    <div className="split">
      <div className="stack">
        <div className="seg-row" role="group" aria-label="Show the receipts as">
          <button type="button" className="pick" aria-pressed={view === "receipts"} onClick={() => setView("receipts")}>Receipts</button>
          <button type="button" className="pick" aria-pressed={view === "table"} onClick={() => { setView("table"); tick("table"); }}>0/1 table</button>
        </div>
        <p className="data-label">{SAT_LABEL}{view === "table" ? " · 1 = bought, 0 = not bought" : ""}</p>
        {view === "receipts" ? (
          <>
            <Slips data={data} highlight={lit.length ? { lit } : null} />
            <ItemKey items={SATURDAY_ITEMS} />
          </>
        ) : (
          <OneHot data={data} items={SATURDAY_ITEMS} lit={lit} />
        )}
      </div>
      <div className="stack">
        <Tasks items={[
          { text: "Switch to the 0/1 table", done: t.table },
          { text: "Build a rule: pick an antecedent (if) and a consequent (then)", done: t.rule },
        ]} />
        <Owner tone="ok">{say}</Owner>
        <section className="card rulepick">
          <span className="k">Build a rule</span>
          <ItemPicker items={SATURDAY_ITEMS} value={ante} onChange={(v) => pickRule("A", v)} label="If a customer buys… (antecedent)" />
          <ItemPicker items={SATURDAY_ITEMS} value={cons} onChange={(v) => pickRule("B", v)} label="…then they also buy (consequent)" />
          {ante.length > 0 && cons.length > 0 && (
            <p className="rule-say" aria-live="polite">
              {`{${ante.join(", ")}}`}<span className="tag">antecedent</span> → {`{${cons.join(", ")}}`}<span className="tag">consequent</span>
            </p>
          )}
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
  const [cutSet, setCutSet] = useState(false);
  const sets = useMemo(() => {
    const out: { items: string[]; c: number }[] = [];
    for (const k of [1, 2]) for (const s of combinations(SATURDAY_ITEMS, k)) { const c = count(data, s); if (c) out.push({ items: s, c }); }
    return out;
  }, [data]);
  const c = count(data, sel);
  // The two tasks can be done in either order; the slider task ticks as soon as it reaches 30%.
  const finish = (pair: boolean, cut: boolean) => { if (pair && cut && !done) onDone(); };

  return (
    <div className="split">
      <div className="stack">
        <p className="data-label">{SAT_LABEL}</p>
        <Slips data={data} highlight={sel.length ? { lit: sel } : null} />
        <section className="card">
          <span className="k">Support calculator</span>
          <ItemPicker items={SATURDAY_ITEMS} value={sel} onChange={(v) => { setSel(v); if (v.length >= 2) { setTriedPair(true); finish(true, cutSet); } }} label="Pick an itemset" />
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
          { text: "Set the minimum support to 30%, Mrs Tan's cut-off", done: cutSet },
        ]} />
        <section className="card">
          <label className="lbl" htmlFor="minsup">Minimum support: {min}% ({Math.ceil(min / 10)} of 10 receipts)</label>
          <input id="minsup" className="slider" type="range" min={10} max={60} step={10} value={min} onChange={(e) => { const m = Number(e.target.value); setMin(m); if (m === 30) { setCutSet(true); finish(triedPair, true); } }} />
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

