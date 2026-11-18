"""T06 — cancelling a running cloud job (D-22).

The local wait stops at once, the result is discarded, the upstream request is
abandoned as far as the connection allows, and the local state is correct even
when the abort fails.

Hermetic: the provider seam's fake blocks until it is aborted. No test here
touches the network.
"""

from __future__ import annotations

import tempfile
import threading
import uuid
from pathlib import Path

from scan2text.cloud.cancellation import cancellation_registry
from scan2text.cloud.conversion import CloudConversionService
from scan2text.cloud.failure import FailureCause, ProviderParkedError, info_for
from scan2text.cloud.fake_provider import FakeProviderClient, FakeProviderMode
from scan2text.cloud.service import DEFAULT_PROFILE_PATH, CloudProfileService
from scan2text.services.path_service import PathService
from scan2text.services.queue_service import QueueService

MEGABYTE = 1024 * 1024

#: The PDF line break, written without escape sequences.
NL = bytes([10])

# The sandboxed test environment cannot always remove its own temporary tree,
# so every fixture lives in one uniquely named directory per module.
_TEST_ROOT = Path(tempfile.gettempdir()) / f"scan2text-cancel-{uuid.uuid4().hex}"
_TEST_ROOT.mkdir(parents=True, exist_ok=True)


# --- Synthetic PDF builder (no writer in pypdfium2) -------------------------


def _build_pdf(page_texts: list[str]) -> bytes:
    """Build a minimal valid PDF whose pages carry a real extractable text layer."""
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
            + b">>stream"
            + NL
            + content
            + NL
            + b"endstream"
        )
    out = bytearray(b"%PDF-1.4" + NL)
    offsets: list[int] = []
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{index} 0 obj".encode("latin-1") + NL + obj + NL + b"endobj" + NL
    xref_offset = len(out)
    out += b"xref" + NL + b"0 " + str(len(objects) + 1).encode("latin-1") + NL
    out += b"0000000000 65535 f " + NL
    for offset in offsets:
        out += f"{offset:010d} 00000 n ".encode("latin-1") + NL
    out += (
        f"trailer<</Size {len(objects) + 1}/Root 1 0 R>>".encode("latin-1")
        + NL
        + b"startxref"
        + NL
        + str(xref_offset).encode("latin-1")
        + NL
        + b"%%EOF"
        + NL
    )
    return bytes(out)


def _write_pdf(name: str, page_texts: list[str], *, pad_bytes: int = 0) -> Path:
    path = _TEST_ROOT / name
    payload = _build_pdf(page_texts)
    if pad_bytes:
        payload += b"0" * pad_bytes
    path.write_bytes(payload)
    return path


