import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExploreProps } from "../../core/types";
import { Owner, Tasks } from "../../components/ui";
import type { Applicant } from "./data";
import { TEST } from "./data";
import type { Measure, Test, TreeNode } from "./engine";
import {
  CAT_TESTS, accuracy, ask, bestSplit, confusion, countOutcomes, cutPoints, depthOf, gini, leaf, leaves, prune, rules, scoreSplit, tagFor,
  money, testLabel, withSplit,
} from "./engine";
import { BANK_TREE, FULL_TREE, findNode } from "./trees";
import { ApplicantCard, Applicants, Impurity, Tally, Tree } from "./ui";

const TRAIN_LABEL = "Neighbourhood Bank · 12 past loans";
const f3 = (x: number) => x.toFixed(3);
const sameTest = (a: Test, b: Test) => testLabel(a) === testLabel(b);

/** Tasks and Mr Lim side by side above the activity, so neither gets missed. */
function Header({ tasks, say }: { tasks: { text: string; done: boolean }[]; say: ReactNode }) {
  return (
    <div className="split" style={{ marginBottom: 16 }}>
      <Tasks items={tasks} />
      <Owner>{say}</Owner>
    </div>
  );
}

function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; text: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" className="pick" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.text}</button>
      ))}
    </div>
  );
}

/* Counter 1: follow new applicants down Mr Lim's tree. */
const NEWCOMERS = ["Mei", "Nikhil", "Quinn"].map((n) => TEST.find((r) => r.name === n)!);

