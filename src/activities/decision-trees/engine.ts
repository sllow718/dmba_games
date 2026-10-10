import type { Applicant, Outcome } from "./data";

export type Measure = "gini" | "entropy";
export type CatAttr = "credit" | "job" | "collateral";

/** A yes/no question at a node. Numeric questions send income ≤ cut down the "yes" branch. */
export type Test = { kind: "cat"; attr: CatAttr; value: string } | { kind: "num"; attr: "income"; cut: number };

export interface Counts {
  Repaid: number;
  Default: number;
}

export interface TreeNode {
  /** Path id: "r" for the root, then "y"/"n" per branch taken, e.g. "rny". */
  id: string;
  depth: number;
  rows: Applicant[];
  counts: Counts;
  predict: Outcome;
  test?: Test;
  yes?: TreeNode;
  no?: TreeNode;
}

const ATTR_LABEL: Record<CatAttr, string> = { credit: "Credit", job: "Job", collateral: "Collateral" };

export const ask = (t: Test, r: Applicant) => (t.kind === "num" ? r.income <= t.cut : r[t.attr] === t.value);

export const testLabel = (t: Test) => (t.kind === "num" ? `Income ≤ ${money(t.cut)}?` : `${ATTR_LABEL[t.attr]} = ${t.value}?`);

/** Two-valued attributes name the other value on the "no" branch: Credit = Poor rather than Credit ≠ Good. */
const OTHER: Partial<Record<CatAttr, Record<string, string>>> = { credit: { Good: "Poor", Poor: "Good" }, collateral: { Yes: "No", No: "Yes" } };

/** The condition a "yes" or "no" answer stands for, as plain words for rules. */
export function branchLabel(t: Test, yes: boolean) {
  if (t.kind === "num") return `Income ${yes ? "≤" : ">"} ${money(t.cut)}`;
  const other = OTHER[t.attr]?.[t.value];
  if (!yes && other) return `${ATTR_LABEL[t.attr]} = ${other}`;
  return `${ATTR_LABEL[t.attr]} ${yes ? "=" : "≠"} ${t.value}`;
}

/** An income cut as money: 30 → "$30k", 34.5 → "$34.5k". */
export const money = (x: number) => `$${Number.isInteger(x) ? x : x.toFixed(1)}k`;

/**
 * Highlight tags for the applicant cards: "credit=Good", "job!=Student", "income<=30", "income>30",
 * "outcome=Repaid". An applicant has a tag when it meets that condition.
 */
export function has(r: Applicant, tag: string): boolean {
  const m = /^(\w+)(<=|>|!=|=)(.+)$/.exec(tag);
  if (!m) return false;
  const [, key, op, raw] = m;
  const v = (r as unknown as Record<string, string | number>)[key];
  if (op === "<=") return Number(v) <= Number(raw);
  if (op === ">") return Number(v) > Number(raw);
  return op === "=" ? String(v) === raw : String(v) !== raw;
}

export const tagFor = (t: Test, yes: boolean) =>
  t.kind === "num" ? `income${yes ? "<=" : ">"}${t.cut}` : `${t.attr}${yes ? "=" : "!="}${t.value}`;

export function countOutcomes(rows: readonly Applicant[]): Counts {
  const c = { Repaid: 0, Default: 0 };
  for (const r of rows) c[r.outcome]++;
  return c;
}

export function gini(c: Counts): number {
  const n = c.Repaid + c.Default;
  if (!n) return 0;
  return 1 - (c.Repaid / n) ** 2 - (c.Default / n) ** 2;
}

export function entropy(c: Counts): number {
  const n = c.Repaid + c.Default;
  if (!n) return 0;
  return [c.Repaid, c.Default].reduce((h, k) => (k ? h - (k / n) * Math.log2(k / n) : h), 0);
}

export const impurity = (c: Counts, m: Measure) => (m === "gini" ? gini(c) : entropy(c));

/** Majority outcome; a tie goes to Default, the cautious call for a bank. */
export const majority = (c: Counts): Outcome => (c.Repaid > c.Default ? "Repaid" : "Default");

export function split(rows: readonly Applicant[], t: Test) {
  return { yes: rows.filter((r) => ask(t, r)), no: rows.filter((r) => !ask(t, r)) };
}

export interface SplitScore {
  test: Test;
  yes: Counts;
  no: Counts;
  before: number;
  /** Size-weighted impurity of the two branches. */
  after: number;
  /** before − after: the impurity reduction (information gain for entropy). */
  drop: number;
}

export function scoreSplit(rows: readonly Applicant[], t: Test, m: Measure = "gini"): SplitScore {
  const s = split(rows, t);
  const yes = countOutcomes(s.yes), no = countOutcomes(s.no);
  const n = rows.length;
  const before = impurity(countOutcomes(rows), m);
  const after = n ? (s.yes.length / n) * impurity(yes, m) + (s.no.length / n) * impurity(no, m) : 0;
  return { test: t, yes, no, before, after, drop: before - after };
}

/** Candidate income cuts: midpoints between neighbouring distinct incomes, low to high. */
export function cutPoints(rows: readonly Applicant[]): number[] {
  const xs = [...new Set(rows.map((r) => r.income))].sort((p, q) => p - q);
  return xs.slice(1).map((x, i) => (xs[i] + x) / 2);
}

