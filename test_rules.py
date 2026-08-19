from app.services.excel_service import default_size, excel_serial_to_date


def test_default_size():
    assert default_size("3FWSA0273") == "S"
    assert default_size("3ATSS2071") == "L"


def test_excel_date():
    assert excel_serial_to_date(46330) == "2026-11-04"
