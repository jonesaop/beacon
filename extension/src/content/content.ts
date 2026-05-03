// CONTENT SCRIPT
//file runs auto on every web page user visits
//(1) extracts structured data (URL, title, text, links, etc)
//(2) listens for messages from popup and respond with the data
//(3) logs extracted data to the page console for debugging

// Local type declarations
// Content scripts cannot use ES module imports,
// so we redeclare the shapes here. Keep in sync
// with extension/src/types/heuristics.ts.

interface Link {
    text: string;
    href: string;
}

interface LinkCheckResult {
    status: "safe" | "unsafe" | "unknown";
    reason: string;
}


//function that reads page content
//grabs:(1) current page URL & (2) visible text on page
//trimming text and cap it to 5000 characters to avoid sending too much data to the server
interface ExtractedPageData {
    url: string;
    title: string;
    metaDescription: string;
    textContent: string;
    links: Link[];
}

function extractPageData(): ExtractedPageData {
    //get current page URL
    const url = window.location.href;
    //title of page
    const title: string = document.title;
    //meta description used by sites to summarize content, useful for detection and often contains scammy language
    const metaDescription: string =
        document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    // Try to find main content area using common tags, fallback to body text
    const mainElement: HTMLElement | null = 
        document.querySelector("main") ||
        document.querySelector("article") ||
        document.querySelector<HTMLElement>('[role ="main"]');
    //get visible text content from page, prioritizing main/article/role=main if available
    const rawText: string = mainElement
        ? mainElement.innerText
        : document.body.innerText || "";
    //limit text content to 5000 chars
    const textContent: string = rawText.trim().substring(0, 5000);
    //extract links from page (visible text and href)
    //limit to first 100 links with http/https protocols to prevent large payloads
    const linkElements = document.querySelectorAll("a[href]");
    const links: Link[] = Array.from(linkElements)
        .map((element) => {
            const text = (element.textContent || "").trim();
            const href = element.getAttribute("href") || "";
            return { text: text, href: href };
        })
        .filter((link) => {
            const isValidProtocol = link.href.startsWith("http://") || link.href.startsWith("https://");
            return link.text.length > 0 && isValidProtocol;
        })
        .slice(0, 100);
    
    return {
        url: url,
        title: title,
        metaDescription: metaDescription,
        textContent: textContent,
        links: links
    };
}

// Hoverlink Checking Logic
// Type definitions for link checking results

let beaconTooltip: HTMLDivElement | null = null;
let activeAnchor: HTMLAnchorElement | null = null;
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateTooltip(): HTMLDivElement {
    if (beaconTooltip) {
        return beaconTooltip;
    }

    const tooltip = document.createElement("div");
    tooltip.id = "beacon-hover-tooltip";
    tooltip.style.position = "absolute";
    tooltip.style.zIndex = "2147483647";
    tooltip.style.maxWidth = "300px";
    tooltip.style.padding = "10px 12px";
    tooltip.style.borderRadius = "8px";
    tooltip.style.fontSize = "12px";
    tooltip.style.lineHeight = "1.4";
    tooltip.style.backgroundColor = "#111827";
    tooltip.style.color = "#ffffff";
    tooltip.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
    tooltip.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    tooltip.style.pointerEvents = "none";
    tooltip.style.display = "none";
    tooltip.style.wordBreak = "break-word";

    document.body.appendChild(tooltip);
    beaconTooltip = tooltip;

    return tooltip;
}

function positionTooltip(anchor: HTMLAnchorElement): void {
    const tooltip = getOrCreateTooltip();
    const rect = anchor.getBoundingClientRect();

    tooltip.style.top = `${window.scrollY + rect.bottom + 8}px`;
    tooltip.style.left = `${window.scrollX + rect.left}px`;
}

