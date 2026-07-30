"""
NVIDIA Build API LLM client — Nemotron Ultra as primary model.

Uses NVIDIA's OpenAI-compatible chat completions endpoint at
https://integrate.api.nvidia.com/v1/chat/completions
"""

import os
import json
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Model configuration ─────────────────────────────────────────────────────
PRIMARY_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"
FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b"

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"


def _get_api_key() -> str:
    """Return the NVIDIA API key or raise a clear error."""
    key = os.getenv("NVIDIA_API_KEY", "").strip()
    if not key:
        raise EnvironmentError(
            "NVIDIA_API_KEY is not set. "
            "Copy .env.example → .env and add your NVIDIA Build API key."
        )
    return key


def _call_nvidia(
    messages: list[dict],
    model: str,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> str:
    """Send a chat completion request to NVIDIA Build API and return the content.

    Raises ``requests.HTTPError`` on non-2xx responses.
    """
    api_key = _get_api_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    resp = requests.post(
        NVIDIA_BASE_URL,
        headers=headers,
        json=payload,
        timeout=180,
    )
    resp.raise_for_status()

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    return content


def chat(
    messages: list[dict],
    temperature: float = 0.2,
    max_tokens: int = 2048,
    expect_json: bool = False,
) -> str:
    """High-level entry point: tries the primary model, falls back on failure.

    Parameters
    ----------
    messages : list[dict]
        OpenAI-style messages (role + content).
    temperature : float
        Sampling temperature.
    max_tokens : int
        Maximum tokens in the response.
    expect_json : bool
        If True, the raw response is validated as JSON and a ``ValueError``
        is raised when parsing fails.

    Returns
    -------
    str
        The LLM's response content.
    """
    last_error: Exception | None = None

    for model in (PRIMARY_MODEL, FALLBACK_MODEL):
        try:
            logger.info("Calling model %s", model)
            content = _call_nvidia(
                messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            if expect_json:
                # Strip markdown code fences if the model wraps JSON in them
                cleaned = content.strip()
                if cleaned.startswith("```"):
                    first_newline = cleaned.index("\n")
                    cleaned = cleaned[first_newline + 1:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
                json.loads(cleaned)  # validate
                return cleaned

            return content

        except requests.HTTPError as exc:
            logger.warning(
                "Model %s returned HTTP %s — falling back.",
                model,
                exc.response.status_code if exc.response is not None else "?",
            )
            last_error = exc
        except (ValueError, KeyError, IndexError) as exc:
            logger.warning(
                "Model %s returned unparseable response — falling back. %s",
                model,
                exc,
            )
            last_error = exc

    raise RuntimeError(
        f"All models failed. Last error: {last_error}"
    ) from last_error
