export type Outcome = "Repaid" | "Default";
export type Job = "Salaried" | "Self-employed" | "Student";

export interface Applicant {
  name: string;
  /** Yearly income in $k. */
  income: number;
  job: Job;
  credit: "Good" | "Poor";
  collateral: "Yes" | "No";
  outcome: Outcome;
}

const a = (name: string, income: number, job: Job, credit: "Good" | "Poor", collateral: "Yes" | "No", outcome: Outcome): Applicant =>
  ({ name, income, job, credit, collateral, outcome });

/**
 * Neighbourhood Bank: 12 past loans the tree is built from. Built so every lesson appears:
 * 6 repaid / 6 defaulted (Gini 0.5, entropy 1), Credit is the best first question (weighted Gini 0.278),
 * Income ≤ $30k makes the good-credit group pure, and Grace (poor credit, high income, repaid) tempts
 * an extra split at Income ≤ $75k that does not hold up on new applicants.
 */
export const TRAIN: Applicant[] = [
  a("Aisha", 58, "Salaried", "Good", "Yes", "Repaid"),
  a("Ben", 42, "Self-employed", "Good", "No", "Repaid"),
  a("Chloe", 75, "Salaried", "Good", "No", "Repaid"),
  a("Dev", 22, "Student", "Good", "No", "Default"),
  a("Ella", 38, "Student", "Good", "Yes", "Repaid"),
  a("Farid", 66, "Self-employed", "Good", "Yes", "Repaid"),
  a("Grace", 84, "Salaried", "Poor", "Yes", "Repaid"),
  a("Hari", 31, "Student", "Poor", "No", "Default"),
  a("Ivy", 66, "Salaried", "Poor", "Yes", "Default"),
  a("Jun", 47, "Self-employed", "Poor", "No", "Default"),
  a("Kumar", 28, "Self-employed", "Poor", "Yes", "Default"),
  a("Lina", 52, "Salaried", "Poor", "No", "Default"),
];

/**
 * 8 new applicants whose outcomes the tree never saw. The pruned tree gets 7 right, the full tree
 * only 5 (it lends to Oscar and Priya, who default), and the credit-only tree 6.
 */
export const TEST: Applicant[] = [
  a("Mei", 55, "Salaried", "Good", "Yes", "Repaid"),
  a("Nikhil", 26, "Student", "Good", "No", "Default"),
  a("Omar", 70, "Self-employed", "Good", "No", "Repaid"),
  a("Pooja", 41, "Salaried", "Good", "No", "Repaid"),
  a("Oscar", 82, "Self-employed", "Poor", "Yes", "Default"),
  a("Priya", 90, "Salaried", "Poor", "No", "Default"),
  a("Quinn", 35, "Student", "Poor", "No", "Default"),
  a("Rosa", 48, "Salaried", "Poor", "Yes", "Repaid"),
];
