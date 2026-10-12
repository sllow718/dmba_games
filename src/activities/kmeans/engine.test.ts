import { describe, expect, it } from "vitest";
import { MEMBERS } from "./data";
import { assign, bestRun, initial, makeData, makeShoppers, normalise, pickStart, run, step, update, wcss } from "./engine";

describe("k-means steps", () => {
  const pts = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 10, y: 10 }, { x: 12, y: 10 }];
  it("assigns each point to its nearest centroid", () => {
    expect(assign(pts, [{ x: 1, y: 1 }, { x: 11, y: 11 }])).toEqual([0, 0, 1, 1]);
  });
  it("moves each centroid to the average of its points, leaving an empty one where it was", () => {
    expect(update(pts, [0, 0, 1, 1], [{ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 3, y: 3 }])).toEqual([{ x: 1, y: 0 }, { x: 11, y: 10 }, { x: 3, y: 3 }]);
  });
  it("adds up squared distances to each point's centroid", () => {
    expect(wcss(pts, [0, 0, 1, 1], [{ x: 1, y: 0 }, { x: 11, y: 10 }])).toBe(4);
  });
  it("walks ready → placed → assigned → moved → … → done", () => {
    let s = initial(MEMBERS);
    const phases = [s.phase];
    for (let i = 0; i < 30 && s.phase !== "done"; i++) { s = step(MEMBERS, s, 3, 5); phases.push(s.phase); }
    expect(phases.slice(0, 4)).toEqual(["ready", "placed", "assigned", "moved"]);
    expect(phases.at(-1)).toBe("done");
    expect(phases.at(-2)).toBe("moved");
  });
  it("picks k different starting points from the data", () => {
    const c = pickStart(MEMBERS, 3, 1);
    expect(new Set(c.map((p) => `${p.x},${p.y}`)).size).toBe(3);
    expect(c.every((p) => MEMBERS.some((m) => m.x === p.x && m.y === p.y))).toBe(true);
  });
  it("can get stuck from a bad start", () => {
    const scores = [1, 2, 3].map((seed) => Math.round(wcss(MEMBERS, run(MEMBERS, 3, seed).labels, run(MEMBERS, 3, seed).centroids)));
    expect(Math.max(...scores)).toBeGreaterThan(Math.min(...scores));
  });
});

describe("normalising", () => {
  it("rescales each axis to 0–1", () => {
    expect(normalise([{ x: 2, y: 100 }, { x: 4, y: 300 }, { x: 3, y: 200 }])).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0.5, y: 0.5 }]);
  });
  it("on generated members, raw k-means splits by spend and normalised k-means by visits", () => {
    const byType = (ls: number[]) => ls.every((l, i) => l === ls[i % 2]) && ls[0] !== ls[1];
    for (const seed of [1, 2, 3, 4, 5]) {
      const d = makeShoppers(40, seed);
      expect(byType(bestRun(d, 2, 8).labels)).toBe(false);
      expect(byType(bestRun(normalise(d), 2, 8).labels)).toBe(true);
    }
  });
});

describe("generated data", () => {
  it("is repeatable from its seed and stays on the chart", () => {
    expect(makeData(30, 7)).toEqual(makeData(30, 7));
    expect(makeData(150, 3).every((p) => p.x > 0 && p.x < 30 && p.y > 0 && p.y < 30)).toBe(true);
  });
  it("has its elbow at k = 3", () => {
    for (const seed of [7, 8, 9]) {
      const d = makeData(60, seed);
      const w = [1, 2, 3, 4].map((k) => { const s = bestRun(d, k, 10); return wcss(d, s.labels, s.centroids); });
      expect(w[1] - w[2]).toBeGreaterThan(3 * (w[2] - w[3]));
    }
  });
});
