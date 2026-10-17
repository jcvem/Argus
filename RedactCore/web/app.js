// Argus RedactCore Web UI Client
let currentDoc = null;
let currentSubjects = [];
let currentPolicies = [];

document.addEventListener("DOMContentLoaded", async () => {
  await initHealth();
  await loadSubjects();
  await loadPolicies();
  setupEventListeners();
});

async function initHealth() {
  try {
    const res = await fetch("/health");
    const data = await res.json();
    const statusElem = document.getElementById("engine-status");
    if (data.status === "healthy") {
      statusElem.textContent = data.presidio.active
        ? "Engine: Online (Presidio + Regex)"
        : "Engine: Online (Offline Regex Active)";
    }
  } catch (err) {
    console.error("Health check failed:", err);
  }
}

async function loadSubjects() {
  try {
    const res = await fetch("/api/subjects");
    currentSubjects = await res.json();
    const select = document.getElementById("subject-select");
    select.innerHTML = "";
    currentSubjects.forEach((s, idx) => {
      const opt = document.createElement("option");
      opt.value = s.subject_id;
      opt.textContent = `${s.name} (${s.clearance})`;
      select.appendChild(opt);
    });
    updateSubjectDesc();
  } catch (err) {
    console.error("Failed to load subjects:", err);
  }
}

async function loadPolicies() {
  try {
    const res = await fetch("/api/policies");
    currentPolicies = await res.json();
    const select = document.getElementById("policy-select");
    select.innerHTML = "";
    currentPolicies.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.policy_id;
      opt.textContent = `${p.name} (v${p.version})`;
      select.appendChild(opt);
    });
    updatePolicyDesc();
  } catch (err) {
    console.error("Failed to load policies:", err);
  }
}

function updateSubjectDesc() {
  const select = document.getElementById("subject-select");
  const subj = currentSubjects.find((s) => s.subject_id === select.value);
  const desc = document.getElementById("subject-desc");
  if (subj) {
    desc.textContent = `${subj.description} | Roles: [${subj.roles.join(", ")}]`;
  }
}

function updatePolicyDesc() {
  const select = document.getElementById("policy-select");
  const pol = currentPolicies.find((p) => p.policy_id === select.value);
  const desc = document.getElementById("policy-desc");
  if (pol) {
    desc.textContent = `${pol.description} | Default action: ${pol.default_action}`;
  }
}

function setupEventListeners() {
  const fileInput = document.getElementById("file-input");
  const dropzone = document.getElementById("dropzone");
  const subjectSelect = document.getElementById("subject-select");
  const policySelect = document.getElementById("policy-select");
  const btnCreateView = document.getElementById("btn-create-view");
  const btnToggleManifest = document.getElementById("btn-toggle-manifest");

  subjectSelect.addEventListener("change", updateSubjectDesc);
  policySelect.addEventListener("change", updatePolicyDesc);

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("hover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("hover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("hover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  });

  // Quick load buttons
  document.getElementById("btn-load-pdf").addEventListener("click", () => {
    loadFixtureFile("sample_report.pdf");
  });
  document.getElementById("btn-load-docx").addEventListener("click", () => {
    loadFixtureFile("sample_report.docx");
  });
  document.getElementById("btn-load-scanned").addEventListener("click", () => {
    loadFixtureFile("scanned_sample.pdf");
  });

  btnCreateView.addEventListener("click", createDerivedView);

  btnToggleManifest.addEventListener("click", () => {
    const cont = document.getElementById("manifest-container");
    cont.classList.toggle("hidden");
  });

  // Enterprise Search triggers
  const btnSidebarSearch = document.getElementById("btn-sidebar-search");
  if (btnSidebarSearch) {
    btnSidebarSearch.addEventListener("click", () => {
      const trigger = document.getElementById("searchWidgetTrigger");
      if (trigger) {
        trigger.click();
        trigger.focus();
      }
    });
  }

  // Keyboard shortcut: Cmd+K / Ctrl+K to open search widget
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const trigger = document.getElementById("searchWidgetTrigger");
      if (trigger) {
        trigger.click();
        trigger.focus();
      }
    }
  });
}

async function loadFixtureFile(filename) {
  setStatus(`Fetching fixture ${filename}...`, "info");
  try {
    const res = await fetch(`/api/fixtures/${filename}`);
    if (!res.ok) throw new Error(`Could not fetch fixture: ${res.statusText}`);
    const blob = await res.blob();
    const file = new File([blob], filename);
    await uploadFile(file);
  } catch (err) {
    setStatus(`Failed to load fixture: ${err.message}`, "error");
  }
}

