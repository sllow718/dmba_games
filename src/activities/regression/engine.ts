import { rng } from "../../core/random";

/** A flat: x = floor area in square metres, y = price in $ thousands. */
export interface Flat {
  x: number;
  y: number;
}

export interface Line {
  /** Predicted price ($k) of a flat with 0 sqm. */
  intercept: number;
  /** Extra price ($k) for each extra square metre. */
  slope: number;
}

export const predict = (l: Line, x: number) => l.intercept + l.slope * x;

/** Ordinary least squares: the straight line with the smallest total of squared residuals. */
export function fit(points: readonly Flat[]): Line {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const sxy = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const sxx = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const slope = sxx ? sxy / sxx : 0;
  return { slope, intercept: my - slope * mx };
}

/** Actual minus predicted: positive means the flat sold for more than the line predicts. */
export const residuals = (l: Line, points: readonly Flat[]) => points.map((p) => p.y - predict(l, p.x));

/** Total of squared residuals: what least squares makes as small as possible. */
export const sse = (l: Line, points: readonly Flat[]) => residuals(l, points).reduce((s, r) => s + r * r, 0);

/** R²: the share of the variation in price that the line explains (0 to 1). */
export function r2(l: Line, points: readonly Flat[]) {
  const my = points.reduce((s, p) => s + p.y, 0) / points.length;
  const total = points.reduce((s, p) => s + (p.y - my) ** 2, 0);
  return total ? 1 - sse(l, points) / total : 0;
}

export const AREA = { min: 40, max: 150 };
export const PRICE = { min: 200, max: 900 };

/**
 * n flats from 50 to 140 sqm. The true pattern is $100k + $5k per sqm; `noise` is how far
 * prices wander from it ($k), so a small value gives a tidy market and a large one a noisy market.
 */
export function makeFlats(n: number, seed: number, noise: number): Flat[] {
  const r = rng(seed);
  const gauss = () => (r() + r() + r() + r() - 2) * 1.7;
  return Array.from({ length: n }, () => {
    const x = Math.round(50 + r() * 90);
    const y = Math.round(100 + 5 * x + gauss() * noise);
    return { x, y: Math.min(PRICE.max - 5, Math.max(PRICE.min + 5, y)) };
  });
}
