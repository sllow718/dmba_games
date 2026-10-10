import type { ReactNode } from "react";
import type { GridProps } from "../../core/types";
import { slipState } from "../../components/ui";
import type { Applicant } from "./data";
import type { Counts, TreeNode } from "./engine";
import { entropy, gini, has, testLabel } from "./engine";

const JOB_ICON = { Salaried: "💼", "Self-employed": "🛠️", Student: "🎓" } as const;

/** Which card chips a highlight is about, so they get a ring. */
const ringedKeys = (h: GridProps<Applicant>["highlight"]) =>
  new Set([...(h?.lit ?? []), ...(h?.both ?? [])].map((tag) => /^\w+/.exec(tag)?.[0]));

function Chip({ on, children, tone }: { on?: boolean; children: ReactNode; tone?: "good" | "bad" }) {
  return <span className={"chip" + (tone ? " " + tone : "") + (on ? " ring" : "")}>{children}</span>;
}

export function Stamp({ outcome, hidden }: { outcome: Applicant["outcome"]; hidden?: boolean }) {
  if (hidden) return <span className="stamp q">Outcome ?</span>;
  return <span className={"stamp " + (outcome === "Repaid" ? "r" : "d")}>{outcome === "Repaid" ? "Repaid ✓" : "Defaulted ✗"}</span>;
}

export const describeApplicant = (r: Applicant) =>
  `${r.name}: ${r.credit.toLowerCase()} credit, income $${r.income}k, ${r.job.toLowerCase()}, ${r.collateral === "Yes" ? "has collateral" : "no collateral"}`;

/** One loan applicant as a card. */
export function ApplicantCard({ r, ringed, hideOutcome }: { r: Applicant; ringed?: Set<string | undefined>; hideOutcome?: boolean }) {
  return (
    <>
      <span className="chips">
        <Chip on={ringed?.has("credit")} tone={r.credit === "Good" ? "good" : "bad"}>{r.credit === "Good" ? "✅ Good credit" : "⚠️ Poor credit"}</Chip>
        <Chip on={ringed?.has("income")}>💵 ${r.income}k</Chip>
        <Chip on={ringed?.has("job")}>{JOB_ICON[r.job]} {r.job}</Chip>
        <Chip on={ringed?.has("collateral")}>{r.collateral === "Yes" ? "🏠 Collateral" : "— No collateral"}</Chip>
      </span>
      <Stamp outcome={r.outcome} hidden={hideOutcome} />
    </>
  );
}

/** The applicant cards, with the same highlight and tap behaviour as Corner Mart's receipts. */
export function Applicants({ data, highlight, selected, onToggle, marks, label, hideOutcome }: GridProps<Applicant> & { hideOutcome?: boolean }) {
  const ringed = ringedKeys(highlight);
  return (
    <div className="slips appl" role={onToggle ? "group" : "list"} aria-label={label ?? "Applicants"}>
      {data.map((r, i) => {
        const st = slipState(r, highlight, has);
        const content = (
          <>
            <span className="no">#{i + 1} · {r.name}</span>
            <ApplicantCard r={r} ringed={ringed} hideOutcome={hideOutcome} />
          </>
        );
        const summary = `Applicant ${i + 1}, ${describeApplicant(r)}${hideOutcome ? "" : `, ${r.outcome === "Repaid" ? "repaid" : "defaulted"}`}`;
        if (onToggle) {
          return (
            <button key={i} type="button" className={`slip ${st} ${marks?.get(i) ?? ""}`} aria-pressed={selected?.has(i) ?? false} aria-label={summary} onClick={() => onToggle(i)}>
              {content}
            </button>
          );
        }
        return (
          <div key={i} role="listitem" className={`slip ${st}`} aria-label={summary + (st === "both" ? " (matches both)" : st === "lit" ? " (highlighted)" : "")}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

/** "5 ✓ 1 ✗": repaid and defaulted counts. */
export function Tally({ c }: { c: Counts }) {
  return (
    <span className="tally" aria-label={`${c.Repaid} repaid, ${c.Default} defaulted`}>
      <b className="r">{c.Repaid} ✓</b> <b className="d">{c.Default} ✗</b>
    </span>
  );
}

interface TreeProps {
  node: TreeNode;
  /** Node ids to light up, e.g. the path one applicant takes. */
  path?: readonly string[];
  /** Extra controls under a node, such as "Split here" or "Prune". */
  extra?: (n: TreeNode) => ReactNode;
  /** Hide counts and leaf certainty, e.g. when first reading the tree. */
  plain?: boolean;
}

function Node({ node, path, extra, plain, edge }: TreeProps & { edge?: "yes" | "no" }) {
  const on = path?.includes(node.id);
  const n = node.counts.Repaid + node.counts.Default;
  const sure = n ? Math.max(node.counts.Repaid, node.counts.Default) / n : 0;
  const isLeaf = !node.test || !node.yes || !node.no;
  return (
    <div className={"tn" + (on ? " on" : "")}>
      {edge && <span className={"edge " + edge}>{edge}</span>}
      <div className={"tbox" + (isLeaf ? " leaf " + (node.predict === "Repaid" ? "r" : "d") : "")}>
        {isLeaf ? (
          <>
            <span className="pred">{node.predict === "Repaid" ? "Repaid ✓" : "Default ✗"}</span>
            {!plain && <span className="sure">{Math.max(node.counts.Repaid, node.counts.Default)} of {n} {node.predict === "Repaid" ? "repaid" : "defaulted"}{n ? ` · ${Math.round(sure * 100)}%` : ""}</span>}
          </>
        ) : (
          <>
            <span className="q">{testLabel(node.test!)}</span>
            {!plain && <Tally c={node.counts} />}
          </>
        )}
        {extra?.(node)}
      </div>
      {!isLeaf && (
        <div className="tkids">
          <Node node={node.yes!} path={path} extra={extra} plain={plain} edge="yes" />
          <Node node={node.no!} path={path} extra={extra} plain={plain} edge="no" />
        </div>
      )}
    </div>
  );
}

/** A decision tree drawn top-down: questions in the boxes, yes to the left, no to the right. */
export function Tree(props: TreeProps) {
  return (
    <div className="tree" role="img" aria-label={treeSummary(props.node)}>
      <Node {...props} />
    </div>
  );
}

function treeSummary(n: TreeNode): string {
  if (!n.test || !n.yes || !n.no) return `predict ${n.predict.toLowerCase()} (${n.counts.Repaid} repaid, ${n.counts.Default} defaulted)`;
  return `${testLabel(n.test)} yes: ${treeSummary(n.yes)}; no: ${treeSummary(n.no)}`;
}

/** Gini and entropy for a group, as numbers and bars. */
export function Impurity({ c, label }: { c: Counts; label?: ReactNode }) {
  const g = gini(c), h = entropy(c);
  return (
    <div className="meter imp">
      <div className="m">{label ?? "Impurity"} <Tally c={c} /></div>
      <div className="imp-row"><span>Gini</span><span className="bar"><i style={{ width: `${(g / 0.5) * 100}%` }} /></span><b>{g.toFixed(3)}</b></div>
      <div className="imp-row"><span>Entropy</span><span className="bar"><i style={{ width: `${h * 100}%` }} /></span><b>{h.toFixed(3)}</b></div>
    </div>
  );
}
