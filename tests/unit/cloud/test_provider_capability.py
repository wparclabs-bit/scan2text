from __future__ import annotations

import pytest

from scan2text.cloud.capability import CapabilityTester
from scan2text.cloud.fake_provider import FakeProviderClient, FakeProviderMode
from scan2text.cloud.models import CloudRecipe
from scan2text.cloud.provider import (
    ChatMessage,
    ImagePart,
    OpenAICompatibleProviderClient,
    ProviderAuthenticationError,
    ProviderTimeout,
    TextPart,
)


RECIPE = CloudRecipe(
    version="cloud-v1-test",
    prompt="Read the image and return VISION_OK.",
    temperature=0.6,
    top_p=0.95,
    thinking_enabled=False,
)


class FakeHttpResponse:
    status_code = 200

    @staticmethod
    def json() -> dict:
        return {"choices": [{"message": {"content": "VISION_OK"}}]}


class FakeHttpSession:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def post(self, url: str, **kwargs: object) -> FakeHttpResponse:
        self.calls.append({"url": url, **kwargs})
        return FakeHttpResponse()


def test_openai_request_contains_one_text_part_and_one_image_part() -> None:
    session = FakeHttpSession()
    client = OpenAICompatibleProviderClient(
        base_url="https://provider.example/v1",
        model_id="vision-model",
        api_key="credential-fixture",
        recipe=RECIPE,
        session=session,
    )

    client.complete(
        ChatMessage(
            role="user",
            content=(
                TextPart(text="Read the image."),
                ImagePart(url="data:image/png;base64,AA=="),
            ),
        )
    )

    assert len(session.calls) == 1
    call = session.calls[0]
    assert call["url"] == "https://provider.example/v1/chat/completions"
    body = call["json"]
    assert body["model"] == "vision-model"
    assert body["temperature"] == 0.6
    assert body["top_p"] == 0.95
    assert body["chat_template_kwargs"] == {"enable_thinking": False}
    content = body["messages"][0]["content"]
    assert [part["type"] for part in content] == ["text", "image_url"]
    assert content[0]["text"] == "Read the image."
    assert content[1]["image_url"]["url"] == "data:image/png;base64,AA=="


def test_vision_fake_reports_vision_capability() -> None:
    client = FakeProviderClient(FakeProviderMode.VISION)

    result = CapabilityTester(client, clock=lambda: 0.0).test(
        model_id="vision-model",
        recipe=RECIPE,
        estimated_cost_usd=0.0187,
    )

    assert result.model_id == "vision-model"
    assert result.can_read_images is True
    assert result.estimated_cost_usd == 0.0187
    assert result.latency_ms >= 0


def test_text_only_fake_is_not_vision_capable() -> None:
    client = FakeProviderClient(FakeProviderMode.TEXT_ONLY)

    result = CapabilityTester(client, clock=lambda: 0.0).test(
        model_id="text-model",
        recipe=RECIPE,
        estimated_cost_usd=0.0187,
    )

    assert result.model_id == "text-model"
    assert result.can_read_images is False


def test_rejected_key_fake_raises_authentication_error() -> None:
    client = FakeProviderClient(FakeProviderMode.REJECTED_KEY)

    with pytest.raises(ProviderAuthenticationError):
        CapabilityTester(client, clock=lambda: 0.0).test(
            model_id="vision-model",
            recipe=RECIPE,
            estimated_cost_usd=0.0187,
        )


def test_timeout_fake_raises_provider_timeout() -> None:
    client = FakeProviderClient(FakeProviderMode.TIMEOUT)

    with pytest.raises(ProviderTimeout):
        CapabilityTester(client, clock=lambda: 0.0).test(
            model_id="vision-model",
            recipe=RECIPE,
            estimated_cost_usd=0.0187,
        )