function renderTooltip(result: LinkCheckResult, href: string): void {
    const tooltip = getOrCreateTooltip();

    tooltip.replaceChildren();

    let label = "";
    if (result.status === "safe") {
        label = "✅ Safe";
    } else if (result.status === "unsafe") {
        label = "⚠️ Not safe";
    } else {
        label = "❓ Checking";
    }

     const labelDiv = document.createElement("div");
    labelDiv.textContent = label;
    labelDiv.style.fontWeight = "600";
    labelDiv.style.marginBottom = "6px";

    const hrefDiv = document.createElement("div");
    hrefDiv.textContent = href;
    hrefDiv.style.marginBottom = "6px";
    hrefDiv.style.opacity = "0.9";

    const reasonDiv = document.createElement("div");
    reasonDiv.textContent = result.reason;
    reasonDiv.style.opacity = "0.85";

    tooltip.append(labelDiv, hrefDiv, reasonDiv);
    tooltip.style.display = "block";
}

function hideTooltip(): void {
    if (beaconTooltip) {
        beaconTooltip.style.display = "none";
    }
    activeAnchor = null;
}

function findAnchor(target: EventTarget | null): HTMLAnchorElement | null {
    if (!(target instanceof Element)) {
        return null;
    }

    const anchor = target.closest("a[href]");
    return anchor instanceof HTMLAnchorElement ? anchor : null;
}

async function checkHoveredLink(anchor: HTMLAnchorElement): Promise<void> {
    const href = anchor.href;
    if (!href) {
        return;
    }

    activeAnchor = anchor;
    positionTooltip(anchor);
    renderTooltip(
        {
            status: "unknown",
            reason: "Checking this link..."
        },
        href
    );

    try {
        const result = await chrome.runtime.sendMessage({
            type: "CHECK_LINK",
            url: href
        }) as LinkCheckResult;

        if (activeAnchor === anchor) {
            positionTooltip(anchor);
            renderTooltip(result, href);
        }
    } catch {
        if (activeAnchor === anchor) {
            renderTooltip(
                {
                    status: "unknown",
                    reason: "Beacon could not check this link right now."
                },
                href
            );
        }
    }
}

document.addEventListener("mouseover", (event: MouseEvent) => {
    const anchor = findAnchor(event.target);
    if (!anchor) {
        return;
    }

    if (hoverTimer !== null) {
        window.clearTimeout(hoverTimer);
    }

    hoverTimer = window.setTimeout(() => {
        void checkHoveredLink(anchor);
    }, 300);
});

document.addEventListener("mouseout", (event: MouseEvent) => {
    const anchor = findAnchor(event.target);
    if (!anchor) {
        return;
    }

    if (hoverTimer !== null) {
        window.clearTimeout(hoverTimer);
        hoverTimer = null;
    }

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && beaconTooltip?.contains(nextTarget)) {
        return;
    }

    hideTooltip();
});

window.addEventListener("scroll", () => {
    if (activeAnchor) {
        positionTooltip(activeAnchor);
    }
});
// Helper: print extracted page data to the page console in a readable way
// 'label' lets us know what triggered the log (page load vs popup scan)

function logExtractedData(label: string, data: ExtractedPageData): void {
    console.group(`[Beacon] Extracted page data (${label})`);
    console.log("URL:", data.url);
    console.log("Title:", data.title);
    console.log("Meta description:", data.metaDescription);
    console.log("Text content length:", data.textContent.length, "chars");
    console.log("Text content preview:", data.textContent.substring(0, 200) + "...");
    console.log("Links found:", data.links.length);
    console.table(data.links.slice(0, 10)); //show first 10 links as a table
    console.groupEnd();
}

// Run extraction once when the page loads, so we can verify in DevTools
// that Beacon is seeing the page correctly without needing to open the popup.
const initialData = extractPageData();
logExtractedData("page load", initialData);

// Listen for messages from the popup script
// chrome.runtime.onMessage is Chrome's messaging system.
// When the popup sends a message, this listener receives it

//listener receives:
//message = data sent by popup
//sender = info about who sent message
//sendResponse = function to send a reply back to the popup

chrome.runtime.onMessage.addListener(
   (
     message: { action: string },
     sender: chrome.runtime.MessageSender,
     sendResponse: (response:ExtractedPageData) => void
   ) => {
     if (message.action === "scanPage") {
        const pageData = extractPageData();
        logExtractedData("popup scan", pageData);
        sendResponse(pageData);
     }
     return true;
 } 
);