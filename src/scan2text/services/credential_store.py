"""Operating-system credential storage for the Cloud provider key.

The primary store is Windows Credential Manager. It is accessed through the
platform ``advapi32`` API with :mod:`ctypes`; no third-party dependency is used.
If Credential Manager is unavailable (notably in some frozen builds), the
fallback encrypts the secret with Windows DPAPI through ``crypt32`` and writes
only the encrypted bytes to ``settings/cloud-credential.bin``.

Neither store logs, returns, or persists the secret outside its encrypted
platform/file representation. Callers receive only a CredentialDescriptor.
"""

from __future__ import annotations

import ctypes
from ctypes import wintypes
from pathlib import Path
from typing import Protocol

from scan2text.cloud.models import CredentialDescriptor


CREDENTIAL_TARGET = "Scan2Text:CloudProvider"
_CRED_TYPE_GENERIC = 1
_CRED_PERSIST_LOCAL_MACHINE = 2
_ERROR_NOT_FOUND = 1168
_CRYPTPROTECT_UI_FORBIDDEN = 0x1


class CredentialApi(Protocol):
    """Minimal platform credential API used by CredentialStore."""

    def write(self, target: str, secret: str) -> None:
        """Store one secret under a target identifier."""

    def read(self, target: str) -> str | None:
        """Read one secret, or return ``None`` when it does not exist."""

    def delete(self, target: str) -> None:
        """Delete one secret when it exists."""


class DataProtector(Protocol):
    """Encryption boundary used by the encrypted-file fallback."""

    def protect(self, data: bytes) -> bytes:
        """Encrypt bytes for the current Windows user."""

    def unprotect(self, data: bytes) -> bytes:
        """Decrypt bytes for the current Windows user."""


class CredentialStore:
    """Credential store with a Windows primary and an encrypted-file fallback."""

    def __init__(
        self,
        primary: CredentialApi,
        fallback: CredentialApi,
        *,
        target: str = CREDENTIAL_TARGET,
    ) -> None:
        self._primary = primary
        self._fallback = fallback
        self.target = target

    def write(self, secret: str) -> None:
        if not secret:
            raise ValueError("Credential cannot be empty")
        try:
            self._primary.write(self.target, secret)
        except OSError:
            self._fallback.write(self.target, secret)

    def read(self) -> str | None:
        try:
            value = self._primary.read(self.target)
        except OSError:
            value = None
        if value is not None:
            return value
        try:
            return self._fallback.read(self.target)
        except OSError:
            return None

    def delete(self) -> None:
        for api in (self._primary, self._fallback):
            try:
                api.delete(self.target)
            except OSError:
                continue


def describe_credential(target: str, secret: str) -> CredentialDescriptor:
    """Return the only credential information that may leave the backend."""
    last_four = secret[-4:] if len(secret) >= 4 else ""
    return CredentialDescriptor(key_id=target, last_four=last_four)


class _CREDENTIALW(ctypes.Structure):
    _fields_ = [
        ("Flags", wintypes.DWORD),
        ("Type", wintypes.DWORD),
        ("TargetName", wintypes.LPWSTR),
        ("Comment", wintypes.LPWSTR),
        ("LastWritten", wintypes.FILETIME),
        ("CredentialBlobSize", wintypes.DWORD),
        ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)),
        ("Persist", wintypes.DWORD),
        ("AttributeCount", wintypes.DWORD),
        ("Attributes", ctypes.c_void_p),
        ("TargetAlias", wintypes.LPWSTR),
        ("UserName", wintypes.LPWSTR),
    ]


