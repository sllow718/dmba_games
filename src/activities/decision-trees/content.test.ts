import { describe, expect, it } from "vitest";
import { TRAIN } from "./data";
import { countOutcomes, entropy, gini, has, leaves, round } from "./engine";
import { loanOfficer } from "./missions";
import { BANK_TREE } from "./trees";
import type { NumberQuestion, TapQuestion } from "../../core/types";

const q = (id: string) => loanOfficer.missions.flatMap((m) => m.questions).find((x) => x.id === id)!;

describe("Loan Officer content matches the engine", () => {
  it("counter 1", () => {
    const poorLeaf = BANK_TREE.no!.counts;
    expect(Math.abs((q("t1-sure") as NumberQuestion).answer - poorLeaf.Default / (poorLeaf.Repaid + poorLeaf.Default))).toBeLessThan(1e-9);
    const tap = q("t1-tap") as TapQuestion;
    const picked = TRAIN.filter((r) => tap.items.every((t) => has(r, t))).map((r) => r.name);
    expect(picked).toEqual(BANK_TREE.yes!.no!.rows.map((r) => r.name));
  });
  it("counter 2's impurity scale", () => {
    const row = (r: number, d: number) => [round(gini({ Repaid: r, Default: d }), 2), round(entropy({ Repaid: r, Default: d }), 2)];
    expect([row(6, 0), row(5, 1), row(4, 2), row(3, 3)]).toEqual([[0, 0], [0.28, 0.65], [0.44, 0.92], [0.5, 1]]);
    expect(countOutcomes(TRAIN)).toEqual({ Repaid: 6, Default: 6 });
  });
  it("the poor-credit leaf is the only impure leaf in Mr Lim's tree", () => {
    expect(leaves(BANK_TREE).map((l) => round(gini(l.counts), 2))).toEqual([0, 0, 0.28]);
  });
  it("has two counters with at least 5 questions each", () => {
    expect(loanOfficer.missions.map((m) => m.n)).toEqual([1, 2]);
    for (const m of loanOfficer.missions) expect(m.questions.length).toBeGreaterThanOrEqual(5);
  });
});
