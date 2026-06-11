from schemas import AnalyzeRequest, AnalyzeResponse


class MockProvider:
    async def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        if request.heuristic_score >= 7:
            return AnalyzeResponse(
                risk_score=9,
                label="scam",
                action="block",
                reason="Domain registered recently; urgency language matches credential-harvesting patterns.",
            )
        if request.heuristic_score >= 4:
            return AnalyzeResponse(
                risk_score=5,
                label="uncertain",
                action="warn",
                reason="Some indicators of potential phishing detected.",
            )
        return AnalyzeResponse(
            risk_score=1,
            label="safe",
            action="allow",
            reason="No significant risk indicators detected.",
        )