class NullAdapter:
    """The local engine never runs in this module; it only has to exist."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    def ocr(self, path: str, enhance: bool = False) -> str:
        self.calls.append(path)
        return "# local page"


def _fake_service(provider) -> CloudConversionService:
    profile = CloudProfileService(
        profile_path=_TEST_ROOT / "missing-profile.json",
        default_profile_path=DEFAULT_PROFILE_PATH,
    )
    return CloudConversionService(
        profile_loader=profile.load,
        client_factory=lambda loaded, secret: provider,
    )


def _start_cloud_job(provider, pdf: Path, task_id: str):
    """Run one cloud-routed file in a thread and wait until the provider blocks."""
    service = _fake_service(provider)
    path_service = PathService(base_dir=str(_TEST_ROOT / f"out-{task_id}"))
    adapter = NullAdapter()
    queue = QueueService(
        ocr_engine=adapter,
        path_service=path_service,
        cloud_conversion_service=service,
    )
    holder: dict[str, object] = {}

    def run() -> None:
        holder["summary"] = queue.process_image_paths(
            [pdf],
            adapter,
            consent_granted=True,
            task_id=task_id,
        )

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    assert provider.wait_until_blocked(timeout=20.0), "the provider was never reached"
    return thread, holder, path_service


def test_cancelling_a_running_cloud_job_stops_the_work_and_marks_the_job_cancelled() -> None:
    provider = FakeProviderClient(FakeProviderMode.BLOCKING)
    pdf = _write_pdf("cancel-running.pdf", ["page one"], pad_bytes=9 * MEGABYTE)
    task_id = "task-cancel-running"
    cancellation_registry.create(task_id)

    thread, holder, _path_service = _start_cloud_job(provider, pdf, task_id)

    assert cancellation_registry.cancel(task_id) is True
    thread.join(timeout=30)
    assert not thread.is_alive(), "the cancelled job kept working"

    summary = holder["summary"]
    assert len(summary.job_results) == 1
    result = summary.job_results[0]
    assert result["status"] == "cancelled"
    assert result["output_path"] is None
    assert "markdown_content" not in result


def test_a_cancelled_job_writes_no_file_and_keeps_no_result() -> None:
    provider = FakeProviderClient(FakeProviderMode.BLOCKING)
    pdf = _write_pdf("cancel-no-file.pdf", ["page one"], pad_bytes=9 * MEGABYTE)
    task_id = "task-cancel-no-file"
    cancellation_registry.create(task_id)

    thread, holder, path_service = _start_cloud_job(provider, pdf, task_id)

    cancellation_registry.cancel(task_id)
    thread.join(timeout=30)

    assert list(path_service.output_dir.glob("*.md")) == []
    summary = holder["summary"]
    assert summary.job_results[0]["status"] == "cancelled"
    assert not summary.job_results[0].get("markdown_content")


def test_cancelling_aborts_the_upstream_request_through_the_provider_seam() -> None:
    provider = FakeProviderClient(FakeProviderMode.BLOCKING)
    pdf = _write_pdf("cancel-abort.pdf", ["page one"], pad_bytes=9 * MEGABYTE)
    task_id = "task-cancel-abort"
    cancellation_registry.create(task_id)

    thread, _holder, _path_service = _start_cloud_job(provider, pdf, task_id)

    assert provider.aborted is False
    cancellation_registry.cancel(task_id)
    thread.join(timeout=30)

    assert provider.aborted is True
    assert provider.abort_calls == 1


def test_the_upstream_abort_is_best_effort_and_the_local_state_stays_cancelled() -> None:
    class FailingAbortProvider(FakeProviderClient):
        """A provider whose connection cannot be closed."""

        def abort(self) -> None:
            self.abort_calls += 1
            raise RuntimeError("the connection could not be closed")

    provider = FailingAbortProvider(FakeProviderMode.BLOCKING)
    pdf = _write_pdf("cancel-best-effort.pdf", ["page one"], pad_bytes=9 * MEGABYTE)
    task_id = "task-cancel-best-effort"
    cancellation = cancellation_registry.create(task_id)

    thread, holder, path_service = _start_cloud_job(provider, pdf, task_id)

    # The abort fails, but the local state is still correct.
    assert cancellation_registry.cancel(task_id) is True
    assert cancellation.cancelled is True
    assert provider.aborted is False

    # The provider answers later; the answer is discarded, never written.
    provider.release()
    thread.join(timeout=30)

    summary = holder["summary"]
    assert summary.job_results[0]["status"] == "cancelled"
    assert list(path_service.output_dir.glob("*.md")) == []


def test_a_cancelled_job_never_becomes_a_parked_job() -> None:
    class ParkingService:
        """A provider failure that would park the job, after the cancel."""

        def convert(self, source_path, *, consent_granted: bool, cancellation=None):
            raise ProviderParkedError(info_for(FailureCause.RATE_LIMITED))

    pdf = _write_pdf("cancel-not-parked.pdf", ["page one"], pad_bytes=9 * MEGABYTE)
    task_id = "task-cancel-not-parked"
    cancellation_registry.create(task_id)
    cancellation_registry.cancel(task_id)

    adapter = NullAdapter()
    queue = QueueService(
        ocr_engine=adapter,
        path_service=PathService(base_dir=str(_TEST_ROOT / "out-not-parked")),
        cloud_conversion_service=ParkingService(),
    )

    summary = queue.process_image_paths(
        [pdf],
        adapter,
        consent_granted=True,
        task_id=task_id,
    )

    assert len(summary.job_results) == 1
    assert summary.job_results[0]["status"] == "cancelled"
    assert summary.job_results[0]["status"] != "waiting"
