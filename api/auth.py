from fastapi import Header, HTTPException
from typing import Optional
import os


async def verify_api_key(x_beacon_key: Optional[str] = Header(None)) -> None:
    expected = os.getenv("BEACON_API_KEY", "")
    if expected and x_beacon_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
