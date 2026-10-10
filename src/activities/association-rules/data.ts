import type { Transaction } from "./engine";

export interface ItemInfo {
  icon: string; // food emoji shown on the token, so colour is never the only signal
  color: string;
}

export const ITEMS: Record<string, ItemInfo> = {
  Bread: { icon: "🍞", color: "#b07521" },
  Butter: { icon: "🧈", color: "#e9c235" },
  Milk: { icon: "🥛", color: "#2f74cc" },
  Eggs: { icon: "🥚", color: "#d6652a" },
  Coffee: { icon: "☕", color: "#6e4a34" },
  Cookies: { icon: "🍪", color: "#8458c2" },
  Pasta: { icon: "🍝", color: "#c99a1e" },
  Sauce: { icon: "🍅", color: "#c2362b" },
  Parmesan: { icon: "🧀", color: "#7b8b2a" },
  Chips: { icon: "🍟", color: "#d4870f" },
  Soda: { icon: "🥤", color: "#167f86" },
  Wine: { icon: "🍷", color: "#7c2148" },
};

export const itemInfo = (name: string): ItemInfo => ITEMS[name] ?? { icon: name.slice(0, 2), color: "#5d6b63" };

/**
 * Corner Mart, Saturday morning: the 10-receipt starter set used in Missions 1–5.
 * Built so every lesson appears: Butter → Bread (strong), Bread → Butter (direction),
 * Coffee → Cookies (rare but strong), Bread → Milk (lift < 1), {Bread, Butter} → Milk (lift = 1),
 * and {Bread, Butter, Eggs} (pruned by Apriori at 30%).
 */
export const SATURDAY: Transaction[] = [
  ["Bread", "Butter", "Milk"],
  ["Bread", "Butter"],
  ["Milk", "Coffee", "Cookies"],
  ["Bread", "Butter", "Eggs"],
  ["Milk", "Eggs"],
  ["Bread", "Milk", "Butter", "Cookies"],
  ["Coffee", "Cookies"],
  ["Bread", "Eggs"],
  ["Milk", "Coffee"],
  ["Bread", "Butter", "Milk", "Eggs"],
];

export const SATURDAY_ITEMS = ["Bread", "Butter", "Milk", "Eggs", "Coffee", "Cookies"];

/**
 * Corner Mart, a full week sample of 30 receipts for Mission 6. At support ≥ 20%, confidence ≥ 60%
 * and lift > 1 it contains a small set of strong rules plus decoys: Milk is in most baskets
 * (high confidence, lift < 1) and Wine → Parmesan is strong but too rare.
 */
export const WEEK: Transaction[] = [
  ["Pasta", "Sauce", "Parmesan", "Milk"],
  ["Pasta", "Sauce", "Parmesan"],
  ["Pasta", "Sauce", "Parmesan", "Wine"],
  ["Pasta", "Sauce", "Parmesan", "Bread"],
  ["Pasta", "Sauce", "Parmesan", "Milk"],
  ["Pasta", "Sauce", "Parmesan", "Wine"],
  ["Pasta", "Sauce", "Milk"],
  ["Pasta", "Sauce", "Bread", "Milk"],
  ["Pasta", "Milk"],
  ["Chips", "Soda", "Milk"],
  ["Chips", "Soda"],
  ["Chips", "Soda", "Bread"],
  ["Chips", "Soda", "Milk"],
  ["Chips", "Soda", "Cookies"],
  ["Chips", "Soda"],
  ["Chips", "Soda", "Milk"],
  ["Chips", "Milk"],
  ["Coffee", "Cookies", "Milk"],
  ["Coffee", "Cookies"],
  ["Coffee", "Cookies", "Milk"],
  ["Coffee", "Cookies", "Bread"],
  ["Coffee", "Cookies", "Milk"],
  ["Coffee", "Cookies"],
  ["Coffee", "Milk"],
  ["Bread", "Milk", "Eggs"],
  ["Bread", "Milk"],
  ["Bread", "Milk", "Eggs"],
  ["Milk", "Eggs"],
  ["Soda", "Milk"],
  ["Wine", "Parmesan", "Milk"],
];