async function uploadFile(file) {
  setStatus(`Ingesting and parsing ${file.name}...`, "info");
  document.getElementById("selected-file-name").textContent = file.name;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Upload failed");
    }

    currentDoc = await res.json();
    displayDocumentInspection(currentDoc);
    document.getElementById("btn-create-view").disabled = false;
    setStatus(`Ingested ${file.name} successfully.`, "info");

    // Hide previous derived view
    document.getElementById("no-view-notice").classList.remove("hidden");
    document.getElementById("derived-view-card").classList.add("hidden");
  } catch (err) {
    setStatus(`Upload error: ${err.message}`, "error");
  }
}

function displayDocumentInspection(doc) {
  document.getElementById("no-doc-notice").classList.add("hidden");
  const card = document.getElementById("doc-meta-card");
  card.classList.remove("hidden");

  document.getElementById("meta-filename").textContent = doc.filename;
  document.getElementById("meta-format").textContent = doc.file_type.toUpperCase();
  document.getElementById("meta-pages").textContent = doc.page_count;
  document.getElementById("meta-hash").textContent = doc.source_sha256;

  // Warnings
  const warnBox = document.getElementById("warnings-box");
  if (doc.warnings && doc.warnings.length > 0) {
    warnBox.innerHTML = "<strong>Warnings:</strong><ul>" +
      doc.warnings.map((w) => `<li>⚠️ ${w}</li>`).join("") +
      "</ul>";
    warnBox.classList.remove("hidden");
  } else {
    warnBox.classList.add("hidden");
  }

  // Findings
  document.getElementById("findings-count").textContent = doc.findings_count;
  const tbody = document.querySelector("#findings-table tbody");
  tbody.innerHTML = "";

  (doc.findings_summary || []).forEach((f) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${f.entity_type}</strong></td>
      <td>${f.page_or_section}</td>
      <td><span class="hash-text">${f.value_digest.substring(0, 16)}...</span></td>
      <td>${(f.confidence * 100).toFixed(0)}%</td>
      <td>${f.source}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function createDerivedView() {
  if (!currentDoc) return;

  const subjectId = document.getElementById("subject-select").value;
  const policyId = document.getElementById("policy-select").value;
  const subject = currentSubjects.find((s) => s.subject_id === subjectId);

  setStatus("Evaluating policy & generating verified privacy-preserved view...", "info");
  document.getElementById("btn-create-view").disabled = true;

  try {
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_sha256: currentDoc.source_sha256,
        ext: currentDoc.file_type,
        policy_id: policyId,
        subject_id: subjectId,
        roles: subject ? subject.roles : ["viewer"],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "View generation failed");
    }

    const viewData = await res.json();
    displayDerivedView(viewData);
    setStatus("Derived view generated and verified successfully!", "info");
  } catch (err) {
    setStatus(`Transformation blocked / failed: ${err.message}`, "error");
    // Show error card
    document.getElementById("no-view-notice").textContent = `Generation Blocked: ${err.message}`;
    document.getElementById("derived-view-card").classList.add("hidden");
  } finally {
    document.getElementById("btn-create-view").disabled = false;
  }
}

function displayDerivedView(view) {
  document.getElementById("no-view-notice").classList.add("hidden");
  const card = document.getElementById("derived-view-card");
  card.classList.remove("hidden");

  document.getElementById("view-id").textContent = view.view_id;
  document.getElementById("view-policy").textContent = `${view.policy_id} (v${view.policy_version})`;
  document.getElementById("view-output-hash").textContent = view.output_sha256;

  const opStrings = Object.entries(view.operation_counts || {})
    .map(([action, count]) => `${count} ${action}`)
    .join(", ");
  document.getElementById("view-operations").textContent = opStrings || "None";

  // Download link
  const btnDownload = document.getElementById("btn-download-view");
  btnDownload.href = view.download_url;

  // Manifest JSON
  document.getElementById("manifest-json").textContent = JSON.stringify(view, null, 2);

  // Preview
  const pdfPreview = document.getElementById("pdf-preview-img");
  const docxPreview = document.getElementById("docx-preview-text");

  if (currentDoc.file_type === "pdf") {
    pdfPreview.src = view.preview_url + "?t=" + Date.now();
    pdfPreview.classList.remove("hidden");
    docxPreview.classList.add("hidden");
  } else {
    pdfPreview.classList.add("hidden");
    fetch(view.preview_url)
      .then((r) => r.text())
      .then((text) => {
        docxPreview.textContent = text;
        docxPreview.classList.remove("hidden");
      });
  }
}

function setStatus(msg, type) {
  const box = document.getElementById("action-status");
  box.textContent = msg;
  box.className = `status-box ${type}`;
  box.classList.remove("hidden");
}
