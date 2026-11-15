"""Capability test for a configured Cloud model."""

from __future__ import annotations

import base64
from dataclasses import dataclass
from io import BytesIO
from time import perf_counter
from typing import Callable

from PIL import Image, ImageDraw

from scan2text.cloud.models import CloudRecipe
from scan2text.cloud.provider import (
    ChatMessage,
    ImagePart,
    ProviderClient,
    TextPart,
)


VISION_MARKER = "VISION_OK"


@dataclass(frozen=True)
class CapabilityResult:
    model_id: str
    can_read_images: bool
    latency_ms: int
    estimated_cost_usd: float


def build_vision_probe_data_url() -> str:
    """Build one tiny PNG that visibly contains the capability marker."""
    image = Image.new("RGB", (180, 48), "white")
    draw = ImageDraw.Draw(image)
    draw.text((8, 14), VISION_MARKER, fill="black")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


class CapabilityTester:
    """Send one image plus text and decide whether the model can read images."""

    def __init__(
        self,
        client: ProviderClient,
        clock: Callable[[], float] = perf_counter,
    ) -> None:
        self._client = client
        self._clock = clock

    def test(
        self,
        *,
        model_id: str,
        recipe: CloudRecipe,
        estimated_cost_usd: float,
    ) -> CapabilityResult:
        started = self._clock()
        message = ChatMessage(
            role="user",
            content=(
                TextPart(
                    text=(
                        f"{recipe.prompt} Read the marker in the image and "
                        f"reply with exactly {VISION_MARKER}."
                    )
                ),
                ImagePart(url=build_vision_probe_data_url()),
            ),
        )
        response = self._client.complete(message)
        elapsed_ms = max(0, round((self._clock() - started) * 1000))
        return CapabilityResult(
            model_id=model_id,
            can_read_images=VISION_MARKER in response.content.upper(),
            latency_ms=elapsed_ms,
            estimated_cost_usd=estimated_cost_usd,
        )
