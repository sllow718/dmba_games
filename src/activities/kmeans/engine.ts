import { rng } from "../../core/random";

/** A gym member: x = visits per month, y = spend per visit in $. Both run 0–30. */
export interface Pt {
  x: number;
  y: number;
}

export const AXIS_MAX = 30;

/** The three real customer groups the random data is drawn around. */
export const SEGMENTS: Pt[] = [
  { x: 6, y: 23 }, // occasional visitors who spend a lot
  { x: 23, y: 7 }, // regulars who spend little
  { x: 22, y: 23 }, // regulars who spend a lot
];

/** How far members wander from their segment: enough overlap that k-means needs a few rounds. */
const SPREAD = 4.6;
const clamp = (v: number) => Math.min(AXIS_MAX - 0.5, Math.max(0.5, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/** n members spread around the three segments, in turn, with a bell-shaped wobble. */
export function makeData(n: number, seed: number): Pt[] {
  const r = rng(seed);
  const gauss = () => (r() + r() + r() + r() - 2) * SPREAD;
  return Array.from({ length: n }, (_, i) => {
    const c = SEGMENTS[i % SEGMENTS.length];
    return { x: round1(clamp(c.x + gauss())), y: round1(clamp(c.y + gauss())) };
  });
}

export const dist2 = (a: Pt, b: Pt) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const dist = (a: Pt, b: Pt) => Math.sqrt(dist2(a, b));

/** Forgy start: k different members picked at random become the first centroids. */
export function pickStart(points: readonly Pt[], k: number, seed: number): Pt[] {
  const r = rng(seed);
  const idx = points.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, Math.min(k, points.length)).map((i) => ({ ...points[i] }));
}

/** Each point joins its nearest centroid (the lower number wins a tie). */
export function assign(points: readonly Pt[], centroids: readonly Pt[]): number[] {
  return points.map((p) => {
    let best = 0;
    for (let c = 1; c < centroids.length; c++) if (dist2(p, centroids[c]) < dist2(p, centroids[best]) - 1e-12) best = c;
    return best;
  });
}

/** Each centroid moves to the average of its points. A centroid with no points stays put. */
export function update(points: readonly Pt[], labels: readonly number[], centroids: readonly Pt[]): Pt[] {
  return centroids.map((c, k) => {
    const mine = points.filter((_, i) => labels[i] === k);
    if (!mine.length) return { ...c };
    return { x: mine.reduce((s, p) => s + p.x, 0) / mine.length, y: mine.reduce((s, p) => s + p.y, 0) / mine.length };
  });
}

/** Within-cluster sum of squares: every point's squared distance to its own centroid, added up. */
export function wcss(points: readonly Pt[], labels: readonly number[], centroids: readonly Pt[]) {
  return points.reduce((s, p, i) => s + (labels[i] >= 0 ? dist2(p, centroids[labels[i]]) : 0), 0);
}

export type Phase = "ready" | "placed" | "assigned" | "moved" | "done";

export interface KState {
  phase: Phase;
  centroids: Pt[];
  /** Cluster of each point, or −1 before the first assignment. */
  labels: number[];
  /** Assign + move rounds completed or in progress. */
  round: number;
  /** Points that changed cluster in the last assignment. */
  changed: number;
  /** Where the centroids were before the last move, to show how far they went. */
  previous?: Pt[];
}

export const initial = (points: readonly Pt[]): KState => ({ phase: "ready", centroids: [], labels: points.map(() => -1), round: 0, changed: 0 });

/**
 * One step of k-means: place starting centroids → assign → move → assign → … → done.
 * It stops when an assignment changes nobody's cluster, because the centroids then can't move.
 */
export function step(points: readonly Pt[], s: KState, k: number, seed: number): KState {
  switch (s.phase) {
    case "ready":
      return { ...s, phase: "placed", centroids: pickStart(points, k, seed) };
    case "placed":
    case "moved": {
      const labels = assign(points, s.centroids);
      const changed = labels.filter((l, i) => l !== s.labels[i]).length;
      if (s.phase === "moved" && changed === 0) return { ...s, phase: "done", changed: 0 };
      return { ...s, phase: "assigned", labels, changed, round: s.round + 1 };
    }
    case "assigned":
      return { ...s, phase: "moved", previous: s.centroids, centroids: update(points, s.labels, s.centroids) };
    case "done":
      return s;
  }
}

/** Run to convergence from one starting seed. */
export function run(points: readonly Pt[], k: number, seed: number, maxSteps = 200): KState {
  let s = initial(points);
  for (let i = 0; i < maxSteps && s.phase !== "done"; i++) s = step(points, s, k, seed);
  return s;
}

/** The best (lowest WCSS) of several runs with different starts. */
export function bestRun(points: readonly Pt[], k: number, tries = 10, seed = 1): KState {
  let best: KState | null = null;
  for (let t = 0; t < tries; t++) {
    const s = run(points, k, seed + t);
    if (!best || wcss(points, s.labels, s.centroids) < wcss(points, best.labels, best.centroids)) best = s;
  }
  return best!;
}

/** Min–max normalisation: rescale each axis to run from 0 to 1, so both count equally in distances. */
export function normalise(points: readonly Pt[]): Pt[] {
  const range = (vs: number[]) => [Math.min(...vs), Math.max(...vs)];
  const [x0, x1] = range(points.map((p) => p.x)), [y0, y1] = range(points.map((p) => p.y));
  return points.map((p) => ({ x: x1 > x0 ? (p.x - x0) / (x1 - x0) : 0, y: y1 > y0 ? (p.y - y0) / (y1 - y0) : 0 }));
}

export const SPEND_MAX = 2000;

/**
 * Members for the normalisation lesson: x = visits per month, y = yearly spend in $.
 * Half are casual (1–8 visits), half regular (19–29 visits); spend is spread $200–$1,900 for both,
 * so the real groups differ by visits while the dollar numbers are far bigger.
 */
export function makeShoppers(n: number, seed: number): Pt[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const regular = i % 2 === 1;
    return { x: round1((regular ? 19 : 1) + r() * (regular ? 10 : 7)), y: Math.round((200 + r() * 1700) / 10) * 10 };
  });
}
