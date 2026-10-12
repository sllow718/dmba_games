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

export interface Shopper {
  id: number;
  /** Visits per month. */
  visits: number;
  /** Yearly spend in $. */
  spend: number;
  type: "Casual" | "Regular";
  /** Cluster from k-means (k = 2) on the raw numbers: 0 = lower spend, 1 = higher spend. */
  raw: number;
  /** Cluster from k-means (k = 2) after normalising: 0 = fewer visits, 1 = more visits. */
  norm: number;
}

const s = (id: number, visits: number, spend: number, type: Shopper["type"], raw: number, norm: number): Shopper => ({ id, visits, spend, type, raw, norm });

/**
 * 12 members for the normalisation lesson. Casual members visit 2–6 times a month, regulars 21–27,
 * and both spend anywhere from $380 to $1,500 a year. On the raw numbers k-means splits them by spend;
 * after normalising it splits casual from regular (checked in content.test.ts).
 */
export const SHOPPERS: Shopper[] = [
  s(1, 3, 450, "Casual", 0, 0), s(2, 24, 520, "Regular", 0, 1), s(3, 5, 1500, "Casual", 1, 0),
  s(4, 22, 1400, "Regular", 1, 1), s(5, 2, 900, "Casual", 0, 0), s(6, 27, 850, "Regular", 0, 1),
  s(7, 6, 1300, "Casual", 1, 0), s(8, 21, 1250, "Regular", 1, 1), s(9, 4, 600, "Casual", 0, 0),
  s(10, 25, 380, "Regular", 0, 1), s(11, 3, 1100, "Casual", 1, 0), s(12, 26, 1050, "Regular", 1, 1),
];
