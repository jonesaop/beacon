/** Hardcoded phrase patterns (case-insensitive). No /g flag — avoids lastIndex issues on RegExp.test. */
const PATTERNS: readonly { id: string; pattern: RegExp }[] = [
  { id: "gift_card", pattern: /\bgift[\s-]*card(s)?\b/i },
  { id: "wire_transfer", pattern: /\bwire\s+transfer\b/i },
  { id: "verify_account", pattern: /\bverify\s+your\s+(account|identity)\b/i },
  { id: "urgent_action", pattern: /\burgent\b.*\b(act\s+now|respond\s+immediately|within\s+\d+)\b/i },
  { id: "ssn_request", pattern: /\b(social\s+security|SSN)\b.*\b(confirm|provide|enter)\b/i },
  { id: "click_link_now", pattern: /\bclick\s+(this\s+)?(link|here)\s+now\b/i },
  { id: "prize_winner", pattern: /\b(you('ve| have)\s+)?won\b.*\b(prize|lottery|jackpot)\b/i },
  { id: "inheritance_scam", pattern: /\b(deceased|inheritance|next\s+of\s+kin|million\s+dollars)\b/i },
  { id: "crypto_urgency", pattern: /\b(send|transfer)\s+(bitcoin|BTC|crypto|USDT)\b/i },
  { id: "password_reset_phish", pattern: /\b(unusual\s+activity|password\s+expired)\b.*\b(click|link)\b/i },
] as const;

const MAX_INPUT_CHARS = 50_000;

export type CheckResult = {
  isScam: boolean;
  matches: string[];
  confidence: "low" | "medium" | "high";
};

export function analyzeText(raw: string): CheckResult {
  const text = raw.slice(0, MAX_INPUT_CHARS);
  const matches: string[] = [];

  for (const { id, pattern } of PATTERNS) {
    if (pattern.test(text)) matches.push(id);
  }

  const isScam = matches.length > 0;
  let confidence: CheckResult["confidence"] = "low";
  if (matches.length >= 2) confidence = "high";
  else if (matches.length === 1) confidence = "medium";

  return { isScam, matches, confidence };
}
