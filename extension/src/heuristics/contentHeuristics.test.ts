// Manual test for the content heuristics function
//NOT part of extension

import { analyzeContent } from "./contentHeuristics";
import type { ExtractedPageData } from "../types/heuristics";

//helper to print results
function runTest(name: string, pageData: ExtractedPageData): void {
    console.log("===============================================================");
    console.log(`TEST: ${name}`);
    console.log("----------------------------------------------------------------");
    const result = analyzeContent(pageData);
    console.log("Score: " + result.score);
    console.log("Verdict: " + result.verdict);
    console.log("Explanation: " + result.explanation);
    if (result.findings.length === 0) {
        console.log("Findings: (none)");
    } else {
        console.log("Findings:");
        for (const finding of result.findings) {
            console.log(" - " + finding);
        }
    }
    console.log("");
}

//Test 1 - safe page with no scam phrases
runTest("Wikipedia article about the moon", {
    url: "https://en.wikipedia.org/wiki/Moon",
    title: "Moon - Wikipedia",
    metaDescription: "The Moon is Earth's only natural satellite.",
    textContent: "The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System and the largest relative to its parent planet. The Moon is a planetary-mass object with a differentiated rocky body, making it a satellite planet.",
    links: []
});

//Test 2 scam page
runTest("Obvious prize scam", {
    url: "http://free-prize-winner.xyz/claim",
    title: "Congratulations you are our winner!",
    metaDescription: "You have won a brand new iPhone! Claim your prize today!",
    textContent: "Click here to claim your free gift! Act now, this is a limited time offer. You have won a $1000 gift card!",
    links: []
});

//Test 3 not a clear scam
runTest("Marketing email with one suspicious phrase", {
    url: "https://newsletter.example.com/sale",
    title: "Spring Sale Newsletter",
    metaDescription: "Check out our spring collection",
    textContent: "Welcome to our spring newsletter! Don't miss out on our exclusive deal happening this week only. Free shipping on orders over $50.",
    links: []
});

//Test 4 - empty page
runTest("Empty page", {
    url: "",
    title: "",
    metaDescription: "",
    textContent: "",
    links: []
});

//Test 5 scam phrase in title
runTest("Scam phrase in title only", {
    url: "https://example.com",
    title: "You have won a prize",
    metaDescription: "A normal description of a normal page",
    textContent: "This is the body of a normal page with nothing suspicious in it.",
    links: []
});

