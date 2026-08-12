import json
from pathlib import Path

data = {
    "app_version": "1.0.0",
    "app_download_url": "https://drive.google.com/uc?export=download&id=PLACEHOLDER_APP_ID",
    "vlm_download_url": "https://drive.google.com/uc?export=download&id=15oefDp7U_VMj2cdJ7xiOP9WlCwN2_lEl",
    "vlm_sha256": "c036cbb7553a909f8b8877d4461924307f27ecb66cff928eeeafd569c3887e29",
    "vlm_size_bytes": 5242880,
    "mmproj_download_url": "https://drive.google.com/uc?export=download&id=1YOj0m9PzYKdPtACrZuQLtcZQZjxf3DMz",
    "mmproj_sha256": "5647f05ec18958947d32874eeb788fa396a05d0bab7c1b71f112ceb7e9b31eee",
    "mmproj_size_bytes": 2097152,
    "release_notes": ["Live-fire dummy"]
}

Path("version.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
print("SUCCESS: version.json nuked and paved. Zero ghost spaces.")