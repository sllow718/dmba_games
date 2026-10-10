import type { ActivityDef } from "../core/types";
import { basketDetective } from "./association-rules/missions";

export const ACTIVITIES: ActivityDef[] = [basketDetective];

/** Shops still to open on the street; shown closed on the hub. */
export const COMING_SOON = [
  { shop: "Gym & Juice", title: "Customer Tribes", topic: "k-means clustering" },
  { shop: "Neighbourhood Bank", title: "Loan Officer", topic: "Classification trees" },
  { shop: "Property Agent", title: "Price Predictor", topic: "Linear regression" },
];

export const findActivity = (id: string) => ACTIVITIES.find((a) => a.id === id);
