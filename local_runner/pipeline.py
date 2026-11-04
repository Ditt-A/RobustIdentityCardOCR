"""Local-only OCR pipeline. Model dependencies load only on the first OCR call."""

from __future__ import annotations

import os
import re
import tempfile
import threading
import time
from pathlib import Path
from typing import Any

from PIL import Image


WEB_DIR = Path(__file__).resolve().parents[1]
MODEL_ROOT = Path(os.environ.get("OCR_MODEL_ROOT", WEB_DIR / "models")).expanduser()
PROFILE_NAME = os.environ.get("OCR_PROFILE", "small").strip().lower()
PROFILES = {
    "tiny": ("PP-OCRv6_tiny_det", "PP-OCRv6_tiny_rec"),
    "small": ("PP-OCRv6_small_det", "PP-OCRv6_small_rec"),
    "medium": ("PP-OCRv6_medium_det", "PP-OCRv6_medium_rec"),
}


class ModelNotReadyError(RuntimeError):
    """Raised when the locally configured model bundle is incomplete."""


_load_lock = threading.Lock()
_inference_lock = threading.Lock()
_ocr_engine: Any | None = None


def profile_models() -> tuple[str, str]:
    if PROFILE_NAME not in PROFILES:
        raise RuntimeError("OCR_PROFILE must be tiny, small, or medium.")
    return PROFILES[PROFILE_NAME]


def _path_pair() -> tuple[Path, Path]:
    det_name, rec_name = profile_models()
    det_path = Path(os.environ.get("OCR_DET_MODEL_DIR", MODEL_ROOT / det_name)).expanduser()
    rec_path = Path(os.environ.get("OCR_REC_MODEL_DIR", MODEL_ROOT / rec_name)).expanduser()
    return det_path.resolve(), rec_path.resolve()


def _has_static_bundle(path: Path) -> bool:
    if not path.is_dir():
        return False
    files = [child for child in path.iterdir() if child.is_file()]
    has_parameters = any(child.suffix.lower() in {".pdiparams", ".pdparams"} for child in files)
    has_graph = any(child.name in {"inference.pdmodel", "inference.json"} for child in files)
    return has_parameters and has_graph


def _display_path(path: Path, default_name: str) -> str:
    env_name = f"OCR_{default_name.upper()}_MODEL_DIR"
    if os.environ.get(env_name):
        return f"${env_name}"
    try:
        return f"{path.relative_to(WEB_DIR.resolve()).as_posix()}/"
    except ValueError:
        return f"$OCR_MODEL_ROOT/{path.name}/"


def model_status() -> dict[str, Any]:
    if PROFILE_NAME not in PROFILES:
        return {
            "ready": False,
            "loaded": False,
            "model_label": "PP-OCRv6 (unknown profile)",
            "model_paths": {
                "det": "$OCR_DET_MODEL_DIR",
                "rec": "$OCR_REC_MODEL_DIR",
            },
            "message": "OCR_PROFILE must be tiny, small, or medium.",
        }

    det_name, rec_name = profile_models()
    det_path, rec_path = _path_pair()
    det_ready = _has_static_bundle(det_path)
    rec_ready = _has_static_bundle(rec_path)
    missing = []
    if not det_ready:
        missing.append(_display_path(det_path, "det"))
    if not rec_ready:
        missing.append(_display_path(rec_path, "rec"))
    return {
        "ready": det_ready and rec_ready,
        "loaded": _ocr_engine is not None,
        "model_label": f"PP-OCRv6 {PROFILE_NAME}",
        "model_paths": {
            "det": _display_path(det_path, "det"),
            "rec": _display_path(rec_path, "rec"),
        },
        "message": "Local model weights are incomplete: " + ", ".join(missing) if missing else "Local model weights are ready.",
    }


def load_model() -> Any:
    """Load PP-OCRv6 from explicit local directories; never auto-download weights."""
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine

    with _load_lock:
        if _ocr_engine is not None:
            return _ocr_engine

        status = model_status()
        if not status["ready"]:
            raise ModelNotReadyError(status["message"])

        det_name, rec_name = profile_models()
        det_path, rec_path = _path_pair()
        try:
            from paddleocr import PaddleOCR

            _ocr_engine = PaddleOCR(
                lang="en",
                text_detection_model_name=det_name,
                text_detection_model_dir=str(det_path),
                text_recognition_model_name=rec_name,
                text_recognition_model_dir=str(rec_path),
                text_recognition_batch_size=1,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
                device="cpu",
                cpu_threads=2,
            )
        except Exception as exc:
            _ocr_engine = None
            raise RuntimeError(f"Failed to load the local model ({type(exc).__name__}). Check the dependency versions and model files.") from None

    return _ocr_engine


