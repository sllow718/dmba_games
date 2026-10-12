import { describe, expect, it } from "vitest";
import { fit, makeFlats, predict, r2, residuals, sse } from "./engine";

describe("least squares", () => {
  it("recovers an exact straight line", () => {
    const l = fit([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }]);
    expect(l.slope).toBeCloseTo(2);
    expect(l.intercept).toBeCloseTo(1);
    expect(r2(l, [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }])).toBeCloseTo(1);
  });
  it("residuals are actual minus predicted and add to zero for the best line", () => {
    const pts = makeFlats(30, 1, 40);
    const l = fit(pts);
    expect(residuals(l, pts).reduce((s, r) => s + r, 0)).toBeCloseTo(0, 6);
    expect(residuals({ intercept: 0, slope: 1 }, [{ x: 10, y: 15 }])).toEqual([5]);
  });
  it("no other line has a smaller total of squared residuals", () => {
    const pts = makeFlats(30, 2, 40);
    const l = fit(pts);
    for (const [di, ds] of [[10, 0], [-10, 0], [0, 0.2], [0, -0.2], [25, -0.3]]) {
      expect(sse({ intercept: l.intercept + di, slope: l.slope + ds }, pts)).toBeGreaterThan(sse(l, pts));
    }
  });
});

describe("generated markets", () => {
  it("follow about $5k per sqm, tidy fitting much better than noisy", () => {
    const tidy = makeFlats(40, 3, 20), noisy = makeFlats(40, 5, 130);
    const lt = fit(tidy), ln = fit(noisy);
    expect(lt.slope).toBeGreaterThan(4);
    expect(lt.slope).toBeLessThan(6);
    expect(r2(lt, tidy)).toBeGreaterThan(0.9);
    expect(r2(ln, noisy)).toBeLessThan(0.7);
    expect(predict(lt, 90)).toBeGreaterThan(500);
  });
  it("is repeatable from its seed", () => {
    expect(makeFlats(20, 9, 30)).toEqual(makeFlats(20, 9, 30));
  });
});
