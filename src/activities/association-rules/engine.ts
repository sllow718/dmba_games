// Association-rule engine: counting, support, confidence, lift and Apriori.
// Pure functions over a list of transactions so every number shown in the game is testable.

export type Item = string;
export type Transaction = readonly Item[];
export type Itemset = readonly Item[];

export interface Rule {
  if: Itemset;
  then: Itemset;
}

export interface RuleStats {
  count: number; // receipts with every item on both sides
  countIf: number; // receipts with every "if" item
  countThen: number; // receipts with every "then" item
  n: number;
  support: number;
  confidence: number;
  lift: number;
}

export const containsAll = (t: Transaction, items: Itemset): boolean => items.every((i) => t.includes(i));

export function count(data: readonly Transaction[], items: Itemset): number {
  return data.filter((t) => containsAll(t, items)).length;
}

export function support(data: readonly Transaction[], items: Itemset): number {
  return data.length ? count(data, items) / data.length : 0;
}

export function ruleStats(data: readonly Transaction[], rule: Rule): RuleStats {
  const n = data.length;
  const both = [...rule.if, ...rule.then];
  const c = count(data, both);
  const cIf = count(data, rule.if);
  const cThen = count(data, rule.then);
  const confidence = cIf ? c / cIf : 0;
  const baseline = n ? cThen / n : 0;
  return {
    count: c,
    countIf: cIf,
    countThen: cThen,
    n,
    support: n ? c / n : 0,
    confidence,
    lift: baseline ? confidence / baseline : 0,
  };
}

/** All items that appear in the data, in first-seen order. */
export function itemsOf(data: readonly Transaction[]): Item[] {
  const seen: Item[] = [];
  for (const t of data) for (const i of t) if (!seen.includes(i)) seen.push(i);
  return seen;
}

const key = (s: Itemset) => [...s].sort().join("|");

/** Every k-item combination of the given items, preserving input order. */
export function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [head, ...rest] = items;
  return [...combinations(rest, k - 1).map((c) => [head, ...c]), ...combinations(rest, k)];
}

export interface CandidateResult {
  items: Item[];
  /** "frequent" and "rare" candidates were counted; "pruned" were skipped by the Apriori principle. */
  status: "frequent" | "rare" | "pruned";
  count: number | null;
  /** For pruned candidates: a rare subset that proves it must be rare. */
  rareSubset?: Item[];
}

export interface AprioriLevel {
  k: number;
  candidates: CandidateResult[];
}

export interface AprioriResult {
  levels: AprioriLevel[];
  frequent: Item[][];
  /** Receipt checks used: each counted candidate scans every receipt once. */
  checks: number;
  /** Receipt checks a brute-force count of every possible itemset would use. */
  naiveChecks: number;
}

/**
 * Classic Apriori. Level k candidates are joins of frequent (k-1)-itemsets; any candidate
 * with a non-frequent (k-1)-subset is pruned without being counted.
 */
export function apriori(data: readonly Transaction[], minCount: number, order: readonly Item[] = itemsOf(data)): AprioriResult {
  const rank = (i: Item) => order.indexOf(i);
  const sortSet = (s: Item[]) => [...s].sort((a, b) => rank(a) - rank(b));
  const levels: AprioriLevel[] = [];
  const frequent: Item[][] = [];
  let checks = 0;

  let candidates: Item[][] = order.map((i) => [i]);
  let prevFrequent = new Set<string>();
  for (let k = 1; candidates.length; k++) {
    const results: CandidateResult[] = [];
    const nowFrequent: Item[][] = [];
    for (const cand of candidates) {
      if (k > 1) {
        const rareSubset = combinations(cand, k - 1).find((s) => !prevFrequent.has(key(s)));
        if (rareSubset) {
          results.push({ items: cand, status: "pruned", count: null, rareSubset });
          continue;
        }
      }
      const c = count(data, cand);
      checks += data.length;
      const ok = c >= minCount;
      results.push({ items: cand, status: ok ? "frequent" : "rare", count: c });
      if (ok) nowFrequent.push(cand);
    }
    levels.push({ k, candidates: results });
    frequent.push(...nowFrequent);
    prevFrequent = new Set(nowFrequent.map(key));
    // Join step: union pairs of frequent k-itemsets that share k-1 items.
    const next = new Map<string, Item[]>();
    for (let a = 0; a < nowFrequent.length; a++) {
      for (let b = a + 1; b < nowFrequent.length; b++) {
        const u = sortSet([...new Set([...nowFrequent[a], ...nowFrequent[b]])]);
        if (u.length === k + 1) next.set(key(u), u);
      }
    }
    // Level 2 has no join restriction beyond frequency: all pairs of frequent singles.
    candidates = [...next.values()];
  }
  const m = order.length;
  return { levels, frequent, checks, naiveChecks: (2 ** m - 1) * data.length };
}

export interface ScoredRule extends Rule, RuleStats {}

/** All rules X → Y (Y a single item) from frequent itemsets that pass the thresholds. */
export function strongRules(
  data: readonly Transaction[],
  t: { minSupport: number; minConfidence: number; minLift: number },
): ScoredRule[] {
  const minCount = Math.ceil(t.minSupport * data.length - 1e-9);
  const { frequent } = apriori(data, minCount);
  const out: ScoredRule[] = [];
  for (const set of frequent) {
    if (set.length < 2) continue;
    for (const then of set) {
      const rule = { if: set.filter((i) => i !== then), then: [then] };
      const s = ruleStats(data, rule);
      if (s.support >= t.minSupport - 1e-9 && s.confidence >= t.minConfidence - 1e-9 && s.lift > t.minLift) out.push({ ...rule, ...s });
    }
  }
  return out.sort((a, b) => b.lift - a.lift);
}

/** Parse a student's numeric answer: "5/6", "0.83", "83%" or "83" (read as a percentage when > 1). */
export function parseAnswer(raw: string, opts: { percentOver1?: boolean } = { percentOver1: true }): number {
  const s = raw.trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (!s) return NaN;
  if (s.includes("/")) {
    const [a, b, extra] = s.split("/");
    if (extra !== undefined) return NaN;
    const x = Number(a), y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && y !== 0 ? x / y : NaN;
  }
  const pct = s.endsWith("%");
  const v = Number(pct ? s.slice(0, -1) : s);
  if (!Number.isFinite(v)) return NaN;
  if (pct || (opts.percentOver1 && v > 1)) return v / 100;
  return v;
}
