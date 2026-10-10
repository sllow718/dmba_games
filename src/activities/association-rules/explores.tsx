import { useMemo, useState } from "react";
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

/* Mission 1: tap the Bread receipts, then count anything. */
export function ExploreReceipts({ data, onDone, done }: ExploreProps) {
  const target = data.map((t, i) => (t.includes("Bread") ? i : -1)).filter((i) => i >= 0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [free, setFree] = useState<string[]>(["Eggs"]);

  const check = () => {
    const missed = target.filter((i) => !picked.has(i));
    const extra = [...picked].filter((i) => !target.includes(i));
    if (!missed.length && !extra.length) { setMsg(null); onDone(); return; }
    setTries(tries + 1);
    const bits = [];
    if (missed.length) bits.push(tries ? `Look again at ${missed.map((i) => "#" + (i + 1)).join(", ")}.` : `You've missed ${missed.length}.`);
    if (extra.length) bits.push(`${extra.map((i) => "#" + (i + 1)).join(", ")} ${extra.length > 1 ? "have" : "has"} no bread.`);
    setMsg(bits.join(" "));
  };

  if (!done) {
    return (
      <div className="split">
        <div className="stack">
          <p className="data-label">{SAT_LABEL} · tap to select</p>
          <Slips data={data} selected={picked} label="Receipts: tap the ones with bread"
            onToggle={(i) => { const s = new Set(picked); s.has(i) ? s.delete(i) : s.add(i); setPicked(s); }} />
          <ItemKey items={SATURDAY_ITEMS} />
        </div>
        <div className="stack">
          <section className="card">
            <span className="k">Task</span>
            <h2>Tap every receipt that has <Token item="Bread" /> Bread</h2>
            <p>Each receipt is one customer's basket, which is one <b>transaction</b>. Each token is one <b>item</b>.</p>
            <div className="row"><button type="button" className="btn" disabled={!picked.size} onClick={check}>Check my picks</button><span className="worth" style={{ marginTop: 0 }}>{picked.size} selected</span></div>
          </section>
          <Owner level={msg ? "Try again" : undefined}>{msg ?? "I want to know how many of Saturday's customers bought bread. Tap their receipts."}</Owner>
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
        <ItemKey items={SATURDAY_ITEMS} />
      </div>
      <div className="stack">
        <Owner tone="ok">Six bread buyers. That number is the <b>support count</b> of {"{Bread}"}. Now try a few itemsets of your own.</Owner>
        <section className="card">
          <ItemPicker items={SATURDAY_ITEMS} value={free} onChange={setFree} label="Build an itemset" />
          <p style={{ marginTop: 12 }}>
            {free.length ? <>Receipts with <b>{free.join(" and ")}</b>: <span className="eq" style={{ display: "inline", fontSize: "1.3rem" }}>{c}</span></> : "Pick one or more items."}
          </p>
          <p className="worth">A receipt only counts if it has every item in the itemset.</p>
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

/* Mission 5: Apriori on the shelves at 30%. */
export function ExploreApriori({ data, onDone, done }: ExploreProps) {
  const MIN = 3;
  const res = useMemo(() => apriori(data, MIN, SATURDAY_ITEMS), [data]);
  const [pairsCounted, setPairsCounted] = useState(false);
  const [l3, setL3] = useState<Record<string, "counted" | "skipped">>({});
  const [say, setSay] = useState("Shelf 1 is done: every single item turns up on at least 3 receipts. Now count the pairs.");
  const l1 = res.levels[0].candidates, l2 = res.levels[1].candidates, l3c = res.levels[2].candidates;
  const n = data.length;
  const checks = n * l1.length + (pairsCounted ? n * l2.length : 0) + n * Object.values(l3).filter((v) => v === "counted").length;
  const allDone = l3c.every((c) => l3[c.items.join("·")]);
  const skipped = Object.values(l3).filter((v) => v === "skipped").length;

  const act = (c: (typeof l3c)[number], choice: "counted" | "skipped") => {
    const k = c.items.join("·");
    if (choice === "skipped" && c.status !== "pruned") {
      setSay(`Careful. Every pair inside ${k} is frequent, so it might be frequent too. You have to count this one.`);
      return;
    }
    const next = { ...l3, [k]: choice };
    setL3(next);
    if (choice === "skipped") setSay(`Good call. ${c.rareSubset!.join(" · ")} is already rare, so ${k} must be too. No counting needed.`);
    else if (c.status === "pruned") setSay(`It came out at ${count(data, c.items)}, too rare as expected. You could have skipped it: ${c.rareSubset!.join(" · ")} was already rare.`);
    else setSay(`${k} appears on ${c.count} receipts, so it's frequent. That one did need counting.`);
    if (!done && l3c.every((x) => next[x.items.join("·")])) onDone();
  };

  const Box = ({ items, ct, cls }: { items: readonly string[]; ct: string | number; cls?: string }) => (
    <div className={"box " + (cls ?? "")} aria-label={`${items.join(", ")}: ${cls === "rare" ? "too rare, " : cls === "skip" ? "skipped, " : ""}${ct}`}>
      <span className="toks">{items.map((i) => <Token key={i} item={i} />)}</span>
      <span className="ct">{ct}</span>
    </div>
  );

  return (
    <div className="split">
      <div className="stack">
        <p className="data-label">Minimum support 30% (3 of 10 receipts) · receipt checks used: <b>{checks}</b> (brute force: {res.naiveChecks})</p>
        <div className="shelves">
          <div className="shelf">
            <div className="lab">Shelf 1 · single items</div>
            <div className="boxes">{l1.map((c) => <Box key={c.items.join()} items={c.items} ct={c.count!} />)}</div>
          </div>
          <div className="shelf">
            <div className="lab">Shelf 2 · pairs {!pairsCounted && <button type="button" className="btn small" onClick={() => { setPairsCounted(true); setSay("Four pairs are frequent. The rest are stamped too rare. Now the triples: only combine frequent pairs, and think before you count."); }}>Count all {l2.length} pairs</button>}</div>
            <div className="boxes">
              {l2.map((c) => <Box key={c.items.join()} items={c.items} ct={pairsCounted ? c.count! : "?"} cls={pairsCounted && c.status === "rare" ? "rare" : ""} />)}
            </div>
          </div>
          {pairsCounted && (
            <div className="shelf">
              <div className="lab">Shelf 3 · triples built from frequent pairs</div>
              <div className="boxes">
                {l3c.map((c) => {
                  const k = c.items.join("·"), st = l3[k];
                  if (!st) return (
                    <div key={k} className="box wait">
                      <span className="toks">{c.items.map((i) => <Token key={i} item={i} />)}</span>
                      <span className="acts">
                        <button type="button" className="btn alt small" onClick={() => act(c, "counted")} aria-label={`Count ${k}`}>Count</button>
                        <button type="button" className="btn small" onClick={() => act(c, "skipped")} aria-label={`Skip ${k}`}>Skip</button>
                      </span>
                    </div>
                  );
                  if (st === "skipped") return <Box key={k} items={c.items} ct="skipped" cls="skip" />;
                  const ct = count(data, c.items);
                  return <Box key={k} items={c.items} ct={ct} cls={ct < MIN ? "rare" : ""} />;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="stack">
        <Owner tone={allDone ? "ok" : undefined}>{allDone ? `${say} You used ${checks} receipt checks instead of ${res.naiveChecks}${skipped ? `, and skipped ${skipped} triple${skipped > 1 ? "s" : ""} without counting` : ""}.` : say}</Owner>
        <section className="card">
          <span className="k">The Apriori principle</span>
          <p>If an itemset is rare, every bigger itemset that contains it is rare too. So a triple only needs counting if <b>all three of its pairs</b> are frequent.</p>
        </section>
        <div className="key">
          <span><span className="box" style={{ padding: "2px 6px", minWidth: 0 }}>3</span> frequent</span>
          <span><span className="box" style={{ padding: "2px 6px", minWidth: 0, opacity: 0.6 }}>2</span> stamped too rare</span>
          <span><span className="box skip" style={{ padding: "2px 6px", minWidth: 0 }}>–</span> skipped, never counted</span>
        </div>
      </div>
    </div>
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

