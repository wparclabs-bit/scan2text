from fastapi import FastAPI
from fastapi.testclient import TestClient

from scan2text.routes.health import router as health_router

app = FastAPI()
app.include_router(health_router)
client = TestClient(app)


def test_health_contract():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["worker"] in ("idle", "busy")
    assert isinstance(body["version"], str) and body["version"]
    ram = body["ram"]
    assert ram["total_mb"] > 0
    assert 0 <= ram["percent"] <= 100
    model = body["model"]
    assert model["name"] == "GLM-OCR 0.9B"
    assert model["loaded"] is False
    assert isinstance(model["files_present"], bool)


def test_health_worker_busy_flag():
    app.state.worker_busy = True
    assert client.get("/api/health").json()["worker"] == "busy"
    app.state.worker_busy = False
    assert client.get("/api/health").json()["worker"] == "idle"


def test_health_model_files_found(tmp_path, monkeypatch):
    (tmp_path / "models").mkdir()
    (tmp_path / "models" / "vlm.gguf").write_bytes(b"x")
    (tmp_path / "models" / "mmproj.gguf").write_bytes(b"x")
    monkeypatch.setenv("SCAN2TEXT_HOME", str(tmp_path))
    assert client.get("/api/health").json()["model"]["files_present"] is True
