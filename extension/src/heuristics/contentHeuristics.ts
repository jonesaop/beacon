// CONTENT HEURISTICS — SKELETON
//
// Analyses the text content of a page (title, meta description, body text,
// and links) and returns a HeuristicResult.
//
// This is a skeleton: it always returns score 0 / verdict "safe" so the
// pipeline can be verified end-to-end before real detection logic is added.
// CONTRACT (do not change the function signature):
//   Input:  ExtractedPageData  — the full page data extracted by content.ts
//   Output: HeuristicResult    — score 0-10, verdict, explanation, findings

import type { HeuristicResult, ExtractedPageData } from "../types/heuristics";

export function analyzeContent(pageData: ExtractedPageData): HeuristicResult {
    // Suppress unused-variable warning while the skeleton is in place.
    void pageData;

    return {
        score: 0,
        verdict: "safe",
        explanation: "Content analysis not yet implemented.",
        findings: [],
        source: "content",
    };
}
