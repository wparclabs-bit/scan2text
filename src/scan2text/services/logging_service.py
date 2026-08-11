from __future__ import annotations

import datetime
import json
import logging
import re
from logging.handlers import RotatingFileHandler
from pathlib import Path


_FILE_EXT_RE = re.compile(
    r'(\b[A-Za-z0-9_\-.,;:()@#$%^&*+=<>?\[\]{}~`\'"]+\.(?:pdf|jpg|jpeg|png|webp|md|txt)\b)'
)
_WIN_PATH_RE = re.compile(
    r'([A-Za-z]:[/\\][\w\s\-.,;:()@#$%^&*+=<>?\[\]{}~`\'"]+)'
)
_LONG_TEXT_RE = re.compile(r'\S{200,}')


class PrivacyFilter(logging.Filter):
    """Strips file paths and long text blocks from log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        msg = str(record.msg)

        if isinstance(record.args, dict):
            for k, v in list(record.args.items()):
                if isinstance(v, str):
                    record.args[k] = self._sanitize_arg(v)
        elif isinstance(record.args, (list, tuple)):
            sanitized = []
            for item in record.args:
                if isinstance(item, str):
                    sanitized.append(self._sanitize_arg(item))
                else:
                    sanitized.append(item)
            record.args = tuple(sanitized) if isinstance(record.args, tuple) else sanitized

        record.msg = self._sanitize(msg)
        return True

    def _sanitize(self, text: str) -> str:
        text = _WIN_PATH_RE.sub('[FILE_REDACTED]', text)
        text = _FILE_EXT_RE.sub('[FILE_REDACTED]', text)
        text = _LONG_TEXT_RE.sub(lambda m: m.group(0)[:100] + '...[REDACTED]', text)
        return text

    def _sanitize_arg(self, text: str) -> str:
        if len(text) > 40:
            return '[REDACTED]'
        return self._sanitize(text)


class StructuredFormatter(logging.Formatter):
    """Formats log records as JSON for structured OCR events."""

    ALLOWED_KEYS = {
        'extension',
        'byte_count',
        'page_count',
        'duration',
        'error_code',
        'model_version',
        'timestamp',
    }

    def format(self, record: logging.LogRecord) -> str:
        msg = str(record.msg)
        if not msg.startswith('{'):
            return super().format(record)
        try:
            data = json.loads(msg)
        except (json.JSONDecodeError, TypeError):
            return super().format(record)
        filtered = {k: v for k, v in data.items() if k in self.ALLOWED_KEYS}
        return json.dumps(filtered)


def setup_logging(log_path: Path | None = None) -> logging.Logger:
    """Configure rotating file + console handlers with privacy filter."""
    log_file = (log_path or _default_log_path()).resolve()
    log_file.parent.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.INFO)

    fmt = StructuredFormatter()

    # File handler (1 MB per file, keep 1 backup)
    fh = RotatingFileHandler(str(log_file), maxBytes=1_048_576, backupCount=1)
    fh.setFormatter(fmt)
    fh.addFilter(PrivacyFilter())
    root.addHandler(fh)

    # Console handler
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    ch.addFilter(PrivacyFilter())
    root.addHandler(ch)

    def log_ocr_event(
        *,
        extension: str,
        byte_count: int,
        page_count: int,
        duration: float,
        error_code: str | None,
        model_version: str,
    ) -> None:
        payload = {
            'extension': extension,
            'byte_count': byte_count,
            'page_count': page_count,
            'duration': duration,
            'error_code': error_code,
            'model_version': model_version,
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        root.info(json.dumps(payload))

    root.log_ocr_event = log_ocr_event  # type: ignore[attr-defined]
    return root


def _default_log_path() -> Path:
    from scan2text.services.path_service import get_paths
    return get_paths().log_file
