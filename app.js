const samples = {
  "001": {
    label: "Dataset sample 001",
    filename: "image_001.jpg",
    image: "assets/dataset-001-redacted.jpg",
    alt: "Dataset sample image_001 with selected identity details redacted",
  },
  "150": {
    label: "Dataset sample 150",
    filename: "image_150.jpg",
    image: "assets/dataset-150-redacted.jpg",
    alt: "Dataset sample image_150 with selected identity details redacted",
  },
  "300": {
    label: "Dataset sample 300",
    filename: "image_300.jpg",
    image: "assets/dataset-300-redacted.jpg",
    alt: "Dataset sample image_300 with selected identity details redacted",
  },
};

if (document.body.hasAttribute("data-simulation")) {
  const byId = (id) => document.getElementById(id);
  const modeButtons = Array.from(document.querySelectorAll("[data-mode-choice]"));
  const sampleButtons = Array.from(document.querySelectorAll("[data-sample-choice]"));
  const panels = Array.from(document.querySelectorAll("[data-mode-panel]"));
  const localDialog = byId("local-mode-dialog");
  const localHealth = byId("local-health");
  const localImageInput = byId("local-image");
  const runLocalButton = byId("run-local-ocr");
  const runOverviewButton = byId("run-overview");
  const jsonOutput = byId("json-output");
  const fieldPreview = byId("field-preview");
  const toast = byId("toast-message");
  const maxUploadBytes = 8 * 1024 * 1024;
  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  let selectedSample = "001";
  let selectedFile = null;
  let previewUrl = null;
  let currentMode = "overview";
  let toastTimer;
  let lastObject = {};

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function drawFields(fields) {
    fieldPreview.replaceChildren();
    fields.forEach(([key, value]) => {
      const row = document.createElement("div");
      const field = document.createElement("span");
      const result = document.createElement("b");
      field.textContent = key;
      result.textContent = value === null || value === undefined || value === ""
        ? "Not detected"
        : String(value);
      row.append(field, result);
      fieldPreview.append(row);
    });
  }

  function setResult({
    documentLabel,
    kind,
    kicker,
    title,
    fields,
    object,
    status,
  }) {
    byId("result-document").textContent = documentLabel;
    byId("result-kind").textContent = kind;
    byId("result-kicker").textContent = kicker;
    byId("result-title").textContent = title;
    byId("result-status").textContent = status;
    drawFields(fields);
    lastObject = object;
    jsonOutput.textContent = JSON.stringify(object, null, 2);
  }

  function renderOverview(sampleId, announced = false) {
    const sample = samples[sampleId];
    if (!sample) return;

    byId("sample-art").src = sample.image;
    byId("sample-art").alt = sample.alt;
    byId("sample-caption").textContent = "DRIVE · " + sample.filename + " · selected details redacted";
    byId("route-summary-title").textContent = sample.label;
    byId("route-summary-detail").textContent = "One labeled photo from the Drive folder. The document type is not guessed.";

    const object = {
      dataset_source: sample.filename,
      document_type: null,
      name: "[REDACTED]",
      date_of_birth: "[REDACTED]",
      address: "[REDACTED]",
    };

    setResult({
      documentLabel: sample.label,
      kind: "PLACEHOLDER",
      kicker: "OVERVIEW OUTPUT",
      title: "Example object",
      fields: [
        ["name", "[REDACTED]"],
        ["date_of_birth", "[REDACTED]"],
        ["address", "[REDACTED]"],
      ],
      object,
      status: announced
        ? "Overview displayed · personal values remain redacted"
        : "Overview placeholder · OCR has not been run",
    });
  }

  function isLocalRunnerOrigin() {
    return window.location.protocol === "http:" &&
      (window.location.host === "127.0.0.1:8787" || window.location.host === "localhost:8787");
  }

  function setHealthState(state, title, detail) {
    localHealth.classList.remove("is-ready", "is-missing", "is-offline", "is-loading");
    localHealth.classList.add(`is-${state}`);
    byId("local-health-title").textContent = title;
    byId("local-health-detail").textContent = detail;
  }

  function refreshRunButton() {
    runLocalButton.disabled = !isLocalRunnerOrigin() || !selectedFile || !window.localOcrReady;
  }

  async function checkLocalRunner() {
    window.localOcrReady = false;
    if (!isLocalRunnerOrigin()) {
      setHealthState(
        "offline",
        "Local runner is offline",
        "Install dependencies and add model weights, then open the simulator at http://127.0.0.1:8787/simulasi.html."
      );
      byId("local-runner-hint").textContent = "From the repository folder, run local_runner\\setup-local.ps1 once, add model weights, then run local_runner\\start-local.ps1.";
      refreshRunButton();
      return;
    }

    setHealthState("loading", "Checking local model", "Checking the backend on this computer only.");
    try {
      const response = await fetch("/api/health", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("health endpoint unavailable");
      const health = await response.json();
      byId("det-model-path").textContent = health.model_paths.det;
      byId("rec-model-path").textContent = health.model_paths.rec;
      window.localOcrReady = Boolean(health.ready);

      if (health.ready) {
        setHealthState("ready", "Local backend is ready", health.model_label + " is available. The model loads when you run OCR for the first time.");
        byId("local-runner-hint").textContent = "The image is not uploaded until you select Run OCR.";
      } else {
        setHealthState("missing", "Model weights not found", "Place the model files at the paths shown. " + health.message);
        byId("local-runner-hint").textContent = "Model weights are not included in the repository; the backend will not download them automatically.";
      }
    } catch {
      window.localOcrReady = false;
      setHealthState("offline", "Local runner is offline", "Install dependencies and add model weights, run local_runner\\start-local.ps1, then open 127.0.0.1:8787.");
      byId("local-runner-hint").textContent = "No images are sent to the public host or a remote server.";
    }
    refreshRunButton();
  }

  function resetLocalResult() {
    setResult({
      documentLabel: "Waiting for an image",
      kind: "LOCAL",
      kicker: "LOCAL OCR OUTPUT",
      title: "Extracted object",
      fields: [["name", null], ["date_of_birth", null], ["address", null]],
      object: { status: "waiting_for_image" },
      status: "Choose an image to prepare local inference.",
    });
  }

  function setMode(mode) {
    currentMode = mode;
    modeButtons.forEach((button) => {
      const active = button.dataset.modeChoice === mode;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.modePanel !== mode;
    });

    if (mode === "overview") {
      byId("notice-title").textContent = "Overview · real dataset samples";
      byId("notice-copy").textContent = "Faces and selected identity values are redacted. The JSON shown is a placeholder; OCR does not run in this mode.";
      byId("notice-tag").textContent = "DRIVE DATASET";
      renderOverview(selectedSample);
    } else {
      byId("notice-title").textContent = "Run OCR on your computer";
      byId("notice-copy").textContent = "The runner processes the model and image locally on this computer. The image is uploaded only after you start OCR.";
      byId("notice-tag").textContent = "LOCALHOST ONLY";
      if (!lastObject || lastObject.status !== "waiting_for_image") resetLocalResult();
      void checkLocalRunner();
    }
  }

  function requestLocalMode() {
    if (!localDialog || typeof localDialog.showModal !== "function") {
      if (window.confirm("This mode runs OCR on your computer through the local runner. The image is not sent to an online server. Continue?")) {
        setMode("local");
      }
      return;
    }
    localDialog.showModal();
  }

  function clearSelectedFile() {
    selectedFile = null;
    localImageInput.value = "";
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    byId("local-file-preview").hidden = true;
    byId("local-preview").removeAttribute("src");
    refreshRunButton();
    resetLocalResult();
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.modeChoice === "local" && currentMode !== "local") {
        requestLocalMode();
        return;
      }
      setMode(button.dataset.modeChoice);
    });

    button.addEventListener("keydown", (event) => {
      const currentIndex = modeButtons.indexOf(button);
      let nextIndex = currentIndex;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % modeButtons.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + modeButtons.length) % modeButtons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = modeButtons.length - 1;
      if (nextIndex !== currentIndex) {
        event.preventDefault();
        modeButtons[nextIndex].focus();
        modeButtons[nextIndex].click();
      }
    });
  });

  byId("confirm-local-mode").addEventListener("click", () => {
    localDialog.close();
    setMode("local");
  });

  byId("cancel-local-mode").addEventListener("click", () => localDialog.close());

  sampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedSample = button.dataset.sampleChoice;
      sampleButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      renderOverview(selectedSample);
    });
  });

  runOverviewButton.addEventListener("click", () => {
    renderOverview(selectedSample, true);
    showToast("Overview object displayed. Personal values remain redacted.");
  });

  localImageInput.addEventListener("change", () => {
    const candidate = localImageInput.files?.[0] ?? null;
    if (!candidate) return;
    const allowed = allowedMimeTypes.has(candidate.type) || /\.(jpe?g|png|webp)$/i.test(candidate.name);
    if (!allowed) {
      clearSelectedFile();
      showToast("Choose a JPG, PNG, or WebP file.");
      return;
    }
    if (candidate.size > maxUploadBytes) {
      clearSelectedFile();
      showToast("The image exceeds the 8 MB limit.");
      return;
    }

    selectedFile = candidate;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(candidate);
    byId("local-preview").src = previewUrl;
    byId("local-file-name").textContent = candidate.name;
    byId("local-file-size").textContent = (candidate.size / 1024 / 1024).toFixed(2) + " MB · local preview";
    byId("local-file-preview").hidden = false;
    resetLocalResult();
    refreshRunButton();
  });

  byId("clear-local-file").addEventListener("click", clearSelectedFile);

  runLocalButton.addEventListener("click", async () => {
    if (!isLocalRunnerOrigin() || !selectedFile || !window.localOcrReady) {
      showToast("The local runner or model weights are not ready.");
      return;
    }

    runLocalButton.disabled = true;
    runLocalButton.innerHTML = 'Running local OCR<span class="button-spinner" aria-hidden="true"></span>';
    byId("result-document").textContent = "Image from this computer";
    byId("result-kind").textContent = "PROCESSING";
    byId("result-status").textContent = "Inference is running on this computer. The image is not sent to the public host.";
    const requestBody = new FormData();
    requestBody.append("file", selectedFile, selectedFile.name);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 300000);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: requestBody,
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "The local pipeline could not process the image.");

      const object = payload.object ?? {};
      const fields = [
        ["name", object.name],
        ["date_of_birth", object.date_of_birth],
        ["address", object.address],
      ];
      const elapsed = Number.isFinite(payload.elapsed_ms) ? Math.round(payload.elapsed_ms) + " ms" : "complete";
      setResult({
        documentLabel: "Image from this computer",
        kind: "LOCAL OCR",
        kicker: "LOCAL INFERENCE RESULT",
        title: "Extracted object",
        fields,
        object,
        status: payload.model_label + " · " + (payload.preprocessing?.mode ?? "raw") + " · " + elapsed + " · running on this computer",
      });
      showToast("Local inference complete.");
    } catch (error) {
      const message = error.name === "AbortError"
        ? "Inference exceeded 5 minutes. Try a smaller image or a lighter model profile."
        : error.message;
      byId("result-kind").textContent = "INCOMPLETE";
      byId("result-status").textContent = message;
      showToast(message);
    } finally {
      window.clearTimeout(timeout);
      runLocalButton.innerHTML = 'Run OCR locally <span aria-hidden="true">↗</span>';
      refreshRunButton();
    }
  });

  byId("copy-result").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(lastObject, null, 2));
      showToast("JSON object copied.");
    } catch {
      showToast("The clipboard is unavailable in this context.");
    }
  });

  const querySample = new URLSearchParams(window.location.search).get("sample");
  if (samples[querySample]) {
    selectedSample = querySample;
    sampleButtons.forEach((button) => {
      const selected = button.dataset.sampleChoice === selectedSample;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }
  renderOverview(selectedSample);
}
