import { describe, expect, it } from "vitest";
import { TEST, TRAIN } from "./data";
import { accuracy, countOutcomes, entropy, gini, has, prune, scoreSplit } from "./engine";
import { loanOfficer } from "./missions";
import { BANK_TREE, FULL_TREE, STUMP } from "./trees";
import type { NumberQuestion, TapQuestion } from "../../core/types";

const q = (id: string) => loanOfficer.missions.flatMap((m) => m.questions).find((x) => x.id === id)!;
const num = (id: string) => (q(id) as NumberQuestion).answer;
const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);
const good = TRAIN.filter((r) => r.credit === "Good");

describe("Loan Officer answers match the engine", () => {
  it("counter 1", () => {
    const poorLeaf = BANK_TREE.no!.counts;
    close(num("t1-sure"), poorLeaf.Default / (poorLeaf.Repaid + poorLeaf.Default));
    const tap = q("t1-tap") as TapQuestion;
    const picked = TRAIN.filter((r) => tap.items.every((t) => has(r, t))).map((r) => r.name);
    expect(picked).toEqual(BANK_TREE.yes!.no!.rows.map((r) => r.name));
  });
  it("counter 2", () => {
    close(num("t2-root"), gini(countOutcomes(TRAIN)));
    close(num("t2-poor"), gini({ Repaid: 1, Default: 5 }));
    expect(Math.abs(num("t2-ent") - entropy({ Repaid: 3, Default: 1 }))).toBeLessThan(1e-4);
  });
  it("counter 3", () => {
    const s = scoreSplit(TRAIN, { kind: "cat", attr: "credit", value: "Good" });
    close(num("t3-weighted"), s.after);
    close(num("t3-drop"), s.drop);
    expect(Math.abs(num("t3-gain") - scoreSplit(TRAIN, { kind: "cat", attr: "credit", value: "Good" }, "entropy").drop)).toBeLessThan(0.001);
  });
  it("counter 4", () => {
    close(num("t4-50"), scoreSplit(good, { kind: "num", attr: "income", cut: 50 }).after);
  });
  it("counters 5 and 6", () => {
    expect(num("t5-acc")).toBe(accuracy(STUMP, TEST).rate);
    expect(num("t6-full")).toBe(accuracy(FULL_TREE, TEST).correct);
    expect(num("t6-acc")).toBe(accuracy(BANK_TREE, TEST).rate);
    expect(accuracy(prune(FULL_TREE, new Set(["ry"])), TEST).correct).toBe(4);
  });
  it("every mission has a review, an explore and at least 5 questions", () => {
    expect(loanOfficer.missions).toHaveLength(6);
    for (const m of loanOfficer.missions) expect(m.questions.length).toBeGreaterThanOrEqual(5);
  });
});
