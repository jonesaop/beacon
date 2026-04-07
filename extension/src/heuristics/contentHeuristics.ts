//Content heuristics module

//analyzes content of page (text, links, title, etc)
//returns HeuristicResult showing how likely page is a scam

import { HandFist } from "../../../../../../../../node_modules/lucide-react/dist/lucide-react";
import type { HeuristicResult, ExtractedPageData } from "../types/heuristics";

//Scam phrase list

const SCAM_PHRASES:  readonly string[] = [
    "you have won",
    "you've won",
    "congratulations, you won",
    "claim your prize",
    "click here to claim",
    "urgent action required",
    "act now",
    "limited time offer",
    "exclusive deal",
    "send a wire transfer",
    "you are the lucky winner",
    "congratulations you are our winner",

];

//Helper: extract the hostname from a URL string
//takes URL string and returns hostname (domain) or null if invalid URL

function extractDomain(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.toLowerCase();
    } catch {
        return ""; //return empty string if URL is invalid
    }
}

//Helper: normalize a domain for comparison
//Takes a domain (like "www.apple.com" or "mail.apple.com") and returns
// the "base domain" for comparison purposes.

function normalizeDomain(domain: string): string {
    if (domain.length === 0) {
        return "";
    }
    const parts: string[] = domain.split(".");
    if (parts.length <= 2) {
        return domain; //already base domain
    }
    return parts[parts.length -2] + "." + parts[parts.length -1]; //return last two parts as base domain
}

//Helper: extract a claimed domain from link text
//Takes the visible text of a link and tries to decide if it looks like the text is claiming to be a specific domain.
//If so, returns the claimed domain. If the text doesn't look like a domain claim, returns null

function extractClaimedDomain(text: string): string | null {
    const trimmed: string = text.trim().toLowerCase();
    //looks for popular domains
    const commonTlds: readonly string[] = [
        ".com", ".net", ".org", ".io", ".co", ".us", ".uk", ".de", ".jp", ".fr"
    ];

    let hasTld: boolean = false;
    for (const tld of commonTlds) {
        if (trimmed.endsWith(tld) || trimmed.includes(tld + "/")) {
            hasTld = true;
            break;
        }
    }
    if (!hasTld) {
        return null; //doesn't look like a domain claim
    }
    try {
        const parsed = new URL(trimmed);
        return parsed.hostname.toLowerCase();
    } catch {
        //try adding a protocol and parsing again
        try { 
            const parsed = new URL("http://" + trimmed);
            return parsed.hostname.toLowerCase();
        } catch {
            return null; //not a valid domain claim
        }
    }
}

//Helper: check if two domains are the same site
//Takes two domains and returns true if they represent the same site.
function isSameSite(domainA: string, domainB: string): boolean {
    if (domainA.length === 0 || domainB.length === 0) {
        return false; //if either domain is empty, can't be same site
    }
    return normalizeDomain(domainA) === normalizeDomain(domainB);   
}

//Helper: scan piece of text for scam phrase
//takes chunk of text and returns list of scam phrases found in it
//returns empty list if no phrases found

function findScamPhrases(text: string): string[] {
    const lowerText: string = text.toLowerCase();
    const matches: string[] = [];

    for (const phrase of SCAM_PHRASES) {
        if (lowerText.includes(phrase)) {
            matches.push(phrase);
        }
    }
    return matches;
}

//(1) Main analysis function (content heuristic)
//takes extracted page data and returns a HeuristicResult

export function analyzeContent(pageData: ExtractedPageData): HeuristicResult {
    const findings: string[] = [];
    //(1) scam phrases
    const titleMatches: string[] = findScamPhrases(pageData.title);
    const metaMatches: string[] = findScamPhrases(pageData.metaDescription);
    const textMatches: string[] = findScamPhrases(pageData.textContent);

    //add finding for each match, noting where it was found
    for (const phrase of titleMatches) {
        findings.push(`Scam phrase in title: '${phrase}'`);
    }
    for (const phrase of metaMatches) {
        findings.push(`Scam phrase in meta description: '${phrase}'`);
    }
    for (const phrase of textMatches) {
        findings.push(`Scam phrase in page text: '${phrase}'`);
    }

//(2) Mismatched links 
//For each link on the page, check if the visible text claims a pecific 
//domain that doesn't match where the link actually goes.
const currentDomain: string = extractDomain(pageData.url);
let mismatchedLinkCount: number = 0;

for (const link of pageData.links) {
    const claimedDomain: string | null = extractClaimedDomain(link.text);
    if (claimedDomain === null) {
        continue;
    }
    
    const hrefDomain: string = extractDomain(link.href);
        if (hrefDomain.length === 0) {
            continue;
        }

    // skip same-site links
    if(isSameSite(hrefDomain, currentDomain)) {
        continue;
    }

    //compare claimed domain with actual href domain
    if (!isSameSite(claimedDomain, hrefDomain)) {
        mismatchedLinkCount++;
        findings.push(
            `Mismatched link: visible text claims '${claimedDomain}' but href goes to '${hrefDomain}'`
        );
    }
}

//Scoring
//combine all matches into single score
//the more matches found, the higher the score
//phrases in title or meta count more than in body

    let score: number = 0;
    score += titleMatches.length * 3;
    score += metaMatches.length * 3;
    score += textMatches.length * 2;
    score += mismatchedLinkCount * 4;

//cap score at 10
    if (score > 10) {
        score = 10; 
    }

//verdict + explanation
//convert numeric score into verdict and explanation
    let verdict: HeuristicResult["verdict"];
    let explanation: string;

    if (score === 0) {
        verdict = "Safe";
        explanation = "No scam phrases detected in content.";
    } else if (score <= 3) {
        verdict = "Safe";
        explanation = "Minor indicators of potential scam content.";
    } else if (score <= 6) {
        verdict = "Uncertain";
        explanation = "The page contains some phrases commonly associated with scams. Exercise caution.";
    } else {
        verdict = "Likely Scam";
        explanation = "Strong indicators of scam content detected. Avoid interacting with this page.";
    }

    return {
        score: score,
        verdict: verdict,
        explanation: explanation,
        findings: findings,
        source: "content"
    };
}