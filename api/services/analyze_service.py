import os
from providers.mock_provider import MockProvider
from providers.gemini_provider import GeminiProvider

_provider = None


def get_provider():
    global _provider
    if _provider is not None:
        return _provider

    if os.getenv("USE_MOCK", "true").lower() == "true":
        _provider = MockProvider()
    else:
        _provider = GeminiProvider()

    return _provider
