// ประกาศตัวแปร loadPage ไว้ภายนอกเพื่อให้ HTML เรียกใช้งานได้
let loadPage;

document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // 1. CONSTANTS & CONFIG
    // ============================================================
    const BASE_URL = "https://script.google.com/macros/s/AKfycbytUjsxc0zhTeD1qkb8DQOl7o7YzthDfSwAWXfroHqycY7IwZsEetpEoHKL_AC7R7HNVw/exec";
    const URLS = {
        DATA: BASE_URL + "?sheet=DATA",
        WAIT: BASE_URL + "?sheet=WAIT",
        USER: BASE_URL + "?sheet=LOGIN",
        SHOW: BASE_URL + "?sheet=SHOW",
        LOG:  BASE_URL + "?sheet=LOG"
    };
    const THEME_COLOR = "#002147"; // Academic Navy
    const pageTitle = document.getElementById("page-title");
    const pageContent = document.getElementById("page-content");

    // ============================================================
    // 2. CORE UTILITIES
    // ============================================================
    async function fetchJSON(url) {
        try {
            const res = await fetch(url);
            return await res.json();
        } catch (e) { return []; }
    }

    async function postAction(sheet, action, params = {}) {
        const body = new FormData();
        body.append("sheet", sheet);
        body.append("action", action);
        Object.entries(params).forEach(([k, v]) => body.append(k, v));
        const res = await fetch(BASE_URL, { method: "POST", body });
        return await res.json();
    }

    const downloadFile = (base64, name) => {
        if (!base64) return;
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;base64,${base64.replace(/-/g, '+').replace(/_/g, '/')}`;
        link.download = name;
        link.click();
    };

    // ฟังก์ชันสร้างตาราง (Uniform UI)
    const renderTable = (headers, rows, bulkBtns = "", toolBtns = "") => {
        pageContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div class="bulk-area d-flex gap-2">${bulkBtns}</div>
                <div class="tool-area d-flex gap-2">
                    ${toolBtns}
                    <input type="text" id="t-search" class="form-control form-control-sm" placeholder="🔍 ค้นหาในตาราง..." style="width:200px;">
                </div>
            </div>
            <div class="table-responsive shadow-sm rounded">
                <table class="table table-hover bg-white mb-0 align-middle">
                    <thead style="background-color:${THEME_COLOR}; color:white;">
                        <tr>
                            <th style="width:40px;"><input type="checkbox" id="check-all" class="form-check-input"></th>
                            ${headers.map(h => `<th>${h}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody id="table-body">${rows}</tbody>
                </table>
            </div>`;
        
        document.getElementById("t-search").onkeyup = (e) => {
            const val = e.target.value.toLowerCase();
            document.querySelectorAll("#table-body tr").forEach(tr => {
                tr.style.display = tr.innerText.toLowerCase().includes(val) ? "" : "none";
            });
        };
        document.getElementById("check-all").onclick = (e) => {
            document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
        };
    };

    const getSelectedRows = () => Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));

    // ============================================================
    // 3. PAGE RENDERERS
    // ============================================================

    // --- DASHBOARD ---
    async function renderDashboardPage() {
        pageContent.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`;
        const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
        const total = data.length > 0 ? data.filter(r => r["รหัสครุภัณฑ์"]).length : 0;
        const waitCount = wait.length;
        const broken = data.filter(r => String(r["สถานะ"] || "").includes("ชำรุด")).length;

        pageContent.innerHTML = `
            <div class="row g-4 mb-4">
                <div class="col-md-4"><div class="card p-3 border-0 shadow-sm" style="border-left:5px solid ${THEME_COLOR}"><small class="text-muted">ครุภัณฑ์ทั้งหมด</small><h2 class="fw-bold">${total}</h2></div></div>
                <div class="col-md-4"><div class="card p-3 border-0 shadow-sm" style="border-left:5px solid #ffc107"><small class="text-muted">รอตรวจสอบ</small><h2 class="fw-bold text-warning">${waitCount}</h2></div></div>
                <div class="col-md-4"><div class="card p-3 border-0 shadow-sm" style="border-left:5px solid #dc3545"><small class="text-muted">แจ้งชำรุด</small><h2 class="fw-bold text-danger">${broken}</h2></div></div>
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
                <td class="text-center"><button class="btn btn-success btn-sm single-confirm">✔</button></td>
            </tr>`).join("");

        renderTable(["รหัส", "ชื่อ", "หมายเหตุ", "ยืนยัน"], rows, 
            `<button class="btn btn-success btn-sm" id="bulk-move">✔ ยืนยันที่เลือก</button>`,
            `<button class="btn btn-outline-secondary btn-sm" onclick="loadPage('wait')">🔄 รีเฟรช</button>`
        );

        document.getElementById("bulk-move").onclick = async () => {
            const selected = getSelectedRows();
            if (selected.length === 0) return;
            const res = await Swal.fire({ title: `ยืนยันย้าย ${selected.length} รายการ?`, showCancelButton: true });
            if (res.isConfirmed) {
                Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
                for (let tr of selected) {
                    await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "หมายเหตุ": tr.querySelector(".wait-note").value });
                    await postAction("WAIT", "delete", { row: tr.dataset.row });
                }
                renderWaitPage();
                Swal.fire("สำเร็จ", "ย้ายข้อมูลไป Log เรียบร้อย", "success");
            }
        };
    }

    // --- LIST (Database) ---
    async function renderListPage() {
        const data = await fetchJSON(URLS.DATA);
        const rows = data.filter(r => r["รหัสครุภัณฑ์"]).map((r, i) => `
            <tr data-row="${r._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td class="fw-bold">${r["รหัสครุภัณฑ์"]}</td><td>${r["ชื่อครุภัณฑ์"]}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜 ประวัติ</button>
                    <button class="btn btn-sm btn-light border del-btn">🗑</button>
                </td>
            </tr>`).join("");

        renderTable(["รหัส", "ชื่อครุภัณฑ์", "จัดการ"], rows, 
            `<button class="btn btn-danger btn-sm" id="bulk-del-list">🗑 ลบที่เลือก</button>`,
            `<button class="btn btn-primary btn-sm" id="bulk-add-list">📦 เพิ่มหลายรายการ</button>`
        );

        document.getElementById("bulk-add-list").onclick = async () => {
            const { value: txt } = await Swal.fire({ title: 'เพิ่มกลุ่มครุภัณฑ์', input: 'textarea', inputPlaceholder: 'รหัส,ชื่อ (1 คนต่อบรรทัด)', showCancelButton: true });
            if (txt) {
                Swal.fire({ title: 'กำลังเพิ่ม...', didOpen: () => Swal.showLoading() });
                for (let line of txt.split('\n')) {
                    const [c, n] = line.split(',');
                    if (c && n) await postAction("DATA", "add", { code: c.trim(), name: n.trim() });
                }
                renderListPage();
                Swal.fire("สำเร็จ", "เพิ่มข้อมูลครบถ้วน", "success");
            }
        };
    }

    // --- USER (Manage Members) ---
    async function renderUserPage() {
        const data = await fetchJSON(URLS.USER);
        const rows = data.map((u, i) => `
            <tr data-row="${u._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td>${u["ID"]||""}</td><td>${u["name"]||""}</td>
                <td><span class="badge bg-info text-dark">${u["Status"]||""}</span></td>
                <td class="text-center"><button class="btn btn-sm btn-danger">🗑 ลบ</button></td>
            </tr>`).join("");

        renderTable(["ID", "ชื่อสมาชิก", "สถานะ", "จัดการ"], rows, 
            `<button class="btn btn-danger btn-sm">🗑 ลบสมาชิกที่เลือก</button>`,
            `<button class="btn btn-primary btn-sm" id="add-bulk-user">📦 เพิ่มสมาชิกหลายคน</button>`
        );
    }

    // --- REPORT (Export PDF/Word) ---
    async function renderReportPage() {
        const data = await fetchJSON(URLS.SHOW);
        const rows = data.map(r => `
            <tr>
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td>${r["รหัสครุภัณฑ์"]||""}</td><td>${r["ชื่อครุภัณฑ์"]||""}</td>
                <td><span class="badge bg-secondary">${r["สถานะ"]||""}</span></td>
            </tr>`).join("");

        renderTable(["รหัส", "ชื่อครุภัณฑ์", "สถานะ"], rows, 
            `<button class="btn btn-success btn-sm" id="exp-pdf">📕 ออก PDF</button>
             <button class="btn btn-primary btn-sm" id="exp-doc">📑 ออก Word</button>`
        );

        const expFunc = async (fmt) => {
            Swal.fire({ title: 'กำลังสร้างไฟล์...', didOpen: () => Swal.showLoading() });
            try {
                const res = await postAction("SHOW", "generateReport", { format: fmt });
                downloadFile(res.fileData, res.fileName);
                Swal.fire("สำเร็จ", "ดาวน์โหลดไฟล์แล้ว", "success");
            } catch(e) { Swal.fire("Error", e.message, "error"); }
        };
        document.getElementById("exp-pdf").onclick = () => expFunc("pdf");
        document.getElementById("exp-doc").onclick = () => expFunc("doc");
    }

    // --- HISTORY (Log Search) ---
    async function renderHistoryPage(id = "") {
        pageContent.innerHTML = `
            <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
                <input type="text" id="h-input" class="form-control" placeholder="รหัสครุภัณฑ์..." value="${id}">
                <button class="btn btn-primary" id="btn-h-search">สืบค้นประวัติ</button>
            </div></div>
            <div id="h-result"></div>`;

        const findH = async (val) => {
            if (!val) return;
            const resDiv = document.getElementById("h-result");
            resDiv.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`;
            const json = await fetchJSON(`https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`);
            const logs = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : "")).filter(r => String(r[0]) === String(val));
            
            if (logs.length === 0) { resDiv.innerHTML = `<div class="alert alert-warning">ไม่พบประวัติสำหรับรหัสนี้</div>`; return; }
            resDiv.innerHTML = `
                <table class="table table-bordered bg-white shadow-sm mt-3">
                    <thead class="table-dark"><tr><th>วันที่</th><th>สถานะ</th><th>ที่เก็บ</th><th>หมายเหตุ</th></tr></thead>
                    <tbody>${logs.map(r => `<tr><td>${r[5]||"-"}</td><td>${r[3]||"-"}</td><td>${r[2]||"-"}</td><td>${r[4]||"-"}</td></tr>`).join("")}</tbody>
                </table>`;
        };
        document.getElementById("btn-h-search").onclick = () => findH(document.getElementById("h-input").value.trim());
        if (id) findH(id);
    }

    // --- MANUAL ---
    function renderManualPage() {
        pageContent.innerHTML = `
            <div class="card border-0 shadow-sm"><div class="card-body">
                <h5 class="fw-bold" style="color:${THEME_COLOR}">📘 คู่มือการใช้งานระบบ</h5>
                <ul>
                    <li><b>Dashboard:</b> ดูยอดสรุปครุภัณฑ์</li>
                    <li><b>Wait:</b> ตรวจสอบรายการใหม่ที่ผู้ใช้สแกนเข้ามา</li>
                    <li><b>List:</b> จัดการฐานข้อมูล เพิ่ม/ลบครุภัณฑ์หลัก</li>
                    <li><b>History:</b> สืบค้นประวัติรายชิ้นโดยละเอียด</li>
                </ul>
            </div></div>`;
    }

    // ============================================================
    // 4. GLOBAL ROUTER
    // ============================================================
    window.loadPage = async (page, param = null) => {
        const routes = {
            "dash": { title: "🏰 แผงควบคุม", render: renderDashboardPage },
            "wait": { title: "🕓 รอตรวจสอบ", render: renderWaitPage },
            "list": { title: "📋 ฐานข้อมูลครุภัณฑ์", render: renderListPage },
            "history": { title: "📜 ประวัติย้อนหลัง", render: () => renderHistoryPage(param) },
            "report": { title: "📑 รายงานเอกสาร", render: renderReportPage },
            "user": { title: "👥 จัดการสมาชิก", render: renderUserPage },
            "manual": { title: "📘 คู่มือการใช้งาน", render: renderManualPage }
        };
        const r = routes[page];
        if (r) {
            pageTitle.textContent = r.title;
            await r.render();
            // ปรับสีปุ่มให้เป็น Navy หลังเปลี่ยนหน้า
            document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
        }
    };

    // โหลดหน้า Dashboard เริ่มต้น
    window.loadPage("dash");
});
