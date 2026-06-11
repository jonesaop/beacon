import type { Verdict } from "./heuristics";

export interface AnalyzeResponse {
  risk_score: number;  // 0–10, same scale as HeuristicResult.score
  label: Verdict;      // "safe" | "uncertain" | "scam"
  action: "allow" | "warn" | "block";
  reason: string;
}
