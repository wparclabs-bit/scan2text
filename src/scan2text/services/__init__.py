"""Scan2Text service layer — Phase 2 services."""

from scan2text.services.file_service import (
    DiscoveredFile,
    DiscoveryResult,
    FileService,
    SkippedFile,
)
from scan2text.services.output_service import OutputService
from scan2text.services.path_service import PathService
from scan2text.services.queue_service import BatchSummary, QueueService
from scan2text.services.settings_service import SettingsError, SettingsService

__all__ = [
    # Services
    "PathService",
    "SettingsService",
    "SettingsError",
    "FileService",
    "OutputService",
    "QueueService",
    "BatchSummary",
    # DTOs
    "DiscoveredFile",
    "DiscoveryResult",
    "SkippedFile",
]
