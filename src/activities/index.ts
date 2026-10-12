import type { AnyActivity } from "../core/types";
import { basketDetective } from "./association-rules/missions";
import { loanOfficer } from "./decision-trees/missions";
import { customerTribes } from "./kmeans/missions";
import { pricePredictor } from "./regression/missions";

export const ACTIVITIES: AnyActivity[] = [basketDetective, customerTribes, loanOfficer, pricePredictor];

export const findActivity = (id: string) => ACTIVITIES.find((a) => a.id === id);
