import type { AnyActivity } from "../core/types";
import { basketDetective } from "./association-rules/missions";
import { loanOfficer } from "./decision-trees/missions";
import { customerTribes } from "./kmeans/missions";

export const ACTIVITIES: AnyActivity[] = [basketDetective, customerTribes, loanOfficer];

export const findActivity = (id: string) => ACTIVITIES.find((a) => a.id === id);
