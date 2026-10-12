import type { Pt } from "./engine";

export interface Member extends Pt {
  /** 1-based member number shown on the chart. */
  id: number;
  /** Segment the member belongs to after k-means with k = 3: 0, 1 or 2. */
  cluster: number;
}

export const SEGMENT_NAMES = ["Occasional big spenders", "Regular light spenders", "Regular big spenders"];

const m = (id: number, x: number, y: number, cluster: number): Member => ({ id, x, y, cluster });

/**
 * Gym & Juice: 12 members, x = visits per month, y = spend per visit ($).
 * Three tidy groups whose averages are whole numbers: (5, 24), (23, 5) and (23, 25).
 */
export const MEMBERS: Member[] = [
  m(1, 4, 24, 0), m(2, 22, 6, 1), m(3, 25, 22, 2),
  m(4, 6, 27, 0), m(5, 25, 8, 1), m(6, 26, 28, 2),
  m(7, 3, 21, 0), m(8, 20, 4, 1), m(9, 20, 27, 2),
  m(10, 7, 24, 0), m(11, 25, 2, 1), m(12, 21, 23, 2),
];
