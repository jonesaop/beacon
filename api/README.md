# Beacon API

FastAPI backend for Tier 2 LLM-based phishing detection.

## Setup

```bash
cp .env.example .env   # fill in your values
pip3 install -r requirements.txt
python3 -m uvicorn main:app --port 3000
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `USE_MOCK` | No (default: `true`) | Skip Gemini and use a deterministic mock. No API key needed. |
| `GEMINI_API_KEY` | Only if `USE_MOCK=false` | Insert API Key |
| `BEACON_API_KEY` | No | Secret shared with the extension. Leave empty to disable auth for local dev. Each developer sets their own  **(Do not share keys.)** |
| `RATE_LIMIT` | No (default: `1/minute`) | Max requests per IP per time window. |

> **Tip:** Keep `USE_MOCK=true` while developing. Switch to `USE_MOCK=false` only when you need a real Gemini response.