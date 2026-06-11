from typing import Protocol
from schemas import AnalyzeRequest, AnalyzeResponse


class Provider(Protocol):
    async def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse: ...
