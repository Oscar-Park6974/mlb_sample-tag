from __future__ import annotations

import os
from pathlib import Path
from typing import Optional


class RawDataStorage:
    """Persistence adapter.

    If RAW_DATA_BUCKET is set, Google Cloud Storage is used.
    Otherwise the local RAW_DATA_PATH is used for development.
    """

    def __init__(self, local_path: Path):
        self.local_path = local_path
        self.bucket_name = os.environ.get("RAW_DATA_BUCKET", "").strip()
        self.object_name = os.environ.get("RAW_DATA_OBJECT", "raw-data/active.xlsx").strip()

    @property
    def uses_gcs(self) -> bool:
        return bool(self.bucket_name)

    def read(self) -> Optional[bytes]:
        if self.uses_gcs:
            from google.cloud import storage

            client = storage.Client()
            blob = client.bucket(self.bucket_name).blob(self.object_name)
            if not blob.exists(client):
                return None
            return blob.download_as_bytes()

        if self.local_path.exists():
            return self.local_path.read_bytes()
        return None

    def write(self, content: bytes, content_type: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") -> None:
        if self.uses_gcs:
            from google.cloud import storage

            client = storage.Client()
            blob = client.bucket(self.bucket_name).blob(self.object_name)
            blob.upload_from_string(content, content_type=content_type)
            return

        self.local_path.parent.mkdir(parents=True, exist_ok=True)
        self.local_path.write_bytes(content)
