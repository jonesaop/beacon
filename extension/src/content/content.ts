// CONTENT SCRIPT
//
// This file runs automatically on every webpage the user visits.
// Chrome injects it based on the rule in manifest.json.
//
// Responsibilities:
//   (1) Extract structured data from the page (URL, title, text, links)
//   (2) Run both heuristics (URL + content) and combine the results
//   (3) Send the combined result to the background service worker for storage
//   (4) Listen for "scanPage" messages from the popup (kept for debugging)
//
// Why can we use imports here?
//   Vite bundles this file before it is loaded by Chrome. At build time,
//   Vite finds all import statements, resolves them, and inlines the imported
//   code into a single output file. Chrome only ever sees the final bundled
//   file — no imports remain at runtime.

import type { HeuristicResult, ExtractedPageData, Link } from "../types/heuristics";
import { analyzeContent } from "../heuristics/contentHeuristics";
import { analyzeUrl }     from "../heuristics/urlHeuristics";

// –– Data extraction ––
// Reads the current page's DOM and returns a structured snapshot.

function extractPageData(): ExtractedPageData {
    const url = window.location.href;
    const title: string = document.title;

    // Meta description: sites use this to summarise their content.
    // Often contains scammy language in phishing pages.
    const metaDescription: string =
        document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";

    // Prefer a semantic content area if the page has one.
    const mainElement: HTMLElement | null =
        document.querySelector("main") ||
        document.querySelector("article") ||
        document.querySelector<HTMLElement>('[role="main"]');

    const rawText: string = mainElement
        ? mainElement.innerText
        : document.body?.innerText ?? "";

    // Cap at 5,000 chars to keep the payload small.
    const textContent: string = rawText.trim().substring(0, 5000);

    // Collect up to 100 links that have visible text and a real URL.
    const linkElements = document.querySelectorAll("a[href]");
    const links: Link[] = Array.from(linkElements)
        .map((el) => ({
            text: (el.textContent ?? "").trim(),
            href: el.getAttribute("href") ?? "",
        }))
        .filter(
            (link) =>
                link.text.length > 0 &&
                (link.href.startsWith("http://") || link.href.startsWith("https://"))
        )
        .slice(0, 100);

    return { url, title, metaDescription, textContent, links };
}

// –– Result combination ––
// Takes the output of two heuristics (URL + content) and merges them into
// a single HeuristicResult. This lets the popup always deal with one object,
// regardless of how many heuristics ran.

function combineResults(
    urlResult: HeuristicResult,
    contentResult: HeuristicResult
): HeuristicResult {
    // Add both scores, capped at 10.
    const score = Math.min(10, urlResult.score + contentResult.score);

    // Merge all individual findings into one list.
    const findings = [...urlResult.findings, ...contentResult.findings];

    // Derive a single verdict from the combined score.
    // Thresholds must match the ones in popup.ts for colour coding.
    let verdict: HeuristicResult["verdict"];
    let explanation: string;

    if (score <= 3) {
        verdict = "safe";
        explanation = score === 0
            ? "No indicators detected."
            : "Minor indicators detected. Likely safe — stay alert.";
    } else if (score <= 6) {
        verdict = "suspicious";
        explanation = "This page has indicators commonly associated with scams. Exercise caution.";
    } else {
        verdict = "scam";
        explanation = "Strong scam indicators detected. Do not enter personal information.";
    }

    return { score, verdict, explanation, findings, source: "combined" };
}

// –– Logging helper ––
// Prints a formatted summary of extracted page data to the browser console.
// Open DevTools on any page (F12 → Console) and look for [Beacon] entries.

function logExtractedData(label: string, data: ExtractedPageData): void {
    console.group(`[Beacon] Page data (${label})`);
    console.log("URL:", data.url);
    console.log("Title:", data.title);
    console.log("Meta description:", data.metaDescription);
    console.log("Text length:", data.textContent.length, "chars");
    console.log("Text preview:", data.textContent.substring(0, 200) + "…");
    console.log("Links found:", data.links.length);
    console.table(data.links.slice(0, 10));
    console.groupEnd();
}

// –– Pipeline (runs once on page load) ––

const initialData = extractPageData();
logExtractedData("page load", initialData);

// Run both heuristics and combine into one result.
const urlResult     = analyzeUrl(initialData.url);
const contentResult = analyzeContent(initialData);
const combined      = combineResults(urlResult, contentResult);

console.log("[Beacon] Combined heuristic result:", combined);

// Hand the result to the background service worker for storage.
// The popup will request it later via { action: "getResult" }.
chrome.runtime.sendMessage({
    action:   "storeResult",
    result:   combined,
    pageData: initialData,
});

// –– Popup message listener (debugging) ––
// Kept so the popup can also request fresh page data directly if needed.
// "return true" tells Chrome to keep the message channel open so that
// sendResponse can be called after this listener returns.

chrome.runtime.onMessage.addListener(
    (
        message: { action: string },
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: ExtractedPageData) => void
    ) => {
        if (message.action === "scanPage") {
            const freshData = extractPageData();
            logExtractedData("popup scan", freshData);
            sendResponse(freshData);
        }
        return true;
    }
);