export function ExploreReadTree({ onDone, done }: ExploreProps<Applicant>) {
  const [idx, setIdx] = useState(0);
  const [path, setPath] = useState<string[]>(["r"]);
  const [routed, setRouted] = useState<Set<number>>(new Set());
  const [say, setSay] = useState<ReactNode>("Start at the top box. Answer its question for Mei, then follow that branch down.");
  const r = NEWCOMERS[idx];
  const cur = findNode(BANK_TREE, path[path.length - 1])!;
  const atLeaf = !cur.test;

  const answer = (yes: boolean) => {
    const t = cur.test!;
    if (ask(t, r) !== yes) {
      setSay(t.kind === "num"
        ? `Look again: ${r.name}'s income is $${r.income}k. Is that ${money(t.cut)} or less?`
        : `Look again at ${r.name}'s card: ${t.attr} is ${r[t.attr]}.`);
      return;
    }
    const next = yes ? cur.yes! : cur.no!;
    setPath([...path, next.id]);
    if (next.test) setSay(`Right, ${yes ? "yes" : "no"}. Down to the next question.`);
    else {
      const n = next.counts.Repaid + next.counts.Default;
      const k = Math.max(next.counts.Repaid, next.counts.Default);
      setSay(<>{r.name} lands in a <b>{next.predict}</b> leaf. {k} of the {n} past applicants there {next.predict === "Repaid" ? "repaid" : "defaulted"}, so I'd {next.predict === "Repaid" ? "lend" : "decline"}.</>);
      const nr = new Set(routed).add(idx);
      setRouted(nr);
      if (!done && nr.size === NEWCOMERS.length) onDone();
    }
  };

  const nextApplicant = () => {
    const i = (idx + 1) % NEWCOMERS.length;
    setIdx(i);
    setPath(["r"]);
    setSay(`Now ${NEWCOMERS[i].name}. Back to the top box.`);
  };

  return (
    <>
      <Header say={say} tasks={NEWCOMERS.map((x, i) => ({ text: `Send ${x.name} down the tree`, done: routed.has(i) }))} />
      <div className="split">
        <div className="stack">
          <p className="data-label">Mr Lim's tree, built from 12 past loans</p>
          <Tree node={BANK_TREE} path={path} />
        </div>
        <div className="stack">
          <p className="data-label">New applicant {idx + 1} of {NEWCOMERS.length}</p>
          <div className="slip lit" style={{ transform: "none" }}><span className="no">{r.name}</span><ApplicantCard r={r} hideOutcome /></div>
          <section className="card">
            {atLeaf ? (
              <>
                <span className="k">Prediction</span>
                <h2>{r.name}: {cur.predict}</h2>
                <button type="button" className="btn" onClick={nextApplicant}>{routed.size === NEWCOMERS.length ? "Try one again" : "Next applicant →"}</button>
              </>
            ) : (
              <>
                <span className="k">{path.length === 1 ? "Top of the tree" : `Step ${path.length}`}</span>
                <h2>{testLabel(cur.test!)}</h2>
                <p>What is the answer for {r.name}?</p>
                <div className="row">
                  <button type="button" className="btn" onClick={() => answer(true)}>Yes</button>
                  <button type="button" className="btn alt" onClick={() => answer(false)}>No</button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/* Counter 2: pick groups and watch Gini and entropy. */
export function ExploreImpurity({ data, onDone, done }: ExploreProps<Applicant>) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [hits, setHits] = useState({ pure: false, even: false, three: false });
  const group = data.filter((_, i) => picked.has(i));
  const c = countOutcomes(group);
  const n = group.length;

  const toggle = (i: number) => {
    const next = new Set(picked);
    next.has(i) ? next.delete(i) : next.add(i);
    setPicked(next);
    const g = countOutcomes(data.filter((_, j) => next.has(j)));
    const size = g.Repaid + g.Default;
    const h = {
      pure: hits.pure || (size >= 3 && (g.Repaid === 0 || g.Default === 0)),
      even: hits.even || (size >= 4 && g.Repaid === g.Default),
      three: hits.three || (size === 4 && Math.min(g.Repaid, g.Default) === 1),
    };
    setHits(h);
    if (!done && h.pure && h.even && h.three) onDone();
  };

  const say = !n
    ? "Tap applicants to put them in a group. I'll tell you how mixed the group is."
    : gini(c) === 0
      ? n >= 3 ? "Pure: everyone in this group had the same outcome. Gini and entropy are both 0." : "Pure so far, but try a bigger group."
      : c.Repaid === c.Default
        ? "Half and half. That's as mixed as two outcomes can get: Gini 0.5, entropy 1."
        : "Mixed, but leaning one way. Both measures sit between pure and 50/50.";

  return (
    <>
      <Header say={say} tasks={[
        { text: "Make a pure group of at least 3 applicants", done: hits.pure },
        { text: "Make an evenly mixed group of at least 4", done: hits.even },
        { text: "Make a group of 4 that is 3 against 1. Compare its Gini and entropy", done: hits.three },
      ]} />
      <div className="split">
        <div className="stack">
          <p className="data-label">{TRAIN_LABEL} · tap to add to your group</p>
          <Applicants data={data} selected={picked} onToggle={toggle} label="Applicants: tap to add to your group" />
        </div>
        <div className="stack">
          <Impurity c={c} label={<>Your group of {n}</>} />
          <Impurity c={countOutcomes(data.filter((_, i) => !picked.has(i)))} label={<>Everyone else ({data.length - n})</>} />
          {n > 0 && <button type="button" className="btn alt small" onClick={() => setPicked(new Set())}>Clear group</button>}
        </div>
      </div>
    </>
  );
}

/** One split drawn as a tiny tree, with both branches' impurity. */
function SplitCard({ rows, t, measure, name }: { rows: Applicant[]; t: Test; measure: Measure; name?: string }) {
  const s = scoreSplit(rows, t, measure);
  const word = measure === "gini" ? "Gini" : "Entropy";
  return (
    <section className="card">
      <span className="k">{name ?? "Your split"}</span>
      <Tree node={withSplit(leaf(rows), t)} />
      <div className="calc">
        <div>Before: {word} {f3(s.before)}</div>
        <div>After (weighted): {word} {f3(s.after)}</div>
        <div><b>{measure === "gini" ? "Drop in Gini" : "Information gain"}: {f3(s.drop)}</b></div>
      </div>
    </section>
  );
}

/* Counter 3: try each question at the root and compare impurity drops. */
export function ExploreSplits({ data, onDone, done }: ExploreProps<Applicant>) {
  const [t, setT] = useState<Test | null>(null);
  const [measure, setMeasure] = useState<Measure>("gini");
  const [tried, setTried] = useState<string[]>([]);
  const [gainSeen, setGainSeen] = useState(false);
  const isCredit = (x: Test | null) => !!x && x.kind === "cat" && x.attr === "credit";

  const check = (nt: Test | null, m: Measure, tr: string[]) => {
    const g = gainSeen || (isCredit(nt) && m === "entropy");
    if (g) setGainSeen(true);
    if (!done && tr.length >= 3 && tr.includes("Credit = Good?") && g) onDone();
  };
  const choose = (nt: Test) => {
    const tr = tried.includes(testLabel(nt)) ? tried : [...tried, testLabel(nt)];
    setT(nt); setTried(tr); check(nt, measure, tr);
  };
  const flip = (m: Measure) => { setMeasure(m); check(t, m, tried); };

  const board = tried.map((l) => scoreSplit(data, CAT_TESTS.find((x) => testLabel(x) === l)!, measure)).sort((a, b) => b.drop - a.drop);
  const s = t && scoreSplit(data, t, measure);
  const say = !s
    ? "Which question should the tree ask first? Pick one and see how much purer the two branches get."
    : isCredit(t)
      ? measure === "entropy" ? "Credit history again comes out on top. Entropy and Gini agree here." : "Look at that: 5 to 1 on one side, 1 to 5 on the other. Much purer."
      : s.drop < 0.05 ? "Hardly any better than not splitting at all." : "Some improvement. Is there a better question?";

  return (
    <>
      <Header say={say} tasks={[
        { text: "Try at least 3 different first questions", done: tried.length >= 3 },
        { text: "Find the question with the biggest drop in Gini", done: tried.includes("Credit = Good?") },
        { text: "Switch to entropy and read that question's information gain", done: gainSeen },
      ]} />
      <div className="split">
        <div className="stack">
          <p className="data-label">{TRAIN_LABEL}{t ? " · outlined: the yes branch" : ""}</p>
          <Applicants data={data} highlight={t ? { lit: [tagFor(t, true)] } : null} />
        </div>
        <div className="stack">
          <span className="lbl">First question</span>
          <div className="picks">
            {CAT_TESTS.map((x) => (
              <button key={testLabel(x)} type="button" className="pick" aria-pressed={!!t && sameTest(t, x)} onClick={() => choose(x)}>{testLabel(x)}</button>
            ))}
          </div>
          <Seg label="Impurity measure" value={measure} onChange={flip} options={[{ v: "gini", text: "Gini" }, { v: "entropy", text: "Entropy" }]} />
          {t && <SplitCard rows={data} t={t} measure={measure} />}
          {board.length > 1 && (
            <section className="card">
              <span className="k">Questions tried, best first</span>
              <ol className="board">{board.map((b) => <li key={testLabel(b.test)}>{testLabel(b.test)} <b>{f3(b.drop)}</b></li>)}</ol>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

/* Counter 4: slide an income cut along the sorted applicants. */
export function ExploreCut({ data, onDone, done }: ExploreProps<Applicant>) {
  const [grp, setGrp] = useState<"Good" | "Poor">("Good");
  const [cut, setCut] = useState<number | null>(null);
  const [triedGood, setTriedGood] = useState<Set<number>>(new Set());
  const [pureGood, setPureGood] = useState(false);
  const [bestPoor, setBestPoor] = useState(false);
  const rows = useMemo(() => data.filter((r) => r.credit === grp).sort((a, b) => a.income - b.income), [data, grp]);
  const cuts = cutPoints(rows);
  const scores = cuts.map((c) => scoreSplit(rows, { kind: "num", attr: "income", cut: c }));
  const best = Math.min(...scores.map((s) => s.after));

  const pick = (c: number) => {
    setCut(c);
    const after = scoreSplit(rows, { kind: "num", attr: "income", cut: c }).after;
    let tg = triedGood, pg = pureGood, bp = bestPoor;
    if (grp === "Good") { tg = new Set(triedGood).add(c); setTriedGood(tg); if (after === 0) { pg = true; setPureGood(true); } }
    else if (after <= best + 1e-9) { bp = true; setBestPoor(true); }
    if (!done && tg.size >= 3 && pg && bp) onDone();
  };
  const s = cut === null ? null : scoreSplit(rows, { kind: "num", attr: "income", cut });
  const say = !s
    ? `These are the ${grp === "Good" ? "good" : "poor"}-credit applicants, lowest income first. Pick a place to cut between two neighbours.`
    : s.after === 0
      ? "A clean cut: both sides are pure. That's the best any cut can do."
      : s.after <= best + 1e-9 ? "That's the best cut for this group." : "Both sides are still mixed. Try another gap.";

  return (
    <>
      <Header say={say} tasks={[
        { text: "Try at least 3 cuts in the good-credit group", done: triedGood.size >= 3 },
        { text: "Find the cut that makes both good-credit sides pure", done: pureGood },
        { text: "Switch to the poor-credit group and find its best cut", done: bestPoor },
      ]} />
      <div className="split">
        <div className="stack">
          <Seg label="Group" value={grp} onChange={(g) => { setGrp(g); setCut(null); }} options={[{ v: "Good", text: "Good credit (6)" }, { v: "Poor", text: "Poor credit (6)" }]} />
          <div className="line-up" role="group" aria-label="Applicants sorted by income, with cut points between them">
            {rows.map((r, i) => (
              <span key={r.name} className="lu">
                <span className={"lu-dot " + (r.outcome === "Repaid" ? "r" : "d") + (cut !== null ? (r.income <= cut ? " left" : " right") : "")}>
                  <b>${r.income}k</b><small>{r.name}</small><small>{r.outcome === "Repaid" ? "✓" : "✗"}</small>
                </span>
                {i < cuts.length && (
                  <button type="button" className={"lu-cut" + (cut === cuts[i] ? " on" : "")} aria-pressed={cut === cuts[i]} aria-label={`Cut at income ${money(cuts[i])}`} onClick={() => pick(cuts[i])}>
                    <span>≤ {money(cuts[i])}</span>
                  </button>
                )}
              </span>
            ))}
          </div>
          <p className="worth" style={{ marginTop: 0 }}>Candidate cuts sit halfway between neighbouring incomes.</p>
        </div>
        <div className="stack">
          {s ? (
            <>
              <div className="meters two">
                <div className="meter"><div className="m">Income ≤ {money(cut!)}</div><Tally c={s.yes} /><div className="w">Gini {f3(gini(s.yes))}</div></div>
                <div className="meter"><div className="m">Income &gt; {money(cut!)}</div><Tally c={s.no} /><div className="w">Gini {f3(gini(s.no))}</div></div>
              </div>
              <SplitCard rows={rows} t={{ kind: "num", attr: "income", cut: cut! }} measure="gini" name={`${grp} credit, cut at ${money(cut!)}`} />
            </>
          ) : (
            <section className="card"><span className="k">No cut yet</span><p>Tap a ≤ button between two applicants.</p></section>
          )}
        </div>
      </div>
    </>
  );
}

/** Training and test accuracy side by side. */
function Scores({ tree }: { tree: TreeNode }) {
  const tr = accuracy(tree, TRAIN_ROWS), te = accuracy(tree, TEST);
  return (
    <div className="meters two">
      <div className="meter"><div className="m">Training set</div><div className="v">{tr.correct} / {tr.total}</div><div className="w">past loans it learnt from</div><div className="bar"><i style={{ width: `${tr.rate * 100}%` }} /></div></div>
      <div className="meter"><div className="m">Test set</div><div className="v">{te.correct} / {te.total}</div><div className="w">new applicants it never saw</div><div className="bar"><i style={{ width: `${te.rate * 100}%` }} /></div></div>
    </div>
  );
}
const TRAIN_ROWS = FULL_TREE.rows;

/* Counter 5: grow the tree one split at a time and watch both accuracies. */
export function ExploreGrow({ data, onDone, done }: ExploreProps<Applicant>) {
  const [tree, setTree] = useState<TreeNode>(() => leaf(data));
  const [sawFull, setSawFull] = useState(false);
  const [compared, setCompared] = useState(false);
  const pure = leaves(tree).every((l) => gini(l.counts) === 0);

  const replace = (node: TreeNode, id: string, f: (n: TreeNode) => TreeNode): TreeNode =>
    node.id === id ? f(node) : node.yes && node.no ? { ...node, yes: replace(node.yes, id, f), no: replace(node.no, id, f) } : node;

  const update = (t: TreeNode) => {
    setTree(t);
    const full = leaves(t).every((l) => gini(l.counts) === 0);
    const sf = sawFull || full;
    if (full) setSawFull(true);
    const cmp = compared || (sf && depthOf(t) === 1);
    if (cmp) setCompared(true);
    if (!done && sf && cmp) onDone();
  };
  const splitAt = (id: string) => update(replace(tree, id, (n) => {
    const b = bestSplit(n.rows);
    return b ? withSplit(n, b.test) : n;
  }));

  const say = depthOf(tree) === 0
    ? "One box, no questions: it predicts the same thing for everyone. Split it and the tree picks the best question for you."
    : pure
      ? <>Every leaf is pure and the tree gets all 12 past loans right. But look at the new applicants. Grace was a one-off, and the Income ≤ $75k split learnt her by heart.</>
      : compared && depthOf(tree) === 1 ? "Just one question, and it does better on new applicants than the full tree. More splits isn't always better." : "Keep going. Split any leaf that is still mixed.";

  return (
    <>
      <Header say={say} tasks={[
        { text: "Split the root", done: depthOf(tree) >= 1 || sawFull },
        { text: "Keep splitting until every leaf is pure", done: sawFull },
        { text: "Start over and stop after one split. Compare the test scores", done: compared },
      ]} />
      <div className="split">
        <div className="stack">
          <Tree node={tree} extra={(n) => !n.test && gini(n.counts) > 0 && <button type="button" className="btn small" onClick={() => splitAt(n.id)}>Split</button>} />
          <div className="row">
            <button type="button" className="btn alt small" disabled={depthOf(tree) === 0} onClick={() => update(leaf(data))}>Start over</button>
          </div>
        </div>
        <div className="stack">
          <Scores tree={tree} />
          <p className="worth" style={{ marginTop: 0 }}>Stopping rules: stop when a leaf is pure, too small, or the tree is deep enough.</p>
        </div>
      </div>
    </>
  );
}

/** Predicted vs actual on the test set, with Default as the outcome to catch. */
export function Confusion({ tree, rows = TEST }: { tree: TreeNode; rows?: readonly Applicant[] }) {
  const m = confusion(tree, rows);
  return (
    <table className="cm">
      <caption>Test set: {m.caught + m.cleared} of {rows.length} right</caption>
      <thead><tr><th /><th scope="col">Predicted Default</th><th scope="col">Predicted Repaid</th></tr></thead>
      <tbody>
        <tr><th scope="row">Actually defaulted</th><td className="ok">{m.caught}<small>caught</small></td><td className="bad">{m.missed}<small>missed</small></td></tr>
        <tr><th scope="row">Actually repaid</th><td className="bad">{m.falseAlarm}<small>false alarm</small></td><td className="ok">{m.cleared}<small>cleared</small></td></tr>
      </tbody>
    </table>
  );
}

/* Counter 6: prune the full tree, read the confusion matrix, write the rules. */
export function ExplorePrune({ onDone, done }: ExploreProps<Applicant>) {
  const [cut, setCut] = useState<Set<string>>(new Set());
  const [pruned, setPruned] = useState(false);
  const [best, setBest] = useState(false);
  const [wrote, setWrote] = useState(false);
  const tree = prune(FULL_TREE, cut);
  const te = accuracy(tree, TEST).correct;

  const toggle = (id: string) => {
    const next = new Set(cut);
    next.has(id) ? next.delete(id) : next.add(id);
    setCut(next);
    const t = prune(FULL_TREE, next);
    const p = pruned || next.size > 0, b = best || accuracy(t, TEST).correct === 7;
    setPruned(p); setBest(b);
    if (!done && p && b && wrote) onDone();
  };
  const write = () => { setWrote(true); if (!done && pruned && best) onDone(); };

  const say = te === 7
    ? "Seven of eight new applicants right, and no defaulter slips through. That's the tree I'd use."
    : cut.size === 0 ? "This is the full tree. Tap Prune on a question to cut its branches back to a single leaf." : `${te} of 8 on the test set. Is there a better trim?`;

  return (
    <>
      <Header say={say} tasks={[
        { text: "Prune one branch", done: pruned },
        { text: "Find the tree that gets 7 of 8 test applicants right", done: best },
        { text: "Write up the tree as rules for Mr Lim", done: wrote },
      ]} />
      <div className="split">
        <div className="stack">
          <Tree node={tree} extra={(n) => n.id !== "r" && findNode(FULL_TREE, n.id)?.test && (
            <button type="button" className="btn alt small" onClick={() => toggle(n.id)}>{cut.has(n.id) ? "Regrow" : "Prune"}</button>
          )} />
          <Scores tree={tree} />
        </div>
        <div className="stack">
          <Confusion tree={tree} />
          <section className="card">
            <span className="k">Rules for Mr Lim</span>
            {wrote ? (
              <ol className="board">{rules(tree).map((r, i) => <li key={i}>IF {r.conditions.join(" AND ") || "anyone"} THEN <b>{r.predict}</b> <small>({r.counts.Repaid} ✓ {r.counts.Default} ✗)</small></li>)}</ol>
            ) : (
              <button type="button" className="btn" onClick={write}>Write the rules</button>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

