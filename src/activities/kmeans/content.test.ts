import { describe, expect, it } from "vitest";
import { MEMBERS } from "./data";
import { bestRun, wcss } from "./engine";
import { MEMBER_WCSS, customerTribes } from "./missions";
import type { NumberQuestion } from "../../core/types";

describe("Customer Tribes content matches the engine", () => {
  it("the members' clusters are what k-means finds with k = 3", () => {
    const s = bestRun(MEMBERS, 3, 20);
    const byCluster = new Map<number, number>();
    MEMBERS.forEach((m, i) => {
      if (!byCluster.has(m.cluster)) byCluster.set(m.cluster, s.labels[i]);
      expect(s.labels[i]).toBe(byCluster.get(m.cluster));
    });
  });
  it("centroids in the lesson are the cluster averages", () => {
    const avg = (c: number) => {
      const ms = MEMBERS.filter((m) => m.cluster === c);
      return [ms.reduce((s, m) => s + m.x, 0) / ms.length, ms.reduce((s, m) => s + m.y, 0) / ms.length];
    };
    expect([avg(0), avg(1), avg(2)]).toEqual([[5, 24], [23, 5], [23, 25]]);
    const q = customerTribes.missions[0].questions.find((x) => x.id === "k1-mean") as NumberQuestion;
    expect(q.answer).toBe(avg(0)[0]);
  });
  it("the elbow chart shows the best WCSS for each k", () => {
    for (const [k, v] of Object.entries(MEMBER_WCSS)) {
      const s = bestRun(MEMBERS, Number(k), 30);
      expect(Math.round(wcss(MEMBERS, s.labels, s.centroids))).toBe(v);
    }
  });
});
