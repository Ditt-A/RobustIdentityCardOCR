# Local data setup

Raw identity images, ground truth, row-level OCR predictions, identity groups, and original executed submission files are stored locally and ignored by Git. The public notebook loads these artifacts from disk instead of carrying a base64 ZIP archive in its code.

## Current local workspace

- `private/original_final_project/`: original final-project notebooks, PDFs, images, and ground truth.
- `private/extracted_versions/v3-27/` and `v27-28/`: extracted original nested archives, without Python caches or notebook checkpoints.
- `private/artifacts/`: the submission notebook's extracted 33-file evidence bundle, including its integrity manifest.

Only material from `FINAL PROJECT DSA COMPFEST 18` is present. Neither study-case folder was imported.

## On another machine

Obtain authorized access to the original competition data and portable bundle. Extract the latter locally and stage it with:

```powershell
python scripts/prepare_private_workspace.py --bundle "PATH/TO/V27_REPRODUCIBLE_BUNDLE"
```

For the final notebook, restore the original evidence bundle under `private/artifacts/`, keeping its `MANIFEST.json` and directory structure unchanged. The notebook checks SHA-256 hashes before reading the frozen artifacts. The original model checkpoints and full raw-image OCR engine are not included in the supplied portable bundle.
