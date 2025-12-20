let loadPage;

document.addEventListener("DOMContentLoaded", () => {
    // 1. CONSTANTS
    const BASE_URL = "https://script.google.com/macros/s/AKfycbytUjsxc0zhTeD1qkb8DQOl7o7YzthDfSwAWXfroHqycY7IwZsEetpEoHKL_AC7R7HNVw/exec";
    const URLS = {
        DATA: BASE_URL + "?sheet=DATA",
        WAIT: BASE_URL + "?sheet=WAIT",
        USER: BASE_URL + "?sheet=LOGIN",
        SHOW: BASE_URL + "?sheet=SHOW",
        LOG:  BASE_URL + "?sheet=LOG"
    };
    const THEME_COLOR = "#002147"; // Navy Blue
    const pageTitle = document.getElementById("page-title");
    const pageContent = document.getElementById("page-content");

    // 2. CORE UTILITIES
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

    // ฟังก์ชันสร้างตารางมาตรฐาน (Uniform UI)
    const renderTable = (headers, rows, bulkBtns = "", toolBtns = "") => {
        pageContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div class="bulk-area d-flex gap-2">${bulkBtns}</div>
                <div class="tool-area d-flex gap-2">
                    ${toolBtns}
                    <input type="text" id="t-search" class="form-control form-control-sm shadow-sm" placeholder="🔍 ค้นหาในตาราง..." style="width:200px;">
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
        
        // ระบบค้นหา Real-time
        document.getElementById("t-search").onkeyup = (e) => {
            const val = e.target.value.toLowerCase();
            document.querySelectorAll("#table-body tr").forEach(tr => {
                tr.style.display = tr.innerText.toLowerCase().includes(val) ? "" : "none";
            });
        };
        // ระบบติ๊กทั้งหมด
        document.getElementById("check-all").onclick = (e) => {
            document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
        };
    };

    const getSelectedRows = () => Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));

    // ============================================================
    // 3. PAGE RENDERERS
    // ============================================================

    // --- [หน้ารวมสถิติ] DASHBOARD ---
    async function renderDashboardPage() {
        pageContent.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`;
        const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
        const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
        const broken = data.filter(r => String(r["สถานะ"] || "").includes("ชำรุด")).length;

        pageContent.innerHTML = `
            <div class="row g-4 mb-4 text-center">
                <div class="col-md-4"><div class="card p-3 border-0 shadow-sm" style="border-left:5px solid ${THEME_COLOR}"><small class="text-muted">ครุภัณฑ์ทั้งหมด</small><h2 class="fw-bold">${total}</h2></div></div>
                <div class="col-md-4"><div class="card p-3 border-0 shadow-sm" style="border-left:5px solid #ffc107"><small class="text-muted">รอตรวจสอบ</small><h2 class="fw-bold text-warning">${wait.length}</h2></div></div>
                <div class="col-md-4"><div class="card p-3 border-0 shadow-sm" style="border-left:5px solid #dc3545"><small class="text-muted">แจ้งชำรุด</small><h2 class="fw-bold text-danger">${broken}</h2></div></div>
            </div>`;
    }

    // --- [หน้าตรวจสอบ] WAIT ---
    async function renderWaitPage() {
        const data = await fetchJSON(URLS.WAIT);
        const rows = data.map((r, i) => `
            <tr data-row="${r._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td class="fw-bold">${r["รหัส"]||""}</td><td>${r["ชื่อ"]||""}</td>
                <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"]||""}"></td>
                <td class="text-center"><button class="btn btn-success btn-sm single-move">✔</button></td>
            </tr>`).join("");

        renderTable(["รหัส", "ชื่อ", "หมายเหตุ (ระบุเพิ่มได้)", "ยืนยัน"], rows, 
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

    // --- [หน้าฐานข้อมูล] LIST ---
    async function renderListPage() {
        const data = await fetchJSON(URLS.DATA);
        const rows = data.filter(r => r["รหัสครุภัณฑ์"]).map((r, i) => `
            <tr data-row="${r._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td class="fw-bold">${r["รหัสครุภัณฑ์"]}</td><td>${r["ชื่อครุภัณฑ์"]}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜 ประวัติ</button>
                    <button class="btn btn-sm btn-danger del-list">🗑 ลบ</button>
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

    // --- [หน้าสมาชิก] USER ---
    async function renderUserPage() {
        const data = await fetchJSON(URLS.USER);
        const rows = data.map((u, i) => `
            <tr data-row="${u._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td>${u["ID"]||""}</td><td>${u["name"]||""}</td>
                <td><span class="badge bg-info text-dark">${u["Status"]}</span></td>
                <td class="text-center"><button class="btn btn-sm btn-danger del-user">🗑 ลบ</button></td>
            </tr>`).join("");

        renderTable(["ID", "ชื่อสมาชิก", "สถานะ", "ลบ"], rows,
            `<button class="btn btn-danger btn-sm" id="bulk-del-user">🗑 ลบสมาชิกที่เลือก</button>`,
            `<button class="btn btn-primary btn-sm" id="add-bulk-user">📦 เพิ่มหลายคน</button>`
        );
    }

    // --- [หน้าสืบค้น] HISTORY ---
    async function renderHistoryPage(id = "") {
        pageContent.innerHTML = `
            <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
                <input type="text" id="h-input" class="form-control" placeholder="พิมพ์หรือสแกนรหัสครุภัณฑ์..." value="${id}">
                <button class="btn btn-primary" id="btn-h-search">สืบค้นประวัติ</button>
            </div></div>
            <div id="h-result"></div>`;

        const findH = async (val) => {
            if (!val) return;
            const resDiv = document.getElementById("h-result");
            resDiv.innerHTML = "กำลังค้นหา...";
            const json = await fetchJSON(`
