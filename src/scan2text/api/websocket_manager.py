"""In-memory WebSocket connection manager for task-specific progress broadcasting."""

from __future__ import annotations

import logging
from typing import Any, Dict, Set

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections and broadcasts messages to them."""

    def __init__(self) -> None:
        self._connections: Set[Any] = set()

    async def connect(self, websocket) -> None:
        """Register a new WebSocket connection."""
        self._connections.add(websocket)
        logger.debug("WebSocket connected (%d total)", len(self._connections))

    async def disconnect(self, websocket) -> None:
        """Remove a WebSocket connection."""
        self._connections.discard(websocket)
        logger.debug("WebSocket disconnected (%d total)", len(self._connections))

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Send a JSON message to all connected clients."""
        dead: list[Any] = []
        for connection in self._connections:
            try:
                await connection.send_json(message)
            except Exception as exc:
                logger.warning("Failed to send to client: %s", exc)
                dead.append(connection)
        for connection in dead:
            self._connections.discard(connection)
