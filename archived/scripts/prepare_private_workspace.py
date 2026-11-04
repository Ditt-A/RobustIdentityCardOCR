"""Stage authorized frozen inputs for the portable V27/V28 reproduction."""
from pathlib import Path
import argparse
import shutil

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--bundle", type=Path, default=ROOT / "private/extracted_versions/v27-28")
args = parser.parse_args()
source = args.bundle.resolve()
if not source.is_dir():
    raise SystemExit(f"Authorized extracted V27 bundle not found: {source}")
for name in ["reference_outputs", "results", "results_v3_stable", "results_v17_per_layout_generic_mrz", "results_v22_final_permit_ukraine_consensus", "reports"]:
    if (source / name).is_dir():
        shutil.copytree(source / name, ROOT / "experiments" / name, dirs_exist_ok=True)
print("Local frozen inputs staged under experiments/ (ignored by Git).")
