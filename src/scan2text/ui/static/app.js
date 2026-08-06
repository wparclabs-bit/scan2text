(function () {
    "use strict";

    const API = "/api";
    let pendingFiles = [];

    // Elements
    const dropZone = document.getElementById("drop-zone");
    const fileList = document.getElementById("file-list");
    const emptyState = document.getElementById("empty-state");
    const btnProcessAll = document.getElementById("btn-process-all");
    const statusArea = document.getElementById("status-area");
    const outputPreview = document.getElementById("output-preview");
    const previewContent = document.getElementById("preview-content");
    const settingsModal = document.getElementById("settings-modal");
    const btnSettings = document.getElementById("btn-settings");
    const btnCloseSettings = document.getElementById("btn-close-settings");
    const settingsForm = document.getElementById("settings-form");
    const btnOpenOutput = document.getElementById("btn-open-output");

    // Drag-and-drop
    ["dragenter", "dragover"].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
    });
    ["dragleave", "drop"].forEach((ev) => {
        dropZone.addEventListener(ev, () => dropZone.classList.remove("drag-over"));
    });

    dropZone.addEventListener("drop", handleDrop);
    btnProcessAll.addEventListener("click", processAll);
    btnSettings.addEventListener("click", openSettings);
    btnCloseSettings.addEventListener("click", closeSettings);
    settingsForm.addEventListener("submit", saveSettings);
    btnOpenOutput.addEventListener("click", openOutputFolder);

    function handleDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        addFilesToQueue(files);
    }

    async function addFilesToQueue(files) {
        for (const file of files) {
            const resp = await fetch(`${API}/jobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_name: file.name, file_path: "" }) });
            if (resp.ok) pendingFiles.push(await resp.json());
        }
        renderList();
    }

    function renderList() {
        fileList.innerHTML = "";
        emptyState.style.display = pendingFiles.length ? "none" : "block";
        pendingFiles.forEach(job => {
            const li = document.createElement("li");
            li.textContent = `${job.file_name} — ${job.status}`;
            li.className = `status-${job.status}`;
            fileList.appendChild(li);
        });
        btnProcessAll.disabled = !pendingFiles.some(j => j.status === "queued");
    }

    async function processAll() {
        statusArea.innerHTML = "<p>Processing…</p>";
        outputPreview.classList.add("hidden");
        try {
            const results = await fetch(`${API}/jobs/process`, { method: "POST" }).then(r => r.json());
            renderList();
            if (results.length) {
                previewContent.textContent = results[0].output_path || "[no output yet]";
                outputPreview.classList.remove("hidden");
            }
        } catch (err) { statusArea.innerHTML = `<p style="color:var(--error)">Error: ${err.message}</p>`; }
    }

    // Settings
    async function loadSettings() {
        const s = await fetch(`${API}/settings`).then(r => r.json());
        document.getElementById("set-output-dir").value = s.output_dir;
        document.getElementById("set-max-pages").value = s.max_pdf_pages;
        document.getElementById("set-cpu-threads").value = s.cpu_threads;
        document.getElementById("set-check-updates").checked = s.check_updates_on_startup;
    }

    async function saveSettings(e) {
        e.preventDefault();
        await fetch(`${API}/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ output_dir: document.getElementById("set-output-dir").value, max_pdf_pages: +document.getElementById("set-max-pages").value, cpu_threads: +document.getElementById("set-cpu-threads").value, check_updates_on_startup: document.getElementById("set-check-updates").checked }) });
        closeSettings();
    }

    function openSettings() { loadSettings(); settingsModal.classList.remove("hidden"); }
    function closeSettings() { settingsModal.classList.add("hidden"); }

    async function openOutputFolder() {
        await fetch(`${API}/output/open`, { method: "POST" });
    }
})();
