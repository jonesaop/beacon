import os
from google import genai
from google.genai import types
from schemas import AnalyzeRequest, AnalyzeResponse

SYSTEM_INSTRUCTION = """You are a phishing and scam detection classifier for a browser security extension.
Analyze the provided web page data and classify it.

Labels:
- "safe": no phishing indicators
- "uncertain": some suspicious signals but not conclusive
- "scam": clear phishing, credential harvesting, or fraud

Risk score: integer 0–10 (0–3 → safe, 4–6 → uncertain, 7–10 → scam)
Action: "allow" for safe, "warn" for uncertain, "block" for scam
Reason: one sentence explaining your verdict.

Key signals: brand impersonation, credential harvesting, urgency/threat language,
suspicious domain patterns, mismatch between the URL domain and displayed brand."""


def build_prompt(req: AnalyzeRequest) -> str:
    findings = (
        "\n".join(f"- {f}" for f in req.heuristic_findings)
        if req.heuristic_findings
        else "None"
    )
    return f"""URL: {req.url}
Page title: {req.title or "(none)"}
Meta description: {req.meta_description or "(none)"}

Heuristic pre-scan: {req.heuristic_verdict or "unknown"} (score {req.heuristic_score}/10)
Triggered signals:
{findings}

Page text excerpt:
{req.text}"""


class GeminiProvider:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to api/.env and restart the server."
            )
        self.client = genai.Client(api_key=api_key)

    async def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        response = await self.client.aio.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=build_prompt(request),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=AnalyzeResponse,
                max_output_tokens=256,
            ),
        )
        # response.parsed is the Pydantic model when response_schema is a Pydantic class
        parsed = response.parsed
        if isinstance(parsed, AnalyzeResponse):
            return parsed
        # fallback for older SDK versions that don't auto-parse
        return AnalyzeResponse.model_validate_json(response.text)
