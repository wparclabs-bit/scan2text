from __future__ import annotations

from scan2text.cloud.models import CredentialDescriptor
from scan2text.services.credential_store import (
    CredentialStore,
    DpapiEncryptedFileStore,
    describe_credential,
)


class FakeCredentialApi:
    def __init__(self, fail_write: bool = False) -> None:
        self.values: dict[str, str] = {}
        self.fail_write = fail_write

    def write(self, target: str, secret: str) -> None:
        if self.fail_write:
            raise OSError("credential manager unavailable")
        self.values[target] = secret

    def read(self, target: str) -> str | None:
        return self.values.get(target)

    def delete(self, target: str) -> None:
        self.values.pop(target, None)


class FakeProtector:
    def protect(self, data: bytes) -> bytes:
        return b"encrypted:" + data[::-1]

    def unprotect(self, data: bytes) -> bytes:
        if not data.startswith(b"encrypted:"):
            raise OSError("invalid protected data")
        return data.removeprefix(b"encrypted:")[::-1]


def test_windows_credential_manager_round_trips_secret() -> None:
    primary = FakeCredentialApi()
    fallback = FakeCredentialApi()
    store = CredentialStore(primary, fallback, target="Scan2Text:CloudProvider")

    store.write("credential-fixture")

    assert store.read() == "credential-fixture"
    assert primary.values["Scan2Text:CloudProvider"] == "credential-fixture"
    assert fallback.values == {}


def test_dpapi_fallback_is_used_when_credential_manager_fails(tmp_path) -> None:
    primary = FakeCredentialApi(fail_write=True)
    fallback = FakeCredentialApi()
    store = CredentialStore(primary, fallback, target="Scan2Text:CloudProvider")

    store.write("credential-fixture")

    assert store.read() == "credential-fixture"
    assert fallback.values["Scan2Text:CloudProvider"] == "credential-fixture"


def test_delete_removes_secret() -> None:
    primary = FakeCredentialApi()
    fallback = FakeCredentialApi()
    store = CredentialStore(primary, fallback, target="Scan2Text:CloudProvider")
    store.write("credential-fixture")

    store.delete()

    assert store.read() is None
    assert primary.values == {}
    assert fallback.values == {}


def test_descriptor_contains_only_identifier_and_last_four() -> None:
    descriptor = describe_credential("Scan2Text:CloudProvider", "credential-fixture")

    assert isinstance(descriptor, CredentialDescriptor)
    assert descriptor.model_dump() == {
        "key_id": "Scan2Text:CloudProvider",
        "last_four": "ture",
    }
    assert "credential-fixture" not in repr(descriptor)


def test_dpapi_fallback_file_does_not_contain_plaintext(tmp_path) -> None:
    path = tmp_path / "cloud-credential.bin"
    store = DpapiEncryptedFileStore(path, protector=FakeProtector())

    store.write("Scan2Text:CloudProvider", "credential-fixture")

    assert b"credential-fixture" not in path.read_bytes()
    assert store.read("Scan2Text:CloudProvider") == "credential-fixture"
