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


class ProviderForbidden(ProviderError):
    """The provider refused the request (HTTP 403)."""


class ProviderQuotaExceeded(ProviderError):
    """The provider quota is exhausted (HTTP 402 or a quota error body)."""


class ProviderRateLimited(ProviderError):
    """The provider asked the caller to slow down (HTTP 429)."""


class ProviderServerError(ProviderError):
    """The provider returned a server-side error (HTTP 5xx)."""


class ProviderNetworkError(ProviderError):
    """The provider could not be reached at all — no HTTP response arrived."""


class ProviderAborted(Exception):
    """The request was abandoned on purpose.

    This is not a provider failure: the taxonomy never retries it and never
    parks a job because of it (D-22).
    """


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

    def abort(self) -> None:
        """Abandon the in-flight request, as far as the connection allows (D-22)."""


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
        self._aborted = False

    def abort(self) -> None:
        """Abandon the in-flight request, as far as the connection allows (D-22).

        The connection is closed when it can be; the provider may still finish
        the work and charge for it.
        """
        self._aborted = True
        close = getattr(self._session, "close", None)
        if callable(close):
            try:
                close()
            except Exception:  # best effort by design
                pass

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
        if self._aborted:
            raise ProviderAborted("The provider request was abandoned")
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
            # No HTTP response arrived: a dead network parks the job, it does
            # not fail it and it never switches engines (D-20).
            raise ProviderNetworkError("Provider is unreachable") from exc

        if self._aborted:
            # The answer arrived after the cancel: it is discarded (D-22).
            raise ProviderAborted("The provider request was abandoned")

        status_code = int(getattr(response, "status_code", 0))
        body = getattr(response, "text", "")
        if not isinstance(body, str):
            body = ""
        quota_in_body = "quota" in body.lower()
        if status_code == 401:
            raise ProviderAuthenticationError("Provider rejected the credential")
        if status_code == 402 or (status_code in (403, 429) and quota_in_body):
            raise ProviderQuotaExceeded("Provider quota is exhausted")
        if status_code == 403:
            raise ProviderForbidden("Provider refused the request")
        if status_code == 429:
            raise ProviderRateLimited("Provider rate limited the request")
        if status_code >= 500:
            raise ProviderServerError(f"Provider returned HTTP {status_code}")
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
