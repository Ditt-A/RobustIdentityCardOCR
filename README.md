# VeriID — Identity Document OCR

VeriID is a deployable static website for exploring redacted identity-document samples and a local OCR baseline. The overview simulator shows a placeholder result; OCR inference is available only through the local runner on the user's computer.

![VeriID landing page preview](screenshots/landing-page.png)

## Deploy the static website

The site lives at the repository root and requires no build step or Node.js dependencies. To preview it locally:

~~~powershell
python -m http.server 8000
~~~

Open http://localhost:8000. The landing page and overview simulator can be published with GitHub Pages using the main branch and repository root, or hosted on another static host. Local OCR is available only when the app is served by the local runner on the same computer.

## Run OCR locally

The local runner requires Windows and Python 3.10–3.12. Install its CPU dependencies:

~~~powershell
.\local_runner\setup-local.ps1
~~~

Model weights are not included or downloaded automatically. Download a compatible PaddleOCR detector and recognizer pair and place them on your computer:

- models/PP-OCRv6_small_det/
- models/PP-OCRv6_small_rec/

See [models/README.md](models/README.md) for model paths and profile options. Start the runner, which binds only to the loopback interface:

~~~powershell
.\local_runner\start-local.ps1
~~~

Open http://127.0.0.1:8787, choose **Run locally**, and upload an image. The image is sent only to the loopback API on that computer. The public website does not receive OCR uploads. The model is loaded on the first OCR request.

## OCR model pipeline architecture

This diagram focuses on the document-understanding model pipeline, from image assessment through structured field extraction.

~~~mermaid
flowchart LR
    Input["Identity document image"] --> Quality["Image quality assessment"]
    Quality --> Preprocess{"Adaptive preprocessing"}
    Preprocess -->|"Standard image"| Raw["Raw image"]
    Preprocess -->|"Low color variation"| Grayscale["Grayscale"]
    Preprocess -->|"Low contrast or extreme brightness"| CLAHE["Grayscale + CLAHE"]

    Raw --> Detection["Text detection<br/>PP-OCRv6 Medium"]
    Grayscale --> Detection
    CLAHE --> Detection
    Detection --> Recognition["Text recognition<br/>OpenOCR SVTRv2 Server"]
    Recognition --> Evidence["OCR evidence<br/>Text · confidence · geometry"]
    Evidence --> Routing["Evidence-driven routing<br/>Text · layout · MRZ cues"]
    Routing --> Extraction["Specialist field extraction<br/>Route-specific logic"]
    Extraction --> Output["Structured fields<br/>Name · date of birth · address"]

    classDef image fill:#eef3ff,stroke:#5374bd,color:#17233a
    classDef model fill:#edf8f3,stroke:#3d8568,color:#172b22
    classDef output fill:#fff7e8,stroke:#b7812b,color:#382b17
    class Input image
    class Quality,Preprocess,Raw,Grayscale,CLAHE,Detection,Recognition,Evidence,Routing,Extraction model
    class Output output
~~~

## Method and limitations

The research architecture in [docs/assets/ocr_architecture.png](docs/assets/ocr_architecture.png) records PP-OCRv6 Medium and OpenOCR SVTRv2 Server. The public repository does not include the complete OCR engine or V28 model weights. The local runner therefore uses PP-OCRv6 small as a CPU baseline; it does not reproduce V28 or claim production-level performance.

The overview simulator displays placeholder fields, not inference results. Its three sample images come from the supplied Drive folder. Faces and selected identity values are redacted; raw source files and personal ground truth are not included.

## Repository benchmark

The V28 snapshot evaluated 632 labeled images:

| Metric | Result |
| --- | ---: |
| Name exact match | 46.20% |
| Date of birth exact match | 70.41% |
| Full-record exact match | 37.66% |

The 83.70% address score includes records with an empty address label. The V27 report records 25.0% across the 112 records that have an address. These are repository benchmark results, not production measurements. See the [V28 metrics](reports/metrics/v28.json) and [V27 report](reports/final_v27_report.md).

## Repository layout

~~~text
index.html, simulasi.html       Static website and simulator
assets/                         Logo, redacted samples, preprocessing previews
local_runner/                   Windows-only local OCR API
models/                         Local model paths; model files are Git-ignored
screenshots/                    Landing page screenshot
docs/                           Research architecture diagram
reports/                        Final report and aggregate metrics
archived/                       V3–V28 experiments, notebooks, scripts, and research notes
~~~

The contents of archived/ are retained for provenance. They are not required to serve the website or run the local OCR baseline.
