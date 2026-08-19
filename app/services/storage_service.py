from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional


class RawDataStorage:
    """Persistence adapter for season-based RAW DATA workbooks.

    GCS layout: raw-data/{SEASON}/active.xlsx
    Local layout: data/{SEASON}/active.xlsx
    """

    def __init__(self, local_path: Path):
        self.local_path = local_path
        self.bucket_name = os.environ.get("RAW_DATA_BUCKET", "").strip()
        self.prefix = os.environ.get("RAW_DATA_PREFIX", "raw-data").strip().strip("/")

    @property
    def uses_gcs(self) -> bool:
        return bool(self.bucket_name)

    def _object_name(self, season: str) -> str:
        safe = season.strip().upper().replace("/", "-")
        return f"{self.prefix}/{safe}/active.xlsx"

    def _local_file(self, season: str) -> Path:
        safe = season.strip().upper().replace("/", "-")
        return self.local_path.parent / safe / "active.xlsx"

    def list_seasons(self) -> List[str]:
        seasons = set()
        if self.uses_gcs:
            from google.cloud import storage

            client = storage.Client()
            for blob in client.list_blobs(self.bucket_name, prefix=f"{self.prefix}/"):
                parts = blob.name.split("/")
                if len(parts) >= 3 and parts[-1] == "active.xlsx":
                    seasons.add(parts[-2].upper())
        else:
            base = self.local_path.parent
            if base.exists():
                for item in base.iterdir():
                    if item.is_dir() and (item / "active.xlsx").exists():
                        seasons.add(item.name.upper())
        return sorted(seasons, reverse=True)

    def read(self, season: str) -> Optional[bytes]:
        if self.uses_gcs:
            from google.cloud import storage

            client = storage.Client()
            blob = client.bucket(self.bucket_name).blob(self._object_name(season))
            if not blob.exists(client):
                return None
            return blob.download_as_bytes()

        path = self._local_file(season)
        return path.read_bytes() if path.exists() else None

    def write(self, season: str, content: bytes, content_type: str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") -> None:
        if self.uses_gcs:
            from google.cloud import storage

            client = storage.Client()
            blob = client.bucket(self.bucket_name).blob(self._object_name(season))
            blob.upload_from_string(content, content_type=content_type)
            return

        path = self._local_file(season)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
