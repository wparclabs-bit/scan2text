"""OpenAI-compatible provider client seam.

Only the chat-completions shape is supported. The client accepts a configured
base URL, model identifier, API key, and Cloud Recipe. No provider-specific
native request shape is implemented here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Protocol, Union

import requests

from scan2text.cloud.models import CloudRecipe


class ProviderError(Exception):
    """A provider request failed without exposing request credentials."""


class ProviderAuthenticationError(ProviderError):
    """The provider rejected the configured credential."""


class ProviderTimeout(ProviderError):
    """The provider did not answer before the configured timeout."""


@dataclass(frozen=True)
class TextPart:
    text: str
    type: Literal["text"] = "text"

    def to_payload(self) -> dict[str, Any]:
        return {"type": self.type, "text": self.text}


@dataclass(frozen=True)
class ImagePart:
    url: str
    type: Literal["image_url"] = "image_url"

    def to_payload(self) -> dict[str, Any]:
        return {"type": self.type, "image_url": {"url": self.url}}


ContentPart = Union[TextPart, ImagePart]


@dataclass(frozen=True)
class ChatMessage:
    role: str
    content: tuple[ContentPart, ...]

    def to_payload(self) -> dict[str, Any]:
        return {
            "role": self.role,
            "content": [part.to_payload() for part in self.content],
        }


@dataclass(frozen=True)
class ProviderResponse:
    content: str


class ProviderClient(Protocol):
    """Public seam used by capability checks and future cloud conversion."""

    def complete(self, message: ChatMessage) -> ProviderResponse:
        """Send one chat-completions message and return the answer text."""


class OpenAICompatibleProviderClient:
    """Client for an OpenAI-compatible ``/chat/completions`` endpoint."""

    def __init__(
        self,
        *,
        base_url: str,
        model_id: str,
        api_key: str,
        recipe: CloudRecipe,
        timeout_seconds: float = 30.0,
        session: Any | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model_id = model_id
        self.api_key = api_key
        self.recipe = recipe
        self.timeout_seconds = timeout_seconds
        self._session = session or requests.Session()

    @property
    def endpoint(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        return f"{self.base_url}/chat/completions"

    def build_payload(self, message: ChatMessage) -> dict[str, Any]:
        return {
            "model": self.model_id,
            "messages": [message.to_payload()],
            "temperature": self.recipe.temperature,
            "top_p": self.recipe.top_p,
            "chat_template_kwargs": {
                "enable_thinking": self.recipe.thinking_enabled,
            },
        }

    def complete(self, message: ChatMessage) -> ProviderResponse:
        try:
            response = self._session.post(
                self.endpoint,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=self.build_payload(message),
                timeout=self.timeout_seconds,
            )
        except requests.Timeout as exc:
            raise ProviderTimeout("Provider request timed out") from exc
        except requests.RequestException as exc:
            raise ProviderError("Provider request failed") from exc

        status_code = int(getattr(response, "status_code", 0))
        if status_code in (401, 403):
            raise ProviderAuthenticationError("Provider rejected the credential")
        if status_code >= 400:
            raise ProviderError(f"Provider returned HTTP {status_code}")

        try:
            payload = response.json()
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise ProviderError("Provider returned an invalid response") from exc
        if not isinstance(content, str):
            raise ProviderError("Provider returned an invalid response")
        return ProviderResponse(content=content)
