import type { AnyActivity } from "../core/types";
import { basketDetective } from "./association-rules/missions";
import { loanOfficer } from "./decision-trees/missions";
import { customerTribes } from "./kmeans/missions";
import { pricePredictor } from "./regression/missions";

export const ACTIVITIES: AnyActivity[] = [basketDetective, customerTribes, pricePredictor, loanOfficer];

/** A topic that is listed on the home page but can't be opened yet. */
export interface UpcomingTopic {
  upcoming: true;
  id: string;
  topic: string;
  summary: string;
}

/** Home page order: open topics, with work-in-progress ones slotted in where they will go. */
export const HOME: (AnyActivity | UpcomingTopic)[] = [
  basketDetective,
  customerTribes,
  pricePredictor,
  { upcoming: true, id: "logistic-regression", topic: "Logistic regression", summary: "Predict a yes/no outcome, like whether a customer will buy, as a probability." },
  loanOfficer,
];

export const isUpcoming = (t: AnyActivity | UpcomingTopic): t is UpcomingTopic => "upcoming" in t;

export const findActivity = (id: string) => ACTIVITIES.find((a) => a.id === id);
