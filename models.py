from pydantic import BaseModel, Field
from typing import Optional


class SampleTagData(BaseModel):
    style_sample_no: str = ""
    size: str = "L"
    description: str = ""
    vendor: str = "Nobland"
    factory: str = ""
    fabric_info: str = ""
    washing_finishing: str = ""
    e_pattern: str = "YES"
    ship_date: str = ""
    receiving_date: str = ""
    fitting_date: str = ""
    designer: str = ""
    td: str = ""
    confirm_date: str = ""
    status: str = ""
    reference_only: bool = False
    top_sample: bool = False
    ship_sample: bool = False


class UploadResponse(BaseModel):
    filename: str
    style_count: int
    message: str


class HealthResponse(BaseModel):
    status: str = Field(default="ok")
