# Architecture

## v1

```text
User Browser
    │
    ├─ Style search / edit / 50×90 mm preview / print
    │
    ▼
FastAPI application (Cloud Run)
    │
    ├─ RAW DATA Excel parser
    └─ style-level in-memory index
          ▲
          │
   Admin RAW DATA upload
```

## Production target

```text
GitHub
  └─ GitHub Actions (OIDC)
        ├─ Build container
        ├─ Push Artifact Registry
        └─ Deploy Cloud Run

Cloud Run
  ├─ public tag UI/API
  ├─ read-only style lookup
  └─ admin RAW DATA update endpoint

Cloud Storage (recommended v1.1)
  └─ season/master RAW DATA files
```

### Public-use principle
Public users should receive only the tag fields needed for a selected Style. The full RAW DATA workbook should not be exposed to browsers.

### Printing
The browser print stylesheet uses `@page { size: 50mm 90mm; margin: 0; }`. Printer driver paper size must also be configured to 50×90 mm (or the exact purchased label stock size) and scaling should be 100%.
