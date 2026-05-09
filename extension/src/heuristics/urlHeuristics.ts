// URL HEURISTICS — SKELETON
//
// Analyses the URL of the current page (the string itself, not the page content)
// and returns a HeuristicResult.
//
// This is a skeleton: it always returns score 0 / verdict "safe" so the
// pipeline can be verified end-to-end before real detection logic is added.
//
// CONTRACT (do not change the function signature):
//   Input:  url string          — the full URL of the current page
//   Output: HeuristicResult     — score 0-10, verdict, explanation, findings

import type { HeuristicResult } from "../types/heuristics";

export function analyzeUrl(url: string): HeuristicResult {
    // Suppress unused-variable warning while the skeleton is in place.
    void url;

    return {
        score: 0,
        verdict: "safe",
        explanation: "URL analysis not yet implemented.",
        findings: [],
        source: "url",
    };
}