export const CAT_TESTS: Test[] = [
  { kind: "cat", attr: "credit", value: "Good" },
  { kind: "cat", attr: "collateral", value: "Yes" },
  { kind: "cat", attr: "job", value: "Salaried" },
  { kind: "cat", attr: "job", value: "Self-employed" },
  { kind: "cat", attr: "job", value: "Student" },
];

/** Every question that actually divides these applicants: the yes/no categories, then income cuts. */
export function candidateTests(rows: readonly Applicant[]): Test[] {
  const cats = CAT_TESTS.filter((t) => {
    const s = split(rows, t);
    return s.yes.length > 0 && s.no.length > 0;
  });
  return [...cats, ...cutPoints(rows).map((cut): Test => ({ kind: "num", attr: "income", cut }))];
}

/** The split with the biggest impurity drop (first one wins a tie), or null if nothing helps. */
export function bestSplit(rows: readonly Applicant[], m: Measure = "gini", minLeaf = 1): SplitScore | null {
  let best: SplitScore | null = null;
  for (const t of candidateTests(rows)) {
    const s = scoreSplit(rows, t, m);
    const small = Math.min(s.yes.Repaid + s.yes.Default, s.no.Repaid + s.no.Default) < minLeaf;
    if (small || s.drop <= 1e-9) continue;
    if (!best || s.drop > best.drop + 1e-9) best = s;
  }
  return best;
}

export interface GrowOptions {
  measure?: Measure;
  maxDepth?: number;
  minLeaf?: number;
}

export function leaf(rows: Applicant[], id = "r", depth = 0): TreeNode {
  const counts = countOutcomes(rows);
  return { id, depth, rows, counts, predict: majority(counts) };
}

export function withSplit(node: TreeNode, t: Test): TreeNode {
  const s = split(node.rows, t);
  return { ...node, test: t, yes: leaf(s.yes, node.id + "y", node.depth + 1), no: leaf(s.no, node.id + "n", node.depth + 1) };
}

/** Recursive partitioning: split on the best question until a stopping rule says stop. */
export function grow(rows: Applicant[], o: GrowOptions = {}, id = "r", depth = 0): TreeNode {
  const node = leaf(rows, id, depth);
  const { measure = "gini", maxDepth = Infinity, minLeaf = 1 } = o;
  if (depth >= maxDepth || gini(node.counts) === 0) return node;
  const best = bestSplit(rows, measure, minLeaf);
  if (!best) return node;
  const s = split(rows, best.test);
  return { ...node, test: best.test, yes: grow(s.yes, o, id + "y", depth + 1), no: grow(s.no, o, id + "n", depth + 1) };
}

export function classify(node: TreeNode, r: Applicant): { leaf: TreeNode; path: string[] } {
  const path = [node.id];
  let cur = node;
  while (cur.test && cur.yes && cur.no) {
    cur = ask(cur.test, r) ? cur.yes : cur.no;
    path.push(cur.id);
  }
  return { leaf: cur, path };
}

export const predict = (node: TreeNode, r: Applicant) => classify(node, r).leaf.predict;

/** A copy of the tree with the nodes in `cut` turned back into leaves. */
export function prune(node: TreeNode, cut: ReadonlySet<string>): TreeNode {
  if (!node.test || !node.yes || !node.no) return node;
  if (cut.has(node.id)) return leaf(node.rows, node.id, node.depth);
  return { ...node, yes: prune(node.yes, cut), no: prune(node.no, cut) };
}

export function leaves(node: TreeNode): TreeNode[] {
  return node.yes && node.no ? [...leaves(node.yes), ...leaves(node.no)] : [node];
}

export function splitNodes(node: TreeNode): TreeNode[] {
  return node.yes && node.no ? [node, ...splitNodes(node.yes), ...splitNodes(node.no)] : [];
}

export function depthOf(node: TreeNode): number {
  return node.yes && node.no ? 1 + Math.max(depthOf(node.yes), depthOf(node.no)) : 0;
}

export function accuracy(node: TreeNode, rows: readonly Applicant[]) {
  const correct = rows.filter((r) => predict(node, r) === r.outcome).length;
  return { correct, total: rows.length, rate: rows.length ? correct / rows.length : 0 };
}

/** Confusion matrix with Default as the class the bank is trying to catch. */
export function confusion(node: TreeNode, rows: readonly Applicant[]) {
  const m = { caught: 0, missed: 0, falseAlarm: 0, cleared: 0 };
  for (const r of rows) {
    const p = predict(node, r);
    if (r.outcome === "Default") p === "Default" ? m.caught++ : m.missed++;
    else p === "Default" ? m.falseAlarm++ : m.cleared++;
  }
  return m;
}

export interface Rule {
  conditions: string[];
  predict: Outcome;
  counts: Counts;
}

/** One IF … THEN … rule per leaf. */
export function rules(node: TreeNode, conditions: string[] = []): Rule[] {
  if (!node.test || !node.yes || !node.no) return [{ conditions, predict: node.predict, counts: node.counts }];
  return [
    ...rules(node.yes, [...conditions, branchLabel(node.test, true)]),
    ...rules(node.no, [...conditions, branchLabel(node.test, false)]),
  ];
}

export const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
