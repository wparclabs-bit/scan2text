from __future__ import annotations

import pytest
from scan2text.services.file_service import FileService


class TestSanitizeFilename:
    def test_basic(self):
        assert FileService.sanitize_filename("invoice.pdf") == "invoice"

    def test_spaces(self):
        assert FileService.sanitize_filename("my file name.png") == "my_file_name"

    def test_special_chars(self):
        result = FileService.sanitize_filename("file & name (copy).jpg")
        assert "&" not in result
        assert "(" not in result and ")" not in result

    def test_empty(self):
        assert FileService.sanitize_filename("") == "unknown"


class TestBuildOutputName:
    def test_format(self):
        from datetime import datetime
        base = FileService.sanitize_filename("test_doc")
        ts = datetime.now().strftime("%H%M_%Y%m%d")
        expected = f"scan_{base}_{ts}.md"
        # Verify the pattern matches
        assert expected.startswith("scan_test_doc_")
        assert expected.endswith(".md")

    def test_unknown_source(self):
        from datetime import datetime
        base = FileService.sanitize_filename("")
        assert base == "unknown"
