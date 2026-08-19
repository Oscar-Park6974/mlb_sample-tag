# MLB Sample Tag Generator

Web application scaffold for generating a **50×90 mm SAMPLE TAG** from MLB season RAW DATA.

## Current v1 rules

- `STYLE NO` → Style/Sample #
- Size → `L` by default; Style beginning with `3F` → `S`
- Vendor → `Nobland`
- `FACTORY` → Factory
- `DESCRIPTION` → Description
- `INITIAL DELIVERY (SHIP DATE)` → Ship Date
- `FABRIC INFO` → Fabric/Content/Weight
- `FNF DESIGNER` → Designer
- `FNF TD` → TD
- E-Pattern 전달 → `YES`
- Every displayed field can be edited before print.

See `docs/FIELD_MAPPING.md` for the complete mapping.

## Local run

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp "27SS MLB RAW DATA 08.19.xlsx" data/raw_data.xlsx
uvicorn app.main:app --reload
```

Open `http://localhost:8000`.

## RAW DATA update

The app provides `POST /api/admin/raw-data` for replacing the workbook. If `ADMIN_TOKEN` is configured, send it in the `X-Admin-Token` header.

Example:

```bash
curl -X POST http://localhost:8000/api/admin/raw-data \
  -H "X-Admin-Token: change-me" \
  -F "file=@27SS MLB RAW DATA 08.19.xlsx"
```

## Google Cloud deployment

Target: GitHub → GitHub Actions → Artifact Registry → Cloud Run.

1. Create a Google Cloud project.
2. Run `scripts/bootstrap_gcp.sh PROJECT_ID`.
3. Configure GitHub OIDC / Workload Identity Federation.
4. Add GitHub repository secrets:
   - `GCP_PROJECT_ID`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_SERVICE_ACCOUNT`
   - `RAW_DATA_BUCKET`
5. Push to `main`; `.github/workflows/deploy.yml` builds and deploys the service.

The workflow deliberately uses GitHub OIDC rather than storing a long-lived Google Cloud service-account key.

## Important production note

Cloud Run container files are not durable. In production set `RAW_DATA_BUCKET`; the app will persist and load the active workbook from **Google Cloud Storage**. Without that variable it falls back to local `data/raw_data.xlsx` for development.

## Printer setup

The UI print stylesheet is fixed to 50×90 mm. Also configure the label printer driver to the same paper size and print at 100% scale with browser headers/footers disabled.
