# Model OCR lokal

Tidak ada weights yang disertakan di folder repo. Simpan model PaddleOCR dalam format inference lokal di folder profil yang dipilih:

- `PP-OCRv6_tiny_det/` dan `PP-OCRv6_tiny_rec/`
- `PP-OCRv6_small_det/` dan `PP-OCRv6_small_rec/` (profil default)
- `PP-OCRv6_medium_det/` dan `PP-OCRv6_medium_rec/`

Setiap folder perlu berisi file inference Paddle yang cocok, termasuk parameter `.pdiparams` dan graph `inference.pdmodel` atau `inference.json`. Pilih profil dengan variabel PowerShell `OCR_PROFILE` sebelum menjalankan `start-local.ps1`.

Unduh model inference dari tautan resmi di [daftar model PaddleOCR](https://www.paddleocr.ai/latest/version3.x/model_list.html) atau panduan [pipeline OCR](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html). Letakkan weights di laptop sendiri. Runner tidak mengunduh model otomatis.

Contoh mengganti profil:

```powershell
$env:OCR_MODEL_ROOT = 'D:\OCR\models'
$env:OCR_PROFILE = 'tiny'
& '.\local_runner\start-local.ps1'
```

Profil yang tersedia: `tiny`, `small`, dan `medium`. `small` menjadi default untuk menjaga kebutuhan perangkat lebih rendah. Pastikan direktori detector dan recognizer berasal dari profil yang sama.

Path individual juga bisa diganti melalui `OCR_DET_MODEL_DIR` dan `OCR_REC_MODEL_DIR` jika bobot detector dan recognizer disimpan di lokasi berbeda.