def _preprocess(image: Image.Image) -> tuple[Image.Image, dict[str, Any]]:
    import cv2
    import numpy as np

    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    height, width = rgb.shape[:2]
    scale = min(1.0, 640.0 / max(height, width))
    if scale < 1.0:
        metric_rgb = cv2.resize(
            rgb,
            (max(1, round(width * scale)), max(1, round(height * scale))),
            interpolation=cv2.INTER_AREA,
        )
    else:
        metric_rgb = rgb
    metric_gray = cv2.cvtColor(metric_rgb, cv2.COLOR_RGB2GRAY)
    brightness = float(np.mean(metric_gray))
    contrast = float(np.std(metric_gray))
    sharpness = float(cv2.Laplacian(metric_gray, cv2.CV_64F).var())
    color_variation = float(np.mean(np.std(metric_rgb.astype(np.float32), axis=2)))

    if contrast < 38 or brightness < 58 or brightness > 218:
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        prepared = clahe.apply(gray)
        mode = "grayscale_clahe"
    elif color_variation < 8.0:
        prepared = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        mode = "grayscale"
    else:
        prepared = rgb
        mode = "raw"

    if prepared.ndim == 2:
        prepared = cv2.cvtColor(prepared, cv2.COLOR_GRAY2RGB)
    result = Image.fromarray(prepared)
    return result, {
        "mode": mode,
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "sharpness": round(sharpness, 2),
    }


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, (list, tuple)):
        return list(value)
    return [value]


def _walk_result(value: Any):
    if isinstance(value, (list, tuple)):
        for child in value:
            yield from _walk_result(child)
        return

    if isinstance(value, dict):
        if "rec_texts" in value:
            yield value
            return
        for child in value.values():
            yield from _walk_result(child)
        return

    payload = getattr(value, "json", None)
    if callable(payload):
        try:
            payload = payload()
        except Exception:
            payload = None
    if payload is not None:
        if isinstance(payload, str):
            import json

            try:
                payload = json.loads(payload)
            except ValueError:
                payload = None
        if payload is not None:
            yield from _walk_result(payload)
            return

    if hasattr(value, "res"):
        yield from _walk_result(value.res)


def _recognized_lines(result: Any) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    for block in _walk_result(result):
        texts = _as_list(block.get("rec_texts"))
        scores = _as_list(block.get("rec_scores"))
        for index, text in enumerate(texts):
            normalized = re.sub(r"\s+", " ", str(text)).strip()
            if not normalized:
                continue
            score = scores[index] if index < len(scores) else None
            try:
                confidence = round(float(score), 4) if score is not None else None
            except (TypeError, ValueError):
                confidence = None
            lines.append({"text": normalized, "confidence": confidence})
            if len(lines) >= 200:
                return lines
    return lines


DATE_PATTERN = re.compile(r"\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b")
NAME_LABEL = re.compile(r"^\s*(?:nama(?:\s+lengkap)?|full\s+name|name)\s*[:\uFF1A-]?\s*(.*?)\s*$", re.IGNORECASE)
DATE_LABEL = re.compile(r"\b(?:tanggal\s+lahir|tarikh\s+lahir|date\s+of\s+birth|birth\s+date|dob)\b", re.IGNORECASE)
ADDRESS_LABEL = re.compile(r"^\s*(?:alamat|address)\s*[:\uFF1A-]?\s*(.*?)\s*$", re.IGNORECASE)


def _field_after_label(lines: list[dict[str, Any]], pattern: re.Pattern[str]) -> str | None:
    for line in lines:
        match = pattern.match(line["text"])
        if match:
            value = match.group(1).strip(" :-\t\uFF1A")
            if value:
                return value[:240]
    return None


def _birth_date(lines: list[dict[str, Any]]) -> str | None:
    for line in lines:
        text = line["text"]
        label = DATE_LABEL.search(text)
        if not label:
            continue
        match = DATE_PATTERN.search(text[label.end():])
        if match:
            return match.group(1)
    return None


def extract_object(lines: list[dict[str, Any]]) -> dict[str, Any]:
    """Extract only explicit labelled values; do not guess unlabeled identity fields."""
    return {
        "document_type": None,
        "name": _field_after_label(lines, NAME_LABEL),
        "date_of_birth": _birth_date(lines),
        "address": _field_after_label(lines, ADDRESS_LABEL),
        "ocr_text": lines,
    }


def run_pipeline(image: Image.Image) -> dict[str, Any]:
    engine = load_model()
    prepared, quality = _preprocess(image)

    with tempfile.TemporaryDirectory(prefix="veriid-ocr-") as scratch:
        image_path = Path(scratch) / "input.png"
        prepared.save(image_path, format="PNG", optimize=True)
        started = time.perf_counter()
        with _inference_lock:
            output = engine.predict(str(image_path))
        elapsed_ms = (time.perf_counter() - started) * 1000

    lines = _recognized_lines(output)
    return {
        "object": extract_object(lines),
        "model_label": f"PP-OCRv6 {PROFILE_NAME}",
        "preprocessing": quality,
        "elapsed_ms": round(elapsed_ms, 2),
    }
