import { describe, expect, it } from "vitest";
import { pointsFor, starsFor } from "./progress";

describe("scoring", () => {
  it("awards 3 / 2 / 1 points", () => {
    expect([0, 1, 2, 5].map(pointsFor)).toEqual([3, 2, 1, 1]);
  });
  it("turns points into stars", () => {
    expect(starsFor(9, 9)).toBe(3);
    expect(starsFor(8, 9)).toBe(2); // 89%
    expect(starsFor(6, 9)).toBe(2); // 67%
    expect(starsFor(5, 9)).toBe(1);
    expect(starsFor(11, 12)).toBe(3); // 92%
  });
});
