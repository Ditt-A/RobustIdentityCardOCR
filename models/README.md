# Local OCR models

Model weights are not included in this repository. Place PaddleOCR inference models in the folder for the profile you want to use:

- PP-OCRv6_tiny_det/ and PP-OCRv6_tiny_rec/
- PP-OCRv6_small_det/ and PP-OCRv6_small_rec/ (default profile)
- PP-OCRv6_medium_det/ and PP-OCRv6_medium_rec/

Each folder must contain compatible Paddle inference files, including a parameter file such as .pdiparams and a graph file named inference.pdmodel or inference.json. Select a profile with the PowerShell OCR_PROFILE variable before starting start-local.ps1.

Download inference models from the official [PaddleOCR model list](https://www.paddleocr.ai/latest/version3.x/model_list.html) or see the [OCR pipeline guide](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html). Store the weights on your own computer. The runner does not download models automatically.

Example profile configuration:

~~~powershell
$env:OCR_MODEL_ROOT = 'D:\OCR\models'
$env:OCR_PROFILE = 'tiny'
& '.\local_runner\start-local.ps1'
~~~

Available profiles are tiny, small, and medium. The default is small to reduce hardware requirements. Make sure the detector and recognizer directories come from the same profile.

You can also set OCR_DET_MODEL_DIR and OCR_REC_MODEL_DIR to use detector and recognizer weights stored in different locations.
