from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Dict, List

from fastapi import FastAPI, File, Form, Header, HTTPException, Query, UploadFile
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

app = FastAPI(title="MLB Sample Tag Generator", version="0.2.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

stores: Dict[str, RawDataStore] = {}


def normalize_season(season: str) -> str:
    value = season.strip().upper()
    if not re.fullmatch(r"[0-9]{2}(SS|FW)", value):
        raise HTTPException(status_code=400, detail="Season must be formatted like 27SS or 27FW")
    return value


def load_season(season: str) -> RawDataStore:
    season = normalize_season(season)
    if season in stores:
        return stores[season]
    content = persistence.read(season)
    if not content:
        raise HTTPException(status_code=404, detail="RAW DATA not found for selected season")
    stores[season] = RawDataStore.from_xlsx_bytes(content)
    return stores[season]


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/seasons", response_model=List[str])
def list_seasons() -> List[str]:
    return persistence.list_seasons()


@app.get("/api/styles", response_model=List[str])
def list_styles(
    season: str = Query(..., max_length=10),
    q: str = Query(default="", max_length=50),
) -> List[str]:
    store = load_season(season)
    return store.list_styles(q)[:200]


@app.get("/api/styles/{style_no}", response_model=SampleTagData)
def get_style(style_no: str, season: str = Query(..., max_length=10)) -> SampleTagData:
    store = load_season(season)
    record = store.get(style_no)
    if not record:
        raise HTTPException(status_code=404, detail="Style not found")
    return record


@app.post("/api/admin/raw-data", response_model=UploadResponse)
async def upload_raw_data(
    season: str = Form(...),
    file: UploadFile = File(...),
    x_admin_token: str = Header(default=""),
) -> UploadResponse:
    if ADMIN_TOKEN and x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    season = normalize_season(season)
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")

    content = await file.read()
    try:
        new_store = RawDataStore.from_xlsx_bytes(content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid RAW DATA workbook: {exc}") from exc

    persistence.write(season, content)
    stores[season] = new_store
    return UploadResponse(
        filename=file.filename,
        style_count=len(new_store.styles),
        message=f"RAW DATA updated successfully for {season}",
    )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")
