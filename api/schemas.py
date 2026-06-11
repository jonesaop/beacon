from pydantic import BaseModel, Field
from typing import Literal, Optional


class AnalyzeRequest(BaseModel):
    url: str
    text: str = Field(max_length=1500)
    heuristic_score: int = Field(ge=0, le=10)  # matches HeuristicResult.score
    context: Literal["page_body", "email_body", "sms", "form"]
    title: Optional[str] = None
    meta_description: Optional[str] = None
    heuristic_verdict: Optional[Literal["safe", "uncertain", "scam"]] = None
    heuristic_findings: Optional[list[str]] = None


class AnalyzeResponse(BaseModel):
    risk_score: int = Field(ge=0, le=10)  # matches HeuristicResult.score scale
    label: Literal["safe", "uncertain", "scam"]
    action: Literal["allow", "warn", "block"]
    reason: str