class WindowsCredentialManager:
    """Windows Credential Manager adapter using only ``ctypes`` and ``advapi32``."""

    def __init__(self, target: str = CREDENTIAL_TARGET) -> None:
        self.target = target
        self._api = ctypes.WinDLL("advapi32", use_last_error=True)
        self._api.CredWriteW.argtypes = [
            ctypes.POINTER(_CREDENTIALW),
            wintypes.DWORD,
        ]
        self._api.CredWriteW.restype = wintypes.BOOL
        self._api.CredReadW.argtypes = [
            wintypes.LPCWSTR,
            wintypes.DWORD,
            wintypes.DWORD,
            ctypes.POINTER(ctypes.POINTER(_CREDENTIALW)),
        ]
        self._api.CredReadW.restype = wintypes.BOOL
        self._api.CredDeleteW.argtypes = [
            wintypes.LPCWSTR,
            wintypes.DWORD,
            wintypes.DWORD,
        ]
        self._api.CredDeleteW.restype = wintypes.BOOL
        self._api.CredFree.argtypes = [ctypes.c_void_p]
        self._api.CredFree.restype = None

    def write(self, target: str, secret: str) -> None:
        encoded = secret.encode("utf-16-le")
        blob = ctypes.create_string_buffer(encoded)
        credential = _CREDENTIALW()
        credential.Type = _CRED_TYPE_GENERIC
        credential.TargetName = target
        credential.CredentialBlobSize = len(encoded)
        credential.CredentialBlob = ctypes.cast(blob, ctypes.POINTER(ctypes.c_ubyte))
        credential.Persist = _CRED_PERSIST_LOCAL_MACHINE
        credential.UserName = "Scan2Text"
        if not self._api.CredWriteW(ctypes.byref(credential), 0):
            raise OSError(ctypes.get_last_error(), "CredWriteW failed")

    def read(self, target: str) -> str | None:
        pointer = ctypes.POINTER(_CREDENTIALW)()
        if not self._api.CredReadW(
            target,
            _CRED_TYPE_GENERIC,
            0,
            ctypes.byref(pointer),
        ):
            error = ctypes.get_last_error()
            if error == _ERROR_NOT_FOUND:
                return None
            raise OSError(error, "CredReadW failed")
        try:
            credential = pointer.contents
            encoded = ctypes.string_at(
                credential.CredentialBlob,
                credential.CredentialBlobSize,
            )
            return encoded.decode("utf-16-le")
        finally:
            self._api.CredFree(pointer)

    def delete(self, target: str) -> None:
        if self._api.CredDeleteW(target, _CRED_TYPE_GENERIC, 0):
            return
        error = ctypes.get_last_error()
        if error != _ERROR_NOT_FOUND:
            raise OSError(error, "CredDeleteW failed")


class _DATA_BLOB(ctypes.Structure):
    _fields_ = [
        ("cbData", wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_ubyte)),
    ]


class WindowsDpapiProtector:
    """DPAPI user-scope encryption through ``crypt32`` and the standard library."""

    def __init__(self) -> None:
        self._crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
        self._kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

    def protect(self, data: bytes) -> bytes:
        source = ctypes.create_string_buffer(data)
        source_blob = _DATA_BLOB(
            len(data),
            ctypes.cast(source, ctypes.POINTER(ctypes.c_ubyte)),
        )
        output_blob = _DATA_BLOB()
        if not self._crypt32.CryptProtectData(
            ctypes.byref(source_blob),
            None,
            None,
            None,
            None,
            _CRYPTPROTECT_UI_FORBIDDEN,
            ctypes.byref(output_blob),
        ):
            raise OSError(ctypes.get_last_error(), "CryptProtectData failed")
        try:
            return ctypes.string_at(output_blob.pbData, output_blob.cbData)
        finally:
            self._kernel32.LocalFree(output_blob.pbData)

    def unprotect(self, data: bytes) -> bytes:
        source = ctypes.create_string_buffer(data)
        source_blob = _DATA_BLOB(
            len(data),
            ctypes.cast(source, ctypes.POINTER(ctypes.c_ubyte)),
        )
        output_blob = _DATA_BLOB()
        if not self._crypt32.CryptUnprotectData(
            ctypes.byref(source_blob),
            None,
            None,
            None,
            None,
            _CRYPTPROTECT_UI_FORBIDDEN,
            ctypes.byref(output_blob),
        ):
            raise OSError(ctypes.get_last_error(), "CryptUnprotectData failed")
        try:
            return ctypes.string_at(output_blob.pbData, output_blob.cbData)
        finally:
            self._kernel32.LocalFree(output_blob.pbData)


class DpapiEncryptedFileStore:
    """Documented fallback: one DPAPI-encrypted file for the Cloud key."""

    def __init__(
        self,
        path: Path,
        protector: DataProtector | None = None,
    ) -> None:
        self.path = path
        self._protector = protector or WindowsDpapiProtector()

    def write(self, target: str, secret: str) -> None:
        del target
        self.path.parent.mkdir(parents=True, exist_ok=True)
        protected = self._protector.protect(secret.encode("utf-8"))
        self.path.write_bytes(protected)

    def read(self, target: str) -> str | None:
        del target
        if not self.path.exists():
            return None
        return self._protector.unprotect(self.path.read_bytes()).decode("utf-8")

    def delete(self, target: str) -> None:
        del target
        self.path.unlink(missing_ok=True)


def build_default_credential_store(settings_dir: Path) -> CredentialStore:
    """Build the production Credential Manager store and encrypted fallback."""
    primary = WindowsCredentialManager(CREDENTIAL_TARGET)
    fallback = DpapiEncryptedFileStore(settings_dir / "cloud-credential.bin")
    return CredentialStore(primary, fallback, target=CREDENTIAL_TARGET)
