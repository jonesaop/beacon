//interface describes what an object looks like
// This says: "The data we extract will always have a 'url' string
// and a 'textContent' string." This helps catch mistakes early --
// if we accidentally forget one of these fields, TypeScript will
// warn us before we even run the code.

interface PageData {
    url: string;
    textContent: string;
}

interface LinkCheckResult {
    status: "safe" | "unsafe" | "unknown";
    reason: string;
}


//function that reads page content
//grabs:(1) current page URL & (2) visible text on page
//trimming text and cap it to 5000 characters to avoid sending too much data to the server

function extractPageData(): PageData {
    const url = window.location.href;
    const rawText: string = document.body.innerText || "";
    const textContent: string = rawText.trim().substring(0,5000);
    
    return {
        url: url,
        textContent: textContent
    };
}

// Hoverlink Checking Logic
// Type definitions for link checking results

let beaconTooltip: HTMLDivElement | null = null;
let activeAnchor: HTMLAnchorElement | null = null;
let hoverTimer: number | null = null;

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

    let label = "";
    if (result.status === "safe") {
        label = "✅ Safe";
    } else if (result.status === "unsafe") {
        label = "⚠️ Not safe";
    } else {
        label = "❓ Checking";
    }

    tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 6px;">${label}</div>
        <div style="margin-bottom: 6px; opacity: 0.9;">${href}</div>
        <div style="opacity: 0.85;">${result.reason}</div>
    `;
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
     sendResponse: (response:PageData) => void
   ) => {
     if (message.action === "scanPage") {
        const pageData = extractPageData();
        sendResponse(pageData);
     }
     return true;
 } 
);