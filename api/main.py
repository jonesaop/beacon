import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from schemas import AnalyzeRequest, AnalyzeResponse
from auth import verify_api_key
from services.analyze_service import get_provider

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Beacon API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.post("/v1/analyze", response_model=AnalyzeResponse)
@limiter.limit(os.getenv("RATE_LIMIT", "1/minute"))
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    _: None = Depends(verify_api_key),
) -> AnalyzeResponse:
    from urllib.parse import urlparse
    from fastapi import HTTPException
    domain = urlparse(body.url).netloc or body.url
    provider = get_provider()
    try:
        result = await provider.analyze(body)
        logger.info("analyzed domain=%s verdict=%s score=%d", domain, result.label, result.risk_score)
        return result
    except NotImplementedError as e:
        logger.error("provider not configured: %s", e)
        raise HTTPException(status_code=503, detail="LLM provider not configured. Set USE_MOCK=true.")
    except Exception as e:
        logger.error("provider error domain=%s: %s", domain, type(e).__name__)
        raise HTTPException(status_code=503, detail="AI provider unavailable. Try again later.")
