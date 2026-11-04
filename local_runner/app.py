"""Loopback-only web server for the local VeriID OCR demo."""

from __future__ import annotations

import ipaddress
import logging
import warnings
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError

try:
    from .pipeline import ModelNotReadyError, model_status, run_pipeline
except ImportError:
    from pipeline import ModelNotReadyError, model_status, run_pipeline


WEB_DIR = Path(__file__).resolve().parents[1]
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 6_000_000
MAX_IMAGE_EDGE = 4_000
STATIC_SUFFIXES = {".html", ".css", ".js", ".svg", ".jpg", ".jpeg", ".png", ".webp", ".ico"}
ALLOWED_HOSTS = {"127.0.0.1:8787", "localhost:8787"}
ALLOWED_ORIGINS = {"http://127.0.0.1:8787", "http://localhost:8787"}
logger = logging.getLogger("veriid.local")

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; img-src 'self' blob: data:; script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; connect-src 'self'; "
        "form-action 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    )
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response


def _check_local_host(request: Request) -> None:
    host = request.headers.get("host", "").lower()
    if host not in ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail="Use the local runner address 127.0.0.1:8787.")

    client_host = request.client.host if request.client else ""
    try:
        if not ipaddress.ip_address(client_host).is_loopback:
            raise HTTPException(status_code=403, detail="The API accepts connections only from this device.")
    except ValueError:
        raise HTTPException(status_code=403, detail="The API accepts loopback connections only.") from None


def _check_browser_origin(request: Request) -> None:
    _check_local_host(request)
    origin = request.headers.get("origin")
    if origin not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=403, detail="Requests are accepted only from the local runner page.")


def _decode_image(data: bytes) -> Image.Image:
    if not data:
        raise HTTPException(status_code=400, detail="The image file is empty.")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as probe:
                if probe.format not in {"JPEG", "PNG", "WEBP"}:
                    raise HTTPException(status_code=415, detail="The image format must be JPG, PNG, or WebP.")
                if probe.width * probe.height > MAX_IMAGE_PIXELS or max(probe.size) > MAX_IMAGE_EDGE:
                    raise HTTPException(status_code=413, detail="The image resolution is too large for the local demo.")
                probe.verify()

            with Image.open(BytesIO(data)) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(status_code=415, detail="The file could not be read as a valid image.") from None

    return image


async def _read_limited(upload: UploadFile) -> bytes:
    content = bytearray()
    while True:
        chunk = await upload.read(64 * 1024)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="The image exceeds the 8 MB limit.")
    return bytes(content)


@app.get("/api/health")
async def health(request: Request):
    _check_local_host(request)
    return model_status()


@app.post("/api/ocr")
async def ocr(request: Request, file: UploadFile = File(...)):
    _check_browser_origin(request)
    try:
        content = await _read_limited(file)
    finally:
        await file.close()

    image = _decode_image(content)
    if not model_status()["ready"]:
        raise HTTPException(status_code=503, detail="Local model weights are incomplete. Check the model folders shown on the page.")

    try:
        return await run_in_threadpool(run_pipeline, image)
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    except Exception as exc:
        logger.error("Local OCR pipeline failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail=f"The local pipeline failed ({type(exc).__name__}). Check the installation and local models.") from None


@app.get("/", include_in_schema=False)
async def home(request: Request):
    _check_local_host(request)
    return FileResponse(WEB_DIR / "index.html", headers={"Cache-Control": "no-cache"})


@app.get("/{asset_path:path}", include_in_schema=False)
async def static_asset(request: Request, asset_path: str):
    _check_local_host(request)
    target = (WEB_DIR / asset_path).resolve()
    try:
        target.relative_to(WEB_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found.") from None

    if any(part.lower() in {"local_runner", "models", ".venv", "__pycache__"} for part in target.relative_to(WEB_DIR.resolve()).parts):
        raise HTTPException(status_code=404, detail="File not found.")
    if not target.is_file() or target.suffix.lower() not in STATIC_SUFFIXES:
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(target)
