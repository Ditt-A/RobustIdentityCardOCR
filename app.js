const samples = {
  "001": {
    label: "Sampel dataset 001",
    filename: "image_001.jpg",
    image: "assets/dataset-001-redacted.jpg",
    alt: "Foto sampel image_001 dari dataset Drive dengan detail identitas disamarkan",
  },
  "150": {
    label: "Sampel dataset 150",
    filename: "image_150.jpg",
    image: "assets/dataset-150-redacted.jpg",
    alt: "Foto sampel image_150 dari dataset Drive dengan detail identitas disamarkan",
  },
  "300": {
    label: "Sampel dataset 300",
    filename: "image_300.jpg",
    image: "assets/dataset-300-redacted.jpg",
    alt: "Foto sampel image_300 dari dataset Drive dengan detail identitas disamarkan",
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
        ? "Tidak terdeteksi"
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
    byId("sample-caption").textContent = `DRIVE · ${sample.filename} · detail disamarkan`;
    byId("route-summary-title").textContent = sample.label;
    byId("route-summary-detail").textContent = "Satu foto berlabel dari folder Drive. Jenis dokumen tidak ditebak.";

    const object = {
      sumber_dataset: sample.filename,
      jenis_dokumen: null,
      nama: "[DISAMARKAN]",
      tanggal_lahir: "[DISAMARKAN]",
      alamat: "[DISAMARKAN]",
    };

    setResult({
      documentLabel: sample.label,
      kind: "PLACEHOLDER",
      kicker: "OUTPUT OVERVIEW",
      title: "Object contoh",
      fields: [
        ["nama", "[DISAMARKAN]"],
        ["tanggal_lahir", "[DISAMARKAN]"],
        ["alamat", "[DISAMARKAN]"],
      ],
      object,
      status: announced
        ? "Overview ditampilkan · nilai personal tetap disamarkan"
        : "Placeholder overview · model OCR belum dijalankan",
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
        "Local runner belum aktif",
        "Siapkan dependency dan weights, lalu buka simulasi melalui http://127.0.0.1:8787/simulasi.html."
      );
      byId("local-runner-hint").textContent = "Dari folder web, jalankan local_runner\\setup-local.ps1 sekali, siapkan weights, lalu local_runner\\start-local.ps1.";
      refreshRunButton();
      return;
    }

    setHealthState("loading", "Memeriksa model lokal", "Meminta status backend pada perangkat ini saja.");
    try {
      const response = await fetch("/api/health", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("health endpoint unavailable");
      const health = await response.json();
      byId("det-model-path").textContent = health.model_paths.det;
      byId("rec-model-path").textContent = health.model_paths.rec;
      window.localOcrReady = Boolean(health.ready);

      if (health.ready) {
        setHealthState("ready", "Backend lokal siap", `${health.model_label} tersedia. Model baru dimuat saat OCR pertama kali dijalankan.`);
        byId("local-runner-hint").textContent = "Gambar tidak dikirim sebelum tombol Jalankan OCR ditekan.";
      } else {
        setHealthState("missing", "Weights belum ditemukan", `Siapkan model di path yang ditampilkan. ${health.message}`);
        byId("local-runner-hint").textContent = "Weights tidak termasuk di repo; backend tidak akan mengunduh model secara otomatis.";
      }
    } catch {
      window.localOcrReady = false;
      setHealthState("offline", "Local runner belum aktif", "Siapkan dependency dan weights, jalankan local_runner\\start-local.ps1, lalu buka alamat 127.0.0.1:8787.");
      byId("local-runner-hint").textContent = "Tidak ada gambar yang dikirim ke alamat hosting atau server jarak jauh.";
    }
    refreshRunButton();
  }

  function resetLocalResult() {
    setResult({
      documentLabel: "Menunggu gambar",
      kind: "LOKAL",
      kicker: "OUTPUT OCR LOKAL",
      title: "Object hasil ekstraksi",
      fields: [["nama", null], ["tanggal_lahir", null], ["alamat", null]],
      object: { status: "menunggu_gambar" },
      status: "Pilih gambar untuk menyiapkan inferensi lokal.",
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
      byId("notice-title").textContent = "Overview · sampel dataset asli";
      byId("notice-copy").textContent = "Teks identitas dan area foto disamarkan. JSON yang terlihat adalah placeholder; model OCR tidak dijalankan pada mode ini.";
      byId("notice-tag").textContent = "DATASET DRIVE";
      renderOverview(selectedSample);
    } else {
      byId("notice-title").textContent = "Jalankan OCR di laptop";
      byId("notice-copy").textContent = "Model dan gambar diproses lokal oleh runner di perangkat ini. Unggahan hanya terjadi setelah tombol OCR ditekan.";
      byId("notice-tag").textContent = "LOCALHOST SAJA";
      if (!lastObject || lastObject.status !== "menunggu_gambar") resetLocalResult();
      void checkLocalRunner();
    }
  }

  function requestLocalMode() {
    if (!localDialog || typeof localDialog.showModal !== "function") {
      if (window.confirm("Mode ini menjalankan OCR di laptop melalui local runner. Gambar tidak dikirim ke server online. Lanjutkan?")) {
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
    showToast("Object overview ditampilkan. Nilai personal tetap disamarkan.");
  });

  localImageInput.addEventListener("change", () => {
    const candidate = localImageInput.files?.[0] ?? null;
    if (!candidate) return;
    const allowed = allowedMimeTypes.has(candidate.type) || /\.(jpe?g|png|webp)$/i.test(candidate.name);
    if (!allowed) {
      clearSelectedFile();
      showToast("Pilih file JPG, PNG, atau WebP.");
      return;
    }
    if (candidate.size > maxUploadBytes) {
      clearSelectedFile();
      showToast("Ukuran gambar melebihi batas 8 MB.");
      return;
    }

    selectedFile = candidate;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(candidate);
    byId("local-preview").src = previewUrl;
    byId("local-file-name").textContent = candidate.name;
    byId("local-file-size").textContent = `${(candidate.size / 1024 / 1024).toFixed(2)} MB · pratinjau lokal`;
    byId("local-file-preview").hidden = false;
    resetLocalResult();
    refreshRunButton();
  });

  byId("clear-local-file").addEventListener("click", clearSelectedFile);

  runLocalButton.addEventListener("click", async () => {
    if (!isLocalRunnerOrigin() || !selectedFile || !window.localOcrReady) {
      showToast("Local runner atau weights belum siap.");
      return;
    }

    runLocalButton.disabled = true;
    runLocalButton.innerHTML = 'Menjalankan OCR lokal<span class="button-spinner" aria-hidden="true"></span>';
    byId("result-document").textContent = "Gambar lokal";
    byId("result-kind").textContent = "MEMPROSES";
    byId("result-status").textContent = "Inferensi berlangsung di laptop ini. Gambar tidak dikirim ke hosting.";
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
      if (!response.ok) throw new Error(payload.detail || "Pipeline lokal gagal memproses gambar.");

      const object = payload.object ?? {};
      const fields = [
        ["nama", object.nama],
        ["tanggal_lahir", object.tanggal_lahir],
        ["alamat", object.alamat],
      ];
      const elapsed = Number.isFinite(payload.elapsed_ms) ? `${Math.round(payload.elapsed_ms)} ms` : "selesai";
      setResult({
        documentLabel: "Gambar dari perangkat ini",
        kind: "OCR LOKAL",
        kicker: "HASIL INFERENSI LOKAL",
        title: "Object hasil ekstraksi",
        fields,
        object,
        status: `${payload.model_label} · ${payload.preprocessing?.mode ?? "raw"} · ${elapsed} · berjalan di perangkat ini`,
      });
      showToast("Inferensi lokal selesai.");
    } catch (error) {
      const message = error.name === "AbortError"
        ? "Waktu inferensi melewati 5 menit. Coba gambar yang lebih kecil atau profil model lebih ringan."
        : error.message;
      byId("result-kind").textContent = "BELUM SELESAI";
      byId("result-status").textContent = message;
      showToast(message);
    } finally {
      window.clearTimeout(timeout);
      runLocalButton.innerHTML = 'Jalankan OCR di laptop <span aria-hidden="true">↗</span>';
      refreshRunButton();
    }
  });

  byId("copy-result").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(lastObject, null, 2));
      showToast("Object JSON disalin.");
    } catch {
      showToast("Clipboard tidak tersedia pada konteks ini.");
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
