// POPUP CONTROLLER
//
// This file runs whenever the user clicks the Beacon icon in the toolbar.
// It communicates only with the background service worker — never directly
// with the page — because the popup cannot touch the page's DOM.
//
// Flow:
//   1. Popup opens → ask background for the stored result for this tab
//   2. Background responds with { result, pageData } or { error: "not found" }
//   3. Display the result (score, verdict, explanation, findings list)
//   4. Enable the "Check this page" button only if score >= 4

import type { HeuristicResult } from "../types/heuristics";

// –– Element references ––
// document.getElementById returns HTMLElement | null.
// We cast each one to the specific element type we know it is so TypeScript
// lets us use element-specific properties (e.g. .disabled on a button).

const scanButton      = document.getElementById("scan-button")      as HTMLButtonElement;
const resultsDiv      = document.getElementById("results")          as HTMLDivElement;
const scoreCircle     = document.getElementById("score-circle")     as HTMLDivElement;
const scoreNumber     = document.getElementById("score-number")     as HTMLSpanElement;
const verdictText     = document.getElementById("verdict-text")     as HTMLParagraphElement;
const verdictUrl      = document.getElementById("verdict-url")      as HTMLParagraphElement;
const explanationText = document.getElementById("explanation-text") as HTMLParagraphElement;
const findingsSection = document.getElementById("findings-section") as HTMLDivElement;
const findingsList    = document.getElementById("findings-list")    as HTMLUListElement;
const errorDiv        = document.getElementById("error")            as HTMLDivElement;
const errorMessage    = document.getElementById("error-message")    as HTMLParagraphElement;

// –– Helper: score → CSS class suffix ––
// Returns "safe", "suspicious", or "scam" based on the score.
// These strings are appended to "score-" and "verdict-" to pick the right
// colour classes defined in popup.css.

function getVerdictLevel(score: number): string {
    if (score <= 3) return "safe";
    if (score <= 6) return "suspicious";
    return "scam";
}

// –– Helper: extract readable domain from a full URL ––

function getDomain(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

// –– Show error state ––
// Displays an error message in the popup.

function showError(message: string): void {
    resultsDiv.classList.add("hidden");
    errorDiv.classList.remove("hidden");
    errorMessage.textContent = message;
}

// –– Show heuristic result ––
// Takes the HeuristicResult from the background and updates every UI element.

function showHeuristicResult(result: HeuristicResult, url: string): void {
    errorDiv.classList.add("hidden");
    resultsDiv.classList.remove("hidden");

    // Score circle: update number and background colour.
    scoreNumber.textContent = result.score.toString();
    const level = getVerdictLevel(result.score);
    scoreCircle.classList.remove("score-safe", "score-suspicious", "score-scam");
    scoreCircle.classList.add("score-" + level);

    // Verdict text: capitalise first letter ("safe" → "Safe") and apply colour.
    verdictText.textContent =
        result.verdict.charAt(0).toUpperCase() + result.verdict.slice(1);
    verdictText.classList.remove("verdict-safe", "verdict-suspicious", "verdict-scam");
    verdictText.classList.add("verdict-" + level);

    // Show the domain of the page being analysed.
    verdictUrl.textContent = getDomain(url);

    // Plain-language explanation.
    explanationText.textContent = result.explanation;

    // Findings list: show only if there is something to report.
    if (result.findings.length > 0) {
        findingsSection.classList.remove("hidden");
        findingsList.innerHTML = "";
        for (const finding of result.findings) {
            const li = document.createElement("li");
            li.textContent = finding;
            findingsList.appendChild(li);
        }
    } else {
        findingsSection.classList.add("hidden");
    }

    // Enable "Check this page" (Tier 2) only when heuristics flagged the page.
    // score < 4 means verdict is "safe" — no need for deeper analysis.
    scanButton.disabled = result.score < 4;
}

// –– Load result on popup open ––
// DOMContentLoaded fires as soon as the popup HTML is parsed.
// We immediately ask the background for the stored result for the active tab.

document.addEventListener("DOMContentLoaded", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];

        if (!tab?.id) {
            showError("Could not identify the current tab.");
            return;
        }

        // Ask the background service worker for the stored analysis result.
        // The background responds with { result, pageData } or { error: "..." }.
        chrome.runtime.sendMessage(
            { action: "getResult", tabId: tab.id },
            (response: { result?: HeuristicResult; error?: string }) => {
                // chrome.runtime.lastError is set if the background didn't respond
                // (e.g. it was just installed and hasn't run yet).
                if (chrome.runtime.lastError) {
                    showError("Beacon is starting up. Reload the page and try again.");
                    return;
                }

                if (response?.error || !response?.result) {
                    showError("Page not analysed yet. Refresh the page and try again.");
                    return;
                }

                showHeuristicResult(response.result, tab.url ?? "");
            }
        );
    });
});

// –– "Check this page" button — Tier 2 (not implemented yet) ––
// This button is only enabled when heuristics produce a score >= 4.
// Clicking it will eventually call the API for a deeper AI analysis.

scanButton.addEventListener("click", () => {
    // TODO (Tier 2): send page text to POST /v1/check and show the AI result
    alert("Deep analysis coming soon!");
});
