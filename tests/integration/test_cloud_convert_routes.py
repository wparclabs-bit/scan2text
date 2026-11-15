"""T04 — the ``POST /api/cloud/convert`` route and the engine fields in /status."""

from __future__ import annotations

import asyncio
import json
import tempfile
import uuid
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from scan2text.api import main as api_main
from scan2text.cloud.conversion import (
    CloudConsentRequiredError,
    convert_pdf_to_markdown,
)
from scan2text.cloud.fake_provider import FakeProviderClient
from scan2text.cloud.routes_convert import build_convert_router
from scan2text.cloud.service import (
    DEFAULT_PROFILE_PATH,
    CloudConversionService,
    CloudProfileService,
)
from scan2text.services.path_service import PathService
from scan2text.services.queue_service import QueueService

from tests.fakes.ocr import SentinelOCR

MEGABYTE = 1024 * 1024

# This sandbox cannot always remove its own temporary tree.
_TEST_ROOT = Path(tempfile.gettempdir()) / f"scan2text-cloud-convert-routes-{uuid.uuid4().hex}"
_TEST_ROOT.mkdir(parents=True, exist_ok=True)


# --- Synthetic PDF builder (shared shape with the unit test) ----------------


def _build_pdf(page_texts: list[str]) -> bytes:
    objects: list[bytes] = []
    count = len(page_texts)
    kids = " ".join(f"{4 + index} 0 R" for index in range(count))
    objects.append(b"<</Type/Catalog/Pages 2 0 R>>")
    objects.append(f"<</Type/Pages/Kids[{kids}]/Count {count}>>".encode("latin-1"))
    objects.append(b"<</Font<</F1 3 0 R>>>>")
    for index in range(count):
        objects.append(
            b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources 3 0 R/Contents "
            + f"{4 + count + index} 0 R>>".encode("latin-1")
        )
    for text in page_texts:
        content = f"BT /F1 12 Tf 100 Td ({text}) Tj ET".encode("latin-1")
        objects.append(
            b"<</Length "
            + str(len(content)).encode("latin-1")
            + b">>stream\n"
            + content
            + b"\nendstream"
        )
    out = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{index} 0 obj\n".encode("latin-1") + obj + b"\nendobj\n"
    xref_offset = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode("latin-1")
    out += b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode("latin-1")
    out += (
        f"trailer<</Size {len(objects) + 1}/Root 1 0 R>>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("latin-1")
    return bytes(out)


def _write_pdf(name: str, text: str, *, pad_bytes: int = 0) -> Path:
    path = _TEST_ROOT / name
    payload = _build_pdf([text])
    if pad_bytes:
        payload += b"0" * pad_bytes
    path.write_bytes(payload)
    return path


class FakeCredentialStore:
    def __init__(self) -> None:
        self.secret: str | None = None

    def write(self, secret: str) -> None:
        self.secret = secret

    def read(self) -> str | None:
        return self.secret

    def delete(self) -> None:
        self.secret = None


def _conversion_service(provider, path_service: PathService | None = None) -> CloudConversionService:
    profile = CloudProfileService(
        profile_path=_TEST_ROOT / "missing-cloud-profile.json",
        default_profile_path=DEFAULT_PROFILE_PATH,
    )
    return CloudConversionService(
        profile_loader=profile.load,
        client_factory=lambda loaded, secret: provider,
        path_service=path_service,
    )


def build_app() -> tuple[FastAPI, FakeProviderClient]:
    provider = FakeProviderClient()
    credentials = FakeCredentialStore()
    credentials.write("credential-fixture")
    path_service = PathService(base_dir=str(_TEST_ROOT / "home"))
    app = FastAPI()
    app.include_router(build_convert_router())
    app.state.cloud_service = _conversion_service(provider, path_service)
    app.state.cloud_conversion_service = app.state.cloud_service
    app.state.cloud_profile_service = CloudProfileService(
        profile_path=_TEST_ROOT / "missing-cloud-profile.json",
        default_profile_path=DEFAULT_PROFILE_PATH,
    )
    app.state.cloud_credential_store = credentials
    app.state.path_service = path_service
    return app, provider


# --- Route tests ------------------------------------------------------------


def test_convert_route_returns_the_written_file_metadata_and_engine() -> None:
    app, provider = build_app()
    source = _write_pdf("route-convert.pdf", "route convert page")
    client = TestClient(app)

    response = client.post(
        "/api/cloud/convert",
        json={"file_path": str(source), "consent_granted": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["engine"] == "cloud"
    assert body["model"] == "nvidia/nemotron-3.5-super-vl-120b-a12b"
    assert body["prompt_version"].startswith("cloud-v2")
    assert body["pages"] == 1
    assert body["generated_at"]
    assert body["awaiting_geometry"] == []
    written = Path(body["output_path"])
    assert written.exists()
    assert written.parent == Path(app.state.path_service.output_path)
    assert written.read_text(encoding="utf-8").startswith("---\nengine: cloud\n")
    assert provider.last_message is not None
    assert "credential-fixture" not in response.text


def test_convert_route_refuses_without_consent_and_sends_nothing() -> None:
    app, provider = build_app()
    source = _write_pdf("route-no-consent.pdf", "route consent page")
    client = TestClient(app)

    response = client.post(
        "/api/cloud/convert",
        json={"file_path": str(source), "consent_granted": False},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "CLOUD_CONSENT_REQUIRED"
    assert provider.last_message is None


def test_convert_route_rejects_a_file_above_the_ceiling() -> None:
    app, provider = build_app()
    oversized = _write_pdf(
        "route-oversized.pdf", "route oversized page", pad_bytes=50 * MEGABYTE
    )
    client = TestClient(app)

    response = client.post(
        "/api/cloud/convert",
        json={"file_path": str(oversized), "consent_granted": True},
    )

    assert response.status_code == 413
    assert "50 MB" in json.dumps(response.json())
    assert provider.last_message is None


def _register_task(task_id: str, total: int = 1) -> None:
    api_main._task_store[task_id] = {
        "status": "queued",
        "processed": 0,
        "total": total,
        "result_markdown": None,
    }


class _FakeVlmAdapter:
    """Minimal local engine: the QueueService only needs ``ocr(path, enhance=...)``."""

    def __init__(self, markdown: str = "# local markdown\n") -> None:
        self._markdown = markdown
        self.calls: list[str] = []

    def ocr(self, path: str, enhance: bool = False) -> str:
        self.calls.append(path)
        return self._markdown


def _queue_service(provider: FakeProviderClient) -> QueueService:
    """A real QueueService: local OCR is a sentinel fake, Cloud is the seam fake."""
    path_service = PathService(base_dir=str(_TEST_ROOT / "home"))
    service = QueueService(
        ocr_engine=SentinelOCR(),
        path_service=path_service,
        cloud_conversion_service=_conversion_service(provider, path_service),
    )
    service._vlm_adapter = _FakeVlmAdapter()
    return service


def test_status_reports_the_engine_and_the_model_for_a_cloud_task() -> None:
    provider = FakeProviderClient()
    queue = _queue_service(provider)
    source = _write_pdf("status-cloud.pdf", "status cloud page", pad_bytes=9 * MEGABYTE)
    _register_task("task-cloud")

    asyncio.run(
        api_main._run_processing("task-cloud", queue, [source], {}, consent_granted=True)
    )

    result = asyncio.run(api_main.get_status("task-cloud"))

    assert result["status"] == "completed"
    assert result["engine"] == "cloud"
    assert result["cloud_model_id"] == "nvidia/nemotron-3.5-super-vl-120b-a12b"
    assert provider.last_message is not None


def test_status_omits_the_cloud_fields_for_a_local_task() -> None:
    provider = FakeProviderClient()
    queue = _queue_service(provider)
    source = _write_pdf("status-local.pdf", "status local page")
    _register_task("task-local")

    asyncio.run(
        api_main._run_processing("task-local", queue, [source], {}, consent_granted=True)
    )

    result = asyncio.run(api_main.get_status("task-local"))

    assert result["status"] == "completed"
    assert result["engine"] == "local"
    assert "cloud_model_id" not in result
    assert provider.last_message is None
