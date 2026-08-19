# RAW DATA ↔ SAMPLE TAG Field Mapping

The current mapping is based on `27SS MLB RAW DATA 08.19.xlsx` and `SAMPLE TAG(1).xlsx`.

| SAMPLE TAG field | Source / rule | Auto | Editable before print |
|---|---|---:|---:|
| Style/Sample # | `STYLE NO` | Yes | Yes |
| Size | Default `L`; if Style starts with `3F`, default `S` | Yes | Yes |
| Description | `DESCRIPTION` | Yes | Yes |
| Vendor | Fixed `Nobland` | Yes | Yes |
| Factory | `FACTORY` | Yes | Yes |
| Fabric/Content/Weight | `FABRIC INFO` | Yes | Yes |
| Washing/Finishing | Blank | No | Yes |
| E-Pattern 전달 | Fixed `YES` | Yes | Yes (YES/NO) |
| Ship Date | `INITIAL DELIVERY (SHIP DATE)` | Yes | Yes |
| Reference Only | Blank checkbox | No | Yes |
| TOP | Blank checkbox | No | Yes |
| Ship (수납) | Blank checkbox | No | Yes |
| Receiving Date | Blank | No | Yes |
| Fitting Date | Blank | No | Yes |
| Designer | `FNF DESIGNER` | Yes | Yes |
| TD | `FNF TD` | Yes | Yes |
| Cnfm Date | Blank | No | Yes |
| Status | Blank | No | Yes |

## Style-level matching rule

The RAW DATA can contain multiple rows for one Style because of color-level records. The generator de-duplicates on `STYLE NO` and uses the first non-empty style-level value. The current v1 assumes Description / Factory / Fabric Info / Ship Date / Designer / TD are consistent for a Style. A future version can expose a conflict picker when values differ.
