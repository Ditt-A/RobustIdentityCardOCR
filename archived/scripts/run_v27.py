"""Run the preserved portable V27 entry point."""
from pathlib import Path
import runpy
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPERIMENTS = ROOT / "experiments"
sys.path.insert(0, str(EXPERIMENTS))
runpy.run_path(str(EXPERIMENTS / "run_v27.py"), run_name="__main__")
