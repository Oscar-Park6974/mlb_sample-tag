from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from io import BytesIO
from typing import Dict, List, Optional

from openpyxl import load_workbook

from app.models import SampleTagData

HEADER_ALIASES = {
    "STYLE NO": "style_no", "COLOR CODE": "color_code", "FACTORY": "factory",
    "INITIAL DELIVERY (SHIP DATE)": "ship_date", "FABRIC INFO": "fabric_info",
    "FNF DESIGNER": "designer", "FNF TD": "td",
}

def normalize_header(value: object) -> str:
    return "" if value is None else " ".join(str(value).replace("\n", " ").split()).strip().upper()

def excel_serial_to_date(value: object) -> str:
    if value in (None, ""): return ""
    if isinstance(value, datetime): return value.strftime("%Y-%m-%d")
    if isinstance(value, date): return value.strftime("%Y-%m-%d")
    if isinstance(value, (int, float)):
        try: return (datetime(1899, 12, 30) + timedelta(days=float(value))).strftime("%Y-%m-%d")
        except Exception: return str(value)
    return str(value).strip()

def default_size(style_no: str) -> str:
    return "S" if (style_no or "").upper().startswith("3F") else "L"

@dataclass
class RawDataStore:
    styles: Dict[str, SampleTagData]
    variants: Dict[str, Dict[str, SampleTagData]]

    @classmethod
    def empty(cls) -> "RawDataStore":
        return cls(styles={}, variants={})

    @classmethod
    def from_xlsx_bytes(cls, content: bytes) -> "RawDataStore":
        wb = load_workbook(BytesIO(content), data_only=True, read_only=True)
        ws = wb[wb.sheetnames[0]]
        header_row = None; col_map: Dict[str, int] = {}
        for row_idx in range(1, min(ws.max_row, 20) + 1):
            current = {}
            for col_idx, cell in enumerate(ws[row_idx], start=1):
                key = normalize_header(cell.value)
                if key in HEADER_ALIASES: current[HEADER_ALIASES[key]] = col_idx
            if "style_no" in current:
                header_row, col_map = row_idx, current; break
        if header_row is None: raise ValueError("Could not find STYLE NO header in workbook")

        variants: Dict[str, Dict[str, SampleTagData]] = {}
        for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
            def get(field: str):
                idx = col_map.get(field); return row[idx - 1] if idx else None
            style = str(get("style_no") or "").strip()
            if not style: continue
            color = str(get("color_code") or "").strip()
            candidate = SampleTagData(
                style_sample_no=style, size=default_size(style), description=color, vendor="Nobland",
                factory=str(get("factory") or "").strip(), fabric_info=str(get("fabric_info") or "").strip(),
                e_pattern="YES", ship_date=excel_serial_to_date(get("ship_date")),
                designer=str(get("designer") or "").strip(), td=str(get("td") or "").strip(),
            )
            key = color or "(NO COLOR CODE)"
            variants.setdefault(style, {})[key] = candidate
        wb.close()
        styles = {style: next(iter(color_map.values())) for style, color_map in variants.items() if color_map}
        return cls(styles=styles, variants=variants)

    def list_styles(self, query: str = "") -> List[str]:
        q = (query or "").strip().upper(); items = sorted(self.styles.keys())
        return items if not q else [s for s in items if q in s.upper()]

    def list_colors(self, style_no: str) -> List[str]:
        return sorted(self.variants.get(style_no, {}).keys())

    def get(self, style_no: str, color_code: str = "") -> Optional[SampleTagData]:
        if color_code:
            return self.variants.get(style_no, {}).get(color_code)
        return self.styles.get(style_no)
