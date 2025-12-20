document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // 1. CONSTANTS & THEME SETTINGS
    // ============================================================
    const BASE_URL = "https://script.google.com/macros/s/AKfycbytUjsxc0zhTeD1qkb8DQOl7o7YzthDfSwAWXfroHqycY7IwZsEetpEoHKL_AC7R7HNVw/exec";
    const URLS = Object.freeze({
        DATA: BASE_URL + "?sheet=DATA",
        WAIT: BASE_URL + "?sheet=WAIT",
        LOG:  BASE_URL + "?sheet=LOG",
        USER: BASE_URL + "?sheet=LOGIN",
        SHOW: BASE_URL + "?sheet=SHOW"
    });

    const pageTitle = document.getElementById("page-title");
    const pageContent = document.getElementById("page-content");
    const THEME_COLOR = "#002147"; // Navy Blue

    // ============================================================
    // 2. CORE ENGINE (Fetch & Post)
    // ============================================================
    async function fetchJSON(url) {
        try {
            const res = await fetch(url);
            const text = await res.text();
            return JSON.parse(text);
        } catch (e) { return []; }
    }

    async function postAction(sheet, action, params = {}) {
        const body = new FormData();
        body.append("sheet", sheet);
        body.append("action", action);
        Object.entries(params).forEach(([k, v]) => body.append(k, v));
        const res = await fetch(BASE_URL, { method: "POST", body });
        const result = await res.json();
        if (result.status === "success" || result.ok) return result;
        throw new Error(result.message || "เกิดข้อผิดพลาด");
    }

    // ============================================================
    // 3. UTILITIES (Formatting)
    // ============================================================
    const pad = (n) => String(n).padStart(2, '0');
    
    function formatDateCell(val) {
        if (!val) return "-";
        const m = String(val).match(/Date\(([^)]+)\)/);
        if (m) {
            const [y, mo, d] = m[1].split(',').map(Number);
            return `${pad(d)}/${pad(mo + 1)}/${y + 543}`;
        }
        return val;
    }

    function formatTimeCell(val) {
        if (!val) return "-";
        const m = String(val).match(/Date\(([^)]+)\)/);
        if (m && m[1].split(',').length >= 6) {
            const p = m[1].split(',').map(Number);
            return `${pad(p[3])}:${pad(p[4])} น.`;
        }
        return val;
    }

    function getStatusBadge(status) {
        const s = (status || "").toLowerCase();
        if (s.includes("ใช้งานได้")) return "bg-success";
        if (s.includes("ชำรุด") || s.includes("เสื่อมสภาพ")) return "bg-danger";
        if (s.includes("ซ่อม")) return "bg-warning text-dark";
        return "bg-secondary";
    }

    function downloadFile(base64, name) {
        if (!base64) return;
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;base64,${base64.replace(/-/g, '+').replace(/_/g, '/')}`;
        link.download = name;
        link.click();
    }

    // ============================================================
    // 4. UI COMPONENTS (Uniform Template)
    // ============================================================
    const renderTable = (headers, rows, bulkBtns = "", toolBtns = "") => {
        pageContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div class="bulk-area">${bulkBtns}</div>
                <div class="tool-area d-flex gap-2">${toolBtns} 
                    <input type="text" id="t-search" class="form-control form-control-sm" placeholder="🔍 ค้นหา..." style="width:200px;">
                </div>
            </div>
            <div class="table-responsive shadow-sm rounded">
                <table class="table table-hover bg-white mb-0">
                    <thead style="background-color:${THEME_COLOR}; color:white;">
                        <tr>
                            <th style="width:40px;"><input type="checkbox" id="check-all" class="form-check-input"></th>
                            ${headers.map(h => `<th>${h}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody id="table-body">${rows}</tbody>
                </table>
            </div>`;
        
        // Search Logic
        const input = document.getElementById("t-search");
        input.onkeyup = () => {
            const val = input.value.toLowerCase();
            document.querySelectorAll("#table-body tr").forEach(tr => {
                tr.style.display = tr.innerText.toLowerCase().includes(val) ? "" : "none";
            });
        };

        // Check All Logic
        document.getElementById("check-all").onclick = (e) => {
            document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
        };
    };

    const getSelectedRows = () => Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));

    // ============================================================
    // 5. PAGE RENDERERS
    // ============================================================

    // --- DASHBOARD ---
    async function renderDashboardPage() {
        pageContent.innerHTML = `<div class="text-center py-5"><div class="spinner-border" style="color:${THEME_COLOR}"></div></div>`;
        const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
        
        const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
        const broken = data.filter(r => (r["สถานะ"]||"").includes("ชำรุด")).length;

        pageContent.innerHTML = `
            <div class="row g-4 mb-4">
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm p-3" style="border-left:5px solid ${THEME_COLOR} !important">
                        <small class="text-muted">ครุภัณฑ์ทั้งหมด</small><h2 class="fw-bold">${total}</h2>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm p-3" style="border-left:5px solid #ffc107 !important">
                        <small class="text-muted">รอตรวจสอบ</small><h2 class="fw-bold text-warning">${wait.length}</h2>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm p-3" style="border-left:5px solid #dc3545 !important">
                        <small class="text-muted">แจ้งชำรุด/เสื่อมสภาพ</small><h2 class="fw-bold text-danger">${broken}</h2>
                    </div>
                </div>
            </div>
            <div class="card border-0 shadow-sm">
                <div class="card-body">
                    <h5 class="fw-bold mb-3" style="color:${THEME_COLOR}">ทางลัดการจัดการ</h5>
                    <button class="btn btn-primary btn-sm" onclick="loadPage('wait')">ตรวจสอบรายการใหม่</button>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadPage('report')">ออกรายงานสรุป</button>
                </div>
            </div>`;
    }

    // --- WAIT (Bulk Verify) ---
    async function renderWaitPage() {
        const data = await fetchJSON(URLS.WAIT);
        const rows = data.map((r, i) => `
            <tr data-row="${r._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td class="fw-bold">${r["รหัส"]||""}</td><td>${r["ชื่อ"]||""}</td>
                <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"]||""}"></td>
                <td class="text-center"><button class="btn btn-success btn-sm single-move">✔</button></td>
            </tr>`).join("");

        renderTable(["รหัส", "ชื่อ", "หมายเหตุ", "ยืนยัน"], rows, 
            `<button class="btn btn-success btn-sm" id="bulk-move">✔ ยืนยันรายการที่เลือก</button>`,
            `<button class="btn btn-outline-secondary btn-sm" onclick="loadPage('wait')">🔄 รีเฟรช</button>`
        );

        document.getElementById("bulk-move").onclick = async () => {
            const selected = getSelectedRows();
            if (selected.length === 0) return;
            const conf = await Swal.fire({ title: `ยืนยัน ${selected.length} รายการ?`, showCancelButton: true });
            if (conf.isConfirmed) {
                Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
                for (let tr of selected) {
                    await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "หมายเหตุ": tr.querySelector(".wait-note").value });
                    await postAction("WAIT", "delete", { row: tr.dataset.row });
                }
                renderWaitPage();
                Swal.fire("สำเร็จ", "ย้ายข้อมูลเรียบร้อย", "success");
            }
        };
    }

    // --- LIST (Database + View History) ---
    async function renderListPage() {
        const data = await fetchJSON(URLS.DATA);
        const rows = data.filter(r => r["รหัสครุภัณฑ์"]).map((r, i) => `
            <tr data-row="${r._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td class="fw-bold">${r["รหัสครุภัณฑ์"]}</td><td>${r["ชื่อครุภัณฑ์"]}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜 ประวัติ</button>
                    <button class="btn btn-sm btn-light border edit-list">📝</button>
                </td>
            </tr>`).join("");

        renderTable(["รหัส", "ชื่อ", "จัดการ"], rows,
            `<button class="btn btn-danger btn-sm" id="bulk-del-list">🗑 ลบที่เลือก</button>`,
            `<button class="btn btn-primary btn-sm" id="bulk-add-list">📦 เพิ่มหลายรายการ</button>`
        );

        // Bulk Add Logic (CSV style)
        document.getElementById("bulk-add-list").onclick = async () => {
            const { value: txt } = await Swal.fire({ title: 'เพิ่มกลุ่มครุภัณฑ์', input: 'textarea', inputPlaceholder: 'รหัส,ชื่อ (1 คนต่อบรรทัด)', showCancelButton: true });
            if (txt) {
                Swal.fire({ title: 'กำลังโหลด...', didOpen: () => Swal.showLoading() });
                for (let line of txt.split('\n')) {
                    const [c, n] = line.split(',');
                    if (c && n) await postAction("DATA", "add", { code: c.trim(), name: n.trim() });
                }
                renderListPage();
                Swal.fire("สำเร็จ", "เพิ่มข้อมูลเรียบร้อย", "success");
            }
        };
    }

    // --- HISTORY (Search & Logs) ---
    async function renderHistoryPage(assetId = null) {
        pageContent.innerHTML = `
            <div class="card border-0 shadow-sm mb-4">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <h5 class="m-0 fw-bold" style="color:${THEME_COLOR}">📜 สืบค้นประวัติย้อนหลัง</h5>
                    <div class="d-flex gap-2">
                        <input type="text" id="h-id" class="form-control form-control-sm" placeholder="รหัสครุภัณฑ์..." value="${assetId || ''}">
                        <button class="btn btn-primary btn-sm" id="btn-h">สืบค้น</button>
                    </div>
                </div>
            </div>
            <div id="h-content"></div>`;

        const loadH = async (id) => {
            if (!id) return;
            const content = document.getElementById("h-content");
            content.innerHTML = `<div class="text-center py-5"><div class="spinner-border" style="color:${THEME_COLOR}"></div></div>`;
            
            const json = await fetchJSON(`https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`);
            const rows = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : ""));
            const filtered = rows.filter(r => String(r[0]) === String(id));

            if (filtered.length === 0) {
                content.innerHTML = `<div class="alert alert-warning text-center">ไม่พบประวัติสำหรับรหัส: ${id}</div>`;
                return;
            }

            content.innerHTML = `
                <div class="table-responsive shadow-sm rounded">
                    <table class="table table-hover bg-white mb-0">
                        <thead style="background-color:${THEME_COLOR}; color:white;">
                            <tr><th>วันที่</th><th>เวลา</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th></tr>
                        </thead>
                        <tbody>
                            ${filtered.map(r => `<tr>
                                <td>${formatDateCell(r[5])}</td><td>${formatTimeCell(r[6])}</td>
                                <td>${r[2]||"-"}</td><td><span class="badge ${getStatusBadge(r[3])}">${r[3]}</span></td>
                                <td>${r[4]||"-"}</td>
                            </tr>`).join("")}
                        </tbody>
                    </table>
                </div>`;
        };

        document.getElementById("btn-h").onclick = () => loadH(document.getElementById("h-id").value.trim());
        if (assetId) loadH(assetId);
    }

    // --- REPORT & MANUAL (Simplified) ---
    async function renderReportPage() {
        const data = await fetchJSON(URLS.SHOW);
        const rows = data.map(r => `<tr><td><input type="checkbox" class="form-check-input row-checkbox"></td><td>${r["รหัสครุภัณฑ์"]||""}</td><td>${r["ชื่อครุภัณฑ์"]||""}</td><td><span class="badge ${getStatusBadge(r["สถานะ"])}">${r["สถานะ"]||""}</span></td></tr>`).join("");
        
        renderTable(["รหัส", "ชื่อ", "สถานะ"], rows, 
            `<button class="btn btn-success btn-sm" id="exp-pdf">📕 PDF</button> <button class="btn btn-primary btn-sm" id="exp-doc">📑 Word</button>`
        );

        const exp = async (fmt) => {
            Swal.fire({ title: 'กำลังสร้างไฟล์...', didOpen: () => Swal.showLoading() });
            const res = await postAction("SHOW", "generateReport", { format: fmt });
            downloadFile(res.fileData, res.fileName);
            Swal.fire("สำเร็จ", "ดาวน์โหลดเรียบร้อย", "success");
        };
        document.getElementById("exp-pdf").onclick = () => exp("pdf");
        document.getElementById("exp-doc").onclick = () => exp("doc");
    }

    // ============================================================
    // 6. ROUTER
    // ============================================================
    window.loadPage = async (page, param = null) => {
        const routes = {
            "dash": { title: "แผงควบคุม", render: renderDashboardPage },
            "wait": { title: "ตรวจสอบรายการ", render: renderWaitPage },
            "list": { title: "ฐานข้อมูลครุภัณฑ์", render: renderListPage },
            "history": { title: "ประวัติย้อนหลัง", render: () => renderHistoryPage(param) },
            "user": { title: "จัดการสมาชิก", render: renderUserPage },
            "report": { title: "รายงานเอกสาร", render: renderReportPage }
        };
        const r = routes[page];
        if (r) {
            pageTitle.textContent = r.title;
            await r.render();
            // ปรับสีปุ่ม Primary ทั้งหน้าให้เป็น Navy
            document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
        }
    };

    loadPage("dash");
});
