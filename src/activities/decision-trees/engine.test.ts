import { describe, expect, it } from "vitest";
import { TEST, TRAIN } from "./data";
import {
  accuracy, bestSplit, classify, confusion, countOutcomes, cutPoints, depthOf, entropy, gini, grow, has, leaves, prune, round, rules,
  scoreSplit, split, testLabel,
} from "./engine";
import type { Test } from "./engine";

const credit: Test = { kind: "cat", attr: "credit", value: "Good" };
const collateral: Test = { kind: "cat", attr: "collateral", value: "Yes" };
const r3 = (x: number) => round(x, 3);
const good = TRAIN.filter((r) => r.credit === "Good");
const poor = TRAIN.filter((r) => r.credit === "Poor");

describe("impurity", () => {
  it("is zero for a pure group and highest for a 50/50 group", () => {
    expect(gini({ Repaid: 4, Default: 0 })).toBe(0);
    expect(entropy({ Repaid: 4, Default: 0 })).toBe(0);
    expect(gini({ Repaid: 6, Default: 6 })).toBe(0.5);
    expect(entropy({ Repaid: 6, Default: 6 })).toBe(1);
  });
  it("matches hand calculations", () => {
    expect(r3(gini({ Repaid: 5, Default: 1 }))).toBe(0.278);
    expect(r3(entropy({ Repaid: 5, Default: 1 }))).toBe(0.65);
    expect(r3(gini({ Repaid: 3, Default: 1 }))).toBe(0.375);
    expect(r3(entropy({ Repaid: 3, Default: 1 }))).toBe(0.811);
    expect(r3(gini({ Repaid: 4, Default: 2 }))).toBe(0.444);
    expect(r3(entropy({ Repaid: 4, Default: 2 }))).toBe(0.918);
  });
  it("the training set is 6 repaid and 6 defaulted", () => {
    expect(countOutcomes(TRAIN)).toEqual({ Repaid: 6, Default: 6 });
  });
});

describe("choosing the root split", () => {
  it("credit splits 5:1 and 1:5", () => {
    const s = scoreSplit(TRAIN, credit);
    expect(s.yes).toEqual({ Repaid: 5, Default: 1 });
    expect(s.no).toEqual({ Repaid: 1, Default: 5 });
    expect(r3(s.after)).toBe(0.278);
    expect(r3(s.drop)).toBe(0.222);
    expect(r3(scoreSplit(TRAIN, credit, "entropy").drop)).toBe(0.35);
  });
  it("collateral is weaker", () => {
    const s = scoreSplit(TRAIN, collateral);
    expect(s.yes).toEqual({ Repaid: 4, Default: 2 });
    expect(r3(s.after)).toBe(0.444);
    expect(r3(scoreSplit(TRAIN, collateral, "entropy").drop)).toBe(0.082);
  });
  it("credit wins on both Gini and entropy, beating every job and income question", () => {
    expect(testLabel(bestSplit(TRAIN, "gini")!.test)).toBe("Credit = Good?");
    expect(testLabel(bestSplit(TRAIN, "entropy")!.test)).toBe("Credit = Good?");
    const income = scoreSplit(TRAIN, { kind: "num", attr: "income", cut: 34.5 });
    expect(r3(income.after)).toBe(0.333);
  });
});

describe("income cut points", () => {
  it("are midpoints between neighbouring incomes", () => {
    expect(cutPoints(good)).toEqual([30, 40, 50, 62, 70.5]);
  });
  it("Income ≤ 30 makes the good-credit group pure; ≤ 40 does not", () => {
    expect(scoreSplit(good, { kind: "num", attr: "income", cut: 30 }).after).toBe(0);
    expect(r3(scoreSplit(good, { kind: "num", attr: "income", cut: 40 }).after)).toBe(0.167);
    expect(testLabel(bestSplit(good)!.test)).toBe("Income ≤ $30k?");
  });
  it("Income ≤ 75 isolates Grace in the poor-credit group", () => {
    expect(testLabel(bestSplit(poor)!.test)).toBe("Income ≤ $75k?");
    expect(split(poor, { kind: "num", attr: "income", cut: 75 }).no.map((r) => r.name)).toEqual(["Grace"]);
  });
});

describe("growing, pruning and testing", () => {
  const full = grow(TRAIN);
  const pruned = prune(full, new Set(["rn"]));
  const stump = grow(TRAIN, { maxDepth: 1 });

  it("the full tree has pure leaves and fits the training set perfectly", () => {
    expect(depthOf(full)).toBe(2);
    expect(leaves(full).map((l) => l.counts)).toEqual([
      { Repaid: 0, Default: 1 }, { Repaid: 5, Default: 0 }, { Repaid: 0, Default: 5 }, { Repaid: 1, Default: 0 },
    ]);
    expect(accuracy(full, TRAIN).correct).toBe(12);
  });
  it("max depth 1 stops at the credit split", () => {
    expect(depthOf(stump)).toBe(1);
  });
  it("min leaf size 2 refuses to split Dev off on his own", () => {
    expect(testLabel(bestSplit(good, "gini", 2)!.test)).not.toBe("Income ≤ $30k?");
  });
  it("on new applicants the pruned tree does best", () => {
    expect(accuracy(stump, TEST).correct).toBe(6);
    expect(accuracy(pruned, TEST).correct).toBe(7);
    expect(accuracy(full, TEST).correct).toBe(5);
    expect(accuracy(stump, TRAIN).correct).toBe(10);
    expect(accuracy(pruned, TRAIN).correct).toBe(11);
  });
  it("confusion matrices", () => {
    expect(confusion(pruned, TEST)).toEqual({ caught: 4, missed: 0, falseAlarm: 1, cleared: 3 });
    expect(confusion(full, TEST)).toEqual({ caught: 2, missed: 2, falseAlarm: 1, cleared: 3 });
  });
  it("classifies along a path and reads back as rules", () => {
    const nikhil = TEST.find((r) => r.name === "Nikhil")!;
    expect(classify(pruned, nikhil)).toMatchObject({ path: ["r", "ry", "ryy"], leaf: { predict: "Default" } });
    expect(rules(pruned).map((r) => `${r.conditions.join(" AND ")} → ${r.predict}`)).toEqual([
      "Credit = Good AND Income ≤ $30k → Default",
      "Credit = Good AND Income > $30k → Repaid",
      "Credit = Poor → Default",
    ]);
  });
});

describe("highlight tags", () => {
  it("match conditions on applicants", () => {
    const dev = TRAIN[3];
    expect(has(dev, "credit=Good")).toBe(true);
    expect(has(dev, "income<=30")).toBe(true);
    expect(has(dev, "income>30")).toBe(false);
    expect(has(dev, "job!=Student")).toBe(false);
    expect(has(dev, "outcome=Default")).toBe(true);
  });
});
