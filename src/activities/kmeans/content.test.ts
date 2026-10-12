import { describe, expect, it } from "vitest";
import { MEMBERS, SHOPPERS } from "./data";
import { bestRun, normalise } from "./engine";
import { customerTribes } from "./missions";

/** Two labellings describe the same grouping, whatever the cluster numbers are. */
const samePartition = (a: readonly number[], b: readonly number[]) => a.every((x, i) => a.every((y, j) => (x === y) === (b[i] === b[j])));

describe("Customer Tribes content matches the engine", () => {
  it("mission 1's members are the clusters k-means finds with k = 3", () => {
    expect(samePartition(bestRun(MEMBERS, 3, 20).labels, MEMBERS.map((m) => m.cluster))).toBe(true);
  });
  it("mission 1 has no calculation questions", () => {
    expect(customerTribes.missions[0].questions.some((q) => q.type === "num")).toBe(false);
  });
  it("on raw numbers k-means splits the 12 members by spend", () => {
    const raw = SHOPPERS.map((s) => ({ x: s.visits, y: s.spend }));
    expect(samePartition(bestRun(raw, 2, 20).labels, SHOPPERS.map((s) => s.raw))).toBe(true);
    for (const c of [0, 1]) expect(new Set(SHOPPERS.filter((s) => s.raw === c).map((s) => s.type)).size).toBe(2);
  });
  it("after normalising k-means splits casual from regular", () => {
    const raw = SHOPPERS.map((s) => ({ x: s.visits, y: s.spend }));
    expect(samePartition(bestRun(normalise(raw), 2, 20).labels, SHOPPERS.map((s) => s.norm))).toBe(true);
    expect(samePartition(SHOPPERS.map((s) => s.norm), SHOPPERS.map((s) => (s.type === "Casual" ? 0 : 1)))).toBe(true);
  });
  it("the review's ranges match the data", () => {
    const v = SHOPPERS.map((s) => s.visits), d = SHOPPERS.map((s) => s.spend);
    expect([Math.min(...v), Math.max(...v), Math.min(...d), Math.max(...d)]).toEqual([2, 27, 380, 1500]);
  });
});
