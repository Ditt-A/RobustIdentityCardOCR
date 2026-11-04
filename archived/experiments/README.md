# Development versions

The nested `v3-27.zip` and `v27-28.zip` archives are extracted and their source revisions are consolidated here. Folder names are preserved because later scripts import earlier version files by their original paths.

| Versions | Focus |
| --- | --- |
| V3 | OCR identity consensus baseline |
| V4–V5 | DINOv2 and YOLO/ArcFace visual identity linking |
| V6–V9 | Address consensus, OCR regions, span selection, template audit |
| V10–V13 | Supervised MyKad address ranker and guarded formatting |
| V14–V17 | Targeted GPU re-OCR and document-layout specialists |
| V18–V23 | Country/document group-consensus refinements |
| V24–V27 | Validated route, address-format, name-span, fuzzy-peer gates |
| V28 | Generic-ID unknown-route peer consensus |

`identity_ocr_compfest18.py` is the **portable compatibility core from the supplied V27 bundle**, not the missing full original OCR engine. Only the supplied downstream reproduction is expected to run with this core. Earlier GPU scripts are retained as historical research implementations.

Use the entry points in the repository's `scripts/` folder. Frozen private inputs and generated result directories are staged locally here but ignored by Git. Aggregate metrics are published separately under `reports/metrics/`.
