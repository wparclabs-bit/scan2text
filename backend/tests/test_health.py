from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["worker"] in ("idle", "busy")
    assert body["version"]


def test_health_ram_sane():
    body = client.get("/health").json()
    ram = body["ram"]
    assert ram["total_mb"] > 0
    assert 0 <= ram["percent"] <= 100


def test_health_model_files_detected():
    body = client.get("/health").json()
    model = body["model"]
    assert model["loaded"] is False
    assert model["name"] == "GLM-OCR 0.9B"
    assert model["files_present"] is True
