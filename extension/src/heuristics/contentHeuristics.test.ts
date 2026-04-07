// Manual test for the content heuristics function
//NOT part of extension

import { analyzeContent } from "./contentHeuristics";
import type { ExtractedPageData } from "../types/heuristics";

//helper to print results
function runTest(name: string, pageData: ExtractedPageData): void {
    console.log("===============================================================");
    console.log(`TEST: ${name}`);
    console.log("TEST: " + name);
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

// ---------- Test 1: A normal, safe page ----------
// This represents something like a Wikipedia article. No scam phrases
// anywhere. Expected verdict: Safe with score 0.
runTest("Wikipedia article about the moon", {
    url: "https://en.wikipedia.org/wiki/Moon",
    title: "Moon - Wikipedia",
    metaDescription: "The Moon is Earth's only natural satellite.",
    textContent: "The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System and the largest relative to its parent planet. The Moon is a planetary-mass object with a differentiated rocky body, making it a satellite planet.",
    links: []
});

// ---------- Test 2: An obvious scam page ----------
// Multiple scam phrases in the title and body. Expected: high score,
// "Likely Scam" verdict, several findings.
runTest("Obvious prize scam", {
    url: "http://free-prize-winner.xyz/claim",
    title: "Congratulations you are our winner!",
    metaDescription: "You have won a brand new iPhone! Claim your prize today!",
    textContent: "Click here to claim your free gift! Act now, this is a limited time offer. You have won a $1000 gift card!",
    links: []
});

// ---------- Test 3: A borderline case ----------
// One mildly suspicious phrase in the body, nothing in the title or
// meta. Expected: low-to-mid score, probably "Safe" or "Uncertain".
runTest("Marketing email with one suspicious phrase", {
    url: "https://newsletter.example.com/sale",
    title: "Spring Sale Newsletter",
    metaDescription: "Check out our spring collection",
    textContent: "Welcome to our spring newsletter! Don't miss out on our exclusive deal happening this week only. Free shipping on orders over $50.",
    links: []
});

// ---------- Test 4: Empty page ----------
// All fields empty. This tests that the function handles edge cases
// without crashing. Expected: score 0, "Safe".
runTest("Empty page", {
    url: "",
    title: "",
    metaDescription: "",
    textContent: "",
    links: []
});

// ---------- Test 5: Scam phrase only in title ----------
// Tests that the title weighting (3x) works correctly. One phrase in
// the title alone should give a score of 3.
runTest("Scam phrase in title only", {
    url: "https://example.com",
    title: "You have won a prize",
    metaDescription: "A normal description of a normal page",
    textContent: "This is the body of a normal page with nothing suspicious in it.",
    links: []
});

// ---------- Test 6: Mismatched link  ----------
// A page with a link whose visible text claims to be apple.com but
// actually points to a different domain. Expected: score 4 from one
// mismatched link, verdict "Uncertain", one finding about the mismatch.
runTest("Phishing link pretending to be apple.com", {
    url: "https://newsletter.example.com",
    title: "Newsletter",
    metaDescription: "Our weekly updates",
    textContent: "Thank you for reading our newsletter. Please visit our sponsors.",
    links: [
        { text: "https://www.apple.com", href: "https://evil-phishing.xyz/login" }
    ]
});

// ---------- Test 7: Same-site link should NOT be flagged ----------
// A link on example.com that points to another page on example.com.
// The visible text claims example.com (via a subdomain form) and the
// href goes to a different subdomain of the same site. This should NOT
// be flagged as a mismatch. Expected: score 0, verdict "Safe".
runTest("Same-site link with subdomain", {
    url: "https://blog.example.com/posts/1",
    title: "My Blog Post",
    metaDescription: "A blog post about programming",
    textContent: "Welcome to my blog. I write about software and cats.",
    links: [
        { text: "www.example.com", href: "https://shop.example.com/products" }
    ]
});

// ---------- Test 8: Normal link with non-domain text should NOT be flagged ----------
// A link whose visible text is just "Click here" or similar. There's
// no domain claim in the text, so there's nothing to compare against,
// so the link should not trigger the mismatch check even though it
// points to a completely different domain. Expected: score 0, verdict "Safe"
runTest("Normal link with generic text", {
    url: "https://news.example.com/article",
    title: "Breaking News Story",
    metaDescription: "Today's top headlines",
    textContent: "In today's news, we cover several important events.",
    links: [
        { text: "Click here to read more", href: "https://different-site.com/story" },
        { text: "About us", href: "https://different-site.com/about" }
    ]
});
