"""Production entry point for the frozen Scan2Text backend executable.

When bundled with PyInstaller as scan2text-backend.exe, this module
starts uvicorn bound to 127.0.0.1:47351. In dev mode (not frozen),
it falls back to 127.0.0.1:8000 so existing workflows are unchanged.
"""

from __future__ import annotations

import logging
import uvicorn

from scan2text.api.main import app
from scan2text.utils.prod_runtime import get_host, get_port

logger = logging.getLogger("scan2text.prod")


def main() -> None:
    host = get_host()
    port = get_port()
    logger.info("Starting Scan2Text backend on %s:%d", host, port)
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
