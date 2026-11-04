# VeriID — OCR Dokumen Identitas

Prototipe web OCR yang siap disajikan sebagai situs statis. Mode overview menggunakan sampel asli yang sudah disamarkan; mode OCR menjalankan baseline di laptop pengguna melalui local runner.

![Screenshot landing page VeriID](screenshots/landing-page.png)

## Deploy situs statis

Halaman utama ada di root repo dan tidak memerlukan proses build atau dependency Node.js. Untuk pratinjau lokal:

~~~powershell
python -m http.server 8000
~~~

Buka http://localhost:8000. Situs overview dapat dipublikasikan lewat GitHub Pages dengan source main dan folder root, atau ke static host lain. Mode OCR lokal tidak berjalan di hosting publik; mode itu harus dibuka dari local runner di laptop pengguna.

## Jalankan OCR lokal

Gunakan Windows dan Python 3.10–3.12. Siapkan dependency CPU:

~~~powershell
.\local_runner\setup-local.ps1
~~~

Weights tidak disertakan dan tidak diunduh otomatis. Unduh pasangan detector dan recognizer PaddleOCR yang cocok, lalu simpan secara lokal di:

- models/PP-OCRv6_small_det/
- models/PP-OCRv6_small_rec/

Path model dan opsi profil dijelaskan di [models/README.md](models/README.md). Jalankan server yang hanya bind ke laptop ini:

~~~powershell
.\local_runner\start-local.ps1
~~~

Buka http://127.0.0.1:8787, pilih **Jalankan lokal**, lalu unggah gambar. Gambar dikirim hanya ke API loopback di perangkat itu; website tidak menerima data OCR. Model dimuat saat permintaan OCR pertama.

## Metode dan batasan

Diagram riset di [docs/assets/ocr_architecture.png](docs/assets/ocr_architecture.png) mencatat PP-OCRv6 Medium dan OpenOCR SVTRv2 Server. Repository publik tidak menyertakan engine OCR lengkap atau weights V28. Karena itu, local runner menggunakan PP-OCRv6 small sebagai baseline CPU; ini bukan reproduksi V28 dan bukan klaim performa produksi.

Halaman overview menampilkan object placeholder, bukan hasil inferensi. Tiga sampel web berasal dari folder Drive yang diberikan; foto wajah dan nilai identitas disamarkan. File sumber mentah serta ground truth personal tidak disertakan.

## Benchmark repository

Snapshot V28 mengevaluasi 632 gambar berlabel:

| Metrik | Hasil |
| --- | ---: |
| Name Exact Match | 46.20% |
| Date of Birth Exact Match | 70.41% |
| Full Record Exact Match | 37.66% |

Skor alamat 83.70% mencakup baris dengan label alamat kosong. Laporan V27 mencatat 25.0% pada 112 baris yang memiliki alamat. Ini hasil benchmark repository, bukan pengukuran produksi. Lihat [metrik V28](reports/metrics/v28.json) dan [laporan V27](reports/final_v27_report.md).

## Struktur repo

~~~text
index.html, simulasi.html       Situs statis dan simulator
assets/                         Logo, sampel tersamarkan, pratinjau preprocessing
local_runner/                   API OCR lokal untuk Windows
models/                         Path weights lokal; file model diabaikan Git
screenshots/                    Screenshot landing page
docs/                           Diagram arsitektur
reports/                        Laporan akhir dan metrik agregat
archived/                       Eksperimen V3–V28, notebook, skrip, dan catatan riset lama
~~~

Isi archived/ dipertahankan sebagai provenance dan tidak diperlukan untuk menyajikan situs atau menjalankan baseline local runner.
