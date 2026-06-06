// BACKGROUND SERVICE WORKER
//
// A Chrome extension has three isolated worlds that can't share memory directly:
//   content script (runs inside the page)
//   popup (runs when the user opens the extension)
//   background service worker (this file — runs behind the scenes)
//
// The background worker acts as a shared storage hub between the other two.
// It receives analysis results from the content script and holds them so the
// popup can retrieve them later, even if the popup opens after the page loaded.
//
// Message flow:
//
//   content.ts  ->  { action: "storeResult", result, pageData }  →  background.ts
//                       (sent once automatically on every page load)
//
//   popup.ts    ->  { action: "getResult", tabId }               →  background.ts
//   background.ts  ->  { result, pageData }  OR  { error: "not found" }  →  popup.ts
//
//   popup.ts    ->  { action: "setEnabled", enabled: boolean }   →  background.ts
//   popup.ts    ->  { action: "getEnabled" }                     →  background.ts
//   background.ts  ->  { enabled: boolean }                      →  popup.ts

import type { HeuristicResult, ExtractedPageData } from "../types/heuristics";

// StoredEntry is the only shape not exported from the shared types file.
interface StoredEntry {
    result: HeuristicResult;
    pageData: ExtractedPageData;
}

// –– Storage ––
// chrome.storage.session persists for the lifetime of the browser session and
// survives Chrome suspending the service worker to save resources.
// Key pattern: "tab_<tabId>" → StoredEntry JSON.
//
// chrome.storage.local persists across browser restarts and is used for
// user preferences like the "Enable Beacon" toggle.

// –– Message listener ––
// chrome.runtime.onMessage fires whenever content.ts or popup.ts calls
// chrome.runtime.sendMessage(). We read message.action to decide what to do.

chrome.runtime.onMessage.addListener(
    (
        message: {
            action: string;
            result?: HeuristicResult;
            pageData?: ExtractedPageData;
            tabId?: number;
            enabled?: boolean;
        },
        sender: chrome.runtime.MessageSender,
        sendResponse: (response: unknown) => void
    ) => {
        if (message.action === "storeResult") {
            // Content script finished heuristics and is handing us the result.
            // Skip storing if the user has disabled Beacon.
            const tabId = sender.tab?.id;
            if (tabId !== undefined && message.result && message.pageData) {
                (async () => {
                    const prefs = await chrome.storage.local.get("isEnabled");
                    const isEnabled = prefs["isEnabled"] !== false; // default true
                    if (!isEnabled) {
                        sendResponse({ success: false });
                        return;
                    }
                    const entry: StoredEntry = {
                        result: message.result!,
                        pageData: message.pageData!,
                    };
                    await chrome.storage.session.set({ [`tab_${tabId}`]: entry });
                    console.log(`[Beacon] stored result for tab ${tabId}`, message.result);
                    sendResponse({ success: true });
                })();
            } else {
                sendResponse({ success: false });
            }
            return true;
        }

        if (message.action === "getResult") {
            // Popup opened and wants the stored result for a given tab.
            if (message.tabId !== undefined) {
                const key = `tab_${message.tabId}`;
                (async () => {
                    const data = await chrome.storage.session.get(key);
                    const stored = data[key] as StoredEntry | undefined;
                    if (stored) {
                        sendResponse(stored); // { result, pageData }
                    } else {
                        sendResponse({ error: "not found" });
                    }
                })();
            } else {
                sendResponse({ error: "not found" });
            }
            return true;
        }

        if (message.action === "getEnabled") {
            (async () => {
                const prefs = await chrome.storage.local.get("isEnabled");
                const isEnabled = prefs["isEnabled"] !== false; // default true
                sendResponse({ enabled: isEnabled });
            })();
            return true;
        }

        if (message.action === "setEnabled") {
            const enabled = message.enabled !== false;
            (async () => {
                await chrome.storage.local.set({ isEnabled: enabled });
                // When disabling, clear all stored tab results so the popup
                // won't show stale data from before the extension was paused.
                if (!enabled) {
                    const all = await chrome.storage.session.get(null);
                    const tabKeys = Object.keys(all).filter((k) => k.startsWith("tab_"));
                    if (tabKeys.length > 0) {
                        await chrome.storage.session.remove(tabKeys);
                    }
                }
                sendResponse({ success: true });
            })();
            return true;
        }

        return false;
    }
);

// –– Tab cleanup ––
// When a tab closes, remove its stored entry so session storage doesn't grow forever.

chrome.tabs.onRemoved.addListener(async (tabId: number) => {
    await chrome.storage.session.remove(`tab_${tabId}`);
});
