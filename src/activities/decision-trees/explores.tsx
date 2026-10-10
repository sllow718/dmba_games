import { useState } from "react";
import type { ReactNode } from "react";
import type { ExploreProps } from "../../core/types";
import { Owner, Tasks } from "../../components/ui";
import type { Applicant } from "./data";
import { TEST } from "./data";
import { ask, countOutcomes, gini, money, testLabel } from "./engine";
import { BANK_TREE, findNode } from "./trees";
import { ApplicantCard, Applicants, Impurity, Tree } from "./ui";

const TRAIN_LABEL = "Neighbourhood Bank · 12 past loans";

/** Tasks and Mr Lim side by side above the activity, so neither gets missed. */
function Header({ tasks, say }: { tasks: { text: string; done: boolean }[]; say: ReactNode }) {
  return (
    <div className="split" style={{ marginBottom: 16 }}>
      <Tasks items={tasks} />
      <Owner>{say}</Owner>
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
