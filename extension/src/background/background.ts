console.log("Beacon background service worker running");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ reply: "PONG from background" });
  }
  return true;
});

// This is a simple local link checker that evaluates URLs based on basic heuristics.
interface LinkCheckResult {
    status: "safe" | "unsafe" | "unknown";
    reason: string;
}

function evaluateUrl(rawUrl: string): LinkCheckResult {
    try {
        const url = new URL(rawUrl);

        if (url.protocol !== "https:") {
            return {
                status: "unsafe",
                reason: "This link does not use HTTPS."
            };
        }

        return {
            status: "safe",
            reason: "No immediate issues found."
        };
    } catch {
        return {
            status: "unsafe",
            reason: "This URL appears invalid."
        };
    }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "CHECK_LINK" && typeof message.url === "string") {
        sendResponse(evaluateUrl(message.url));
    }
    return true;
});