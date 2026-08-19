from __future__ import annotations

import os
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.models import HealthResponse, SampleTagData, UploadResponse
from app.services.excel_service import RawDataStore
from app.services.storage_service import RawDataStorage

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR.parent / "data"
LOCAL_RAW_PATH = Path(os.environ.get("RAW_DATA_PATH", DATA_DIR / "raw_data.xlsx"))
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
persistence = RawDataStorage(LOCAL_RAW_PATH)

app = FastAPI(title="MLB Sample Tag Generator", version="0.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

store = RawDataStore.empty()


def load_persisted_if_present() -> None:
    global store
    content = persistence.read()
    if content:
        store = RawDataStore.from_xlsx_bytes(content)


@app.on_event("startup")
def startup() -> None:
    load_persisted_if_present()


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/styles", response_model=List[str])
def list_styles(q: str = Query(default="", max_length=50)) -> List[str]:
    return store.list_styles(q)[:200]


@app.get("/api/styles/{style_no}", response_model=SampleTagData)
def get_style(style_no: str) -> SampleTagData:
    record = store.get(style_no)
    if not record:
        raise HTTPException(status_code=404, detail="Style not found")
    return record


@app.post("/api/admin/raw-data", response_model=UploadResponse)
async def upload_raw_data(
    file: UploadFile = File(...),
    x_admin_token: str = Header(default=""),
) -> UploadResponse:
    global store
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")

    content = await file.read()
    try:
        new_store = RawDataStore.from_xlsx_bytes(content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid RAW DATA workbook: {exc}") from exc

    persistence.write(content)
    store = new_store
    return UploadResponse(
        filename=file.filename,
        style_count=len(store.styles),
        message="RAW DATA updated successfully",
    )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")
