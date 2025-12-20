// ============================================================
// 1. GLOBAL CONFIG & CONSTANTS
// ============================================================
const BASE_URL = "https://script.google.com/macros/s/AKfycbytUjsxc0zhTeD1qkb8DQOl7o7YzthDfSwAWXfroHqycY7IwZsEetpEoHKL_AC7R7HNVw/exec";
const URLS = Object.freeze({
    DATA: BASE_URL + "?sheet=DATA",
    WAIT: BASE_URL + "?sheet=WAIT",
    LOG:  BASE_URL + "?sheet=LOG",
    USER: BASE_URL + "?sheet=LOGIN",
    SHOW: BASE_URL + "?sheet=SHOW"
});
const THEME_COLOR = "#002147"; // Navy Blue

// ============================================================
// 2. UTILITY FUNCTIONS (Core Engine)
// ============================================================

async function fetchJSON(url, method = "GET", body = null) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const options = method === "POST" ? { method: "POST", body, signal: controller.signal } : { method: "GET", signal: controller.signal };
        const response = await fetch(url, options);
        clearTimeout(timeout);
        const text = await response.text();
        return JSON.parse(text);
    } catch (err) {
        clearTimeout(timeout);
        console.error("fetchJSON error:", err);
        return [];
    }
}

function showLoading(message = "กำลังโหลดข้อมูล...") {
    document.getElementById("page-content").innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
            <h3 class="fw-bold text-navy">${message}</h3>
        </div>`;
}

function downloadFile(base64Data, fileName) {
    try {
        const byteCharacters = atob(base64Data.replace(/-/g, '+').replace(/_/g, '/'));
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/octet-stream" });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
    } catch (e) { console.error("Download Error:", e); }
}

async function postAction(sheet, action, params = {}) {
    const body = new FormData();
    body.append("sheet", sheet);
    body.append("action", action);
    Object.entries(params).forEach(([k, v]) => body.append(k, v));
    return await fetchJSON(BASE_URL, "POST", body);
}

function formatDateTH(v) {
    if (!v) return "-";
    let d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear() + 543}`;
}

// ============================================================
// 3. ROUTER (The Page Switcher)
// ============================================================

window.loadPage = async function(page, param = null) {
    const pageTitle = document.getElementById("page-title");
    showLoading(); // แสดง Animation การโหลดทุกครั้งที่เปลี่ยนหน้า

    const routes = {
        "dash":   { t: "🏰 แผงควบคุม (Dashboard)", f: renderDashboard },
        "wait":   { t: "🕓 ครุภัณฑ์ที่รอตรวจสอบ", f: renderWait },
        "list":   { t: "📋 รายการครุภัณฑ์ทั้งหมด", f: renderList },
        "history": { t: "📜 ประวัติย้อนหลัง", f: () => renderHistory(param) },
        "user":    { t: "👥 จัดการสมาชิก", f: renderUser },
        "report":  { t: "📑 รายงานและเอกสาร", f: renderReport },
        "manual":  { t: "📘 คู่มือการใช้งาน", f: renderManual }
    };

    const route = routes[page];
    if (route) {
        pageTitle.textContent = route.t;
        await route.f();
        // ปรับสีปุ่มให้เป็นธีมหน่วยงาน
        document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
    }
};

// ============================================================
// 4. PAGE RENDERERS (HTML Generators)
// ============================================================

// --- หน้า DASHBOARD ---
async function renderDashboard() {
    const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
    const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
    const broken = data.filter(r => String(r["สถานะ"]||"").includes("ชำรุด")).length;
    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 text-center">
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid ${THEME_COLOR}"><h6>ทั้งหมด</h6><h2 class="fw-bold">${total}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #ffc107"><h6>รอตรวจสอบ</h6><h2 class="fw-bold text-warning">${wait.length}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #dc3545"><h6>ชำรุด</h6><h2 class="fw-bold text-danger">${broken}</h2></div></div>
        </div>`;
}

// --- หน้า WAIT (ครบทุกคอลัมน์ + ระบบกลุ่ม) ---
async function renderWait() {
    const data = await fetchJSON(URLS.WAIT);
    const LOCS = ["-","501","502","503","401","ห้องพักครู","301"];
    const STAS = ["-","ใช้งานได้","ชำรุด","เสื่อมสภาพ"];
    const opt = (arr, sel) => arr.map(v => `<option value="${v}" ${v===sel?'selected':''}>${v}</option>`).join("");

    const rows = data.map((r, i) => `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td class="fw-bold">${r["รหัส"]||""}</td><td>${r["ชื่อ"]||""}</td>
            <td><select class="form-select form-select-sm wait-loc">${opt(LOCS, r["ที่อยู่"])}</select></td>
            <td><select class="form-select form-select-sm wait-status">${opt(STAS, r["สถานะ"])}</select></td>
            <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"]||""}"></td>
            <td class="text-nowrap">${formatDateTH(r["วันที่"])}</td>
            <td>${r["เวลา"]||"-"}</td>
            <td class="text-center">
                <button class="btn btn-success btn-sm" onclick="confirmWait(this)">✔</button>
                <button class="btn btn-danger btn-sm" onclick="deleteRow('WAIT', this)">🗑</button>
            </td>
        </tr>`).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <div><button class="btn btn-success btn-sm" onclick="bulkConfirmWait()">✔ ยืนยันที่เลือก</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('WAIT')">🗑 ลบที่เลือก</button></div>
            <button class="btn btn-outline-secondary btn-sm" onclick="window.loadPage('wait')">🔄 รีเฟรช</button>
        </div>
        <div class="table-responsive"><table class="table table-bordered align-middle bg-white shadow-sm">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th><th>ส่ง</th><th>ลบ</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table></div>`;
    bindTableEvents();
}

// --- หน้า LIST (Barcode + QR + Edit + Bulk) ---
async function renderList() {
    const data = await fetchJSON(URLS.DATA);
    const rows = data.filter(r => r["รหัสครุภัณฑ์"]).map((r, i) => {
        const code = encodeURIComponent(r["รหัสครุภัณฑ์"]);
        return `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td class="fw-bold">${r["รหัสครุภัณฑ์"]}</td><td>${r["ชื่อครุภัณฑ์"]}</td>
            <td class="text-center"><img src="https://barcode.tec-it.com/barcode.ashx?data=${code}" height="30"></td>
            <td class="text-center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${code}" height="40"></td>
            <td class="text-center"><button class="btn btn-warning btn-sm" onclick="editList(this)">📝</button></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('DATA', this)">🗑</button></td>
            <td class="text-center"><button class="btn btn-info btn-sm text-white" onclick="window.loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜</button></td>
        </tr>`}).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <div><button class="btn btn-primary btn-sm" onclick="addList()">➕ เพิ่มรายการ</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('DATA')">🗑 ลบที่เลือก</button></div>
            <button class="btn btn-outline-secondary btn-sm" onclick="window.loadPage('list')">🔄 รีเฟรช</button>
        </div>
        <div class="table-responsive"><table class="table table-bordered align-middle shadow-sm bg-white">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>Barcode</th><th>QRCode</th><th>แก้</th><th>ลบ</th><th>ประวัติ</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table></div>`;
    bindTableEvents();
}

// --- หน้า USER ---
async function renderUser() {
    const data = await fetchJSON(URLS.USER);
    const rows = data.map((u, i) => `<tr data-row="${u._row || i+2}">
        <td><input type="checkbox" class="form-check-input row-checkbox"></td>
        <td>${u["ID"]||""}</td><td>${u["name"]||""}</td><td><span class="badge bg-info text-dark">${u["Status"]}</span></td>
        <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('LOGIN', this)">🗑</button></td>
    </tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3"><button class="btn btn-primary btn-sm" onclick="addUser()">➕ เพิ่มสมาชิก</button></div>
        <table class="table table-bordered bg-white shadow-sm"><thead class="table-dark"><tr><th>เลือก</th><th>ID</th><th>ชื่อ</th><th>สถานะ</th><th>ลบ</th></tr></thead><tbody id="table-body">${rows}</tbody></table>`;
    bindTableEvents();
}

// --- หน้า HISTORY ---
async function renderHistory(id = "") {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
            <input type="text" id="h-input" class="form-control" placeholder="ระบุรหัสครุภัณฑ์..." value="${id}">
            <button class="btn btn-primary" onclick="window.loadPage('history', document.getElementById('h-input').value)">สืบค้นประวัติ</button>
        </div></div><div id="h-result"></div>`;
    if(!id) return;
    const resDiv = document.getElementById("h-result");
    resDiv.innerHTML = "กำลังสืบค้นจาก LOG...";
    const json = await fetchJSON(`https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`);
    const logs = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : "")).filter(r => String(r[0]) === String(id));
    if(logs.length === 0) { resDiv.innerHTML = `<div class="alert alert-warning">ไม่พบประวัติ</div>`; return; }
    resDiv.innerHTML = `<div class="table-responsive"><table class="table table-striped border bg-white shadow-sm">
        <thead class="table-dark"><tr><th>วันที่</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${logs.map(r => `<tr><td>${formatDateTH(r[5])}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join("")}</tbody></table></div>`;
}

// --- หน้า REPORT ---
async function renderReport() {
    const data = await fetchJSON(URLS.SHOW);
    const rows = data.map(r => `<tr><td>${r["รหัสครุภัณฑ์"]||""}</td><td>${r["ชื่อครุภัณฑ์"]||""}</td><td>${r["ที่เก็บ"]||""}</td><td>${r["สถานะ"]||""}</td></tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 text-end"><button class="btn btn-success" onclick="genReport('pdf')">📕 PDF</button> <button class="btn btn-primary" onclick="genReport('doc')">📑 Word</button></div>
        <div class="table-responsive"><table class="table table-bordered bg-white shadow-sm">
            <thead class="table-success"><tr><th>รหัส</th><th>ชื่อ</th><th>ที่เก็บ</th><th>สภาพ</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>`;
}

function renderManual() {
    document.getElementById("page-content").innerHTML = `<div class="card p-4 shadow-sm border-0"><h5 class="fw-bold">📘 คู่มือการใช้งาน</h5><hr><p>1. <b>Dashboard:</b> สรุปยอดรวม<br>2. <b>Wait:</b> ตรวจสอบรายการและกดยืนยันเพื่อบันทึกประวัติ<br>3. <b>List:</b> จัดการฐานข้อมูลหลัก</p></div>`;
}

// ============================================================
// 5. ACTION LOGIC (Add/Edit/Delete/Report)
// ============================================================

async function confirmWait(btn) {
    const tr = btn.closest("tr");
    showLoading("กำลังยืนยันข้อมูล...");
    await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, "หมายเหตุ": tr.querySelector(".wait-note").value });
    await postAction("WAIT", "delete", { row: tr.dataset.row });
    window.loadPage('wait');
}

async function bulkConfirmWait() {
    const sel = Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));
    if(sel.length === 0) return;
    showLoading(`กำลังประมวลผล ${sel.length} รายการ...`);
    for (let tr of sel) {
        await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, "หมายเหตุ": tr.querySelector(".wait-note").value });
        await postAction("WAIT", "delete", { row: tr.dataset.row });
    }
    window.loadPage('wait');
}

async function deleteRow(sheet, btn) {
    const conf = await Swal.fire({ title: 'ยืนยันการลบ?', icon: 'warning', showCancelButton: true });
    if (conf.isConfirmed) {
        showLoading("กำลังลบข้อมูล...");
        await postAction(sheet, "delete", { row: btn.closest("tr").dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : (sheet === 'WAIT' ? 'wait' : 'user'));
    }
}

async function bulkDelete(sheet) {
    const sel = Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));
    if(sel.length === 0) return;
    const conf = await Swal.fire({ title: `ลบ ${sel.length} รายการ?`, icon: 'error', showCancelButton: true });
    if (conf.isConfirmed) {
        showLoading("กำลังลบ...");
        for (let tr of sel) await postAction(sheet, "delete", { row: tr.dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : 'wait');
    }
}

async function addList() {
    const { value: f } = await Swal.fire({ title: 'เพิ่มใหม่', html: `<input id="sw-c" class="form-control mb-2" placeholder="รหัส"><input id="sw-n" class="form-control" placeholder="ชื่อ">`, preConfirm: () => ({ code: document.getElementById('sw-c').value, name: document.getElementById('sw-n').value })});
    if (f && f.code) { showLoading("กำลังบันทึก..."); await postAction("DATA", "add", f); window.loadPage('list'); }
}

async function editList(btn) {
    const tr = btn.closest("tr");
    const { value: f } = await Swal.fire({ title: 'แก้ไข', html: `<input id="sw-c" class="form-control mb-2" value="${tr.cells[1].innerText}"><input id="sw-n" class="form-control" value="${tr.cells[2].innerText}">`, preConfirm: () => ({ code: document.getElementById('sw-c').value, name: document.getElementById('sw-n').value })});
    if (f) { showLoading("กำลังอัปเดต..."); await postAction("DATA", "update", { row: tr.dataset.row, code: f.code, name: f.name }); window.loadPage('list'); }
}

async function addUser() {
    const { value: f } = await Swal.fire({ title: 'เพิ่มสมาชิก', html: `<input id="u-i" class="form-control mb-2" placeholder="ID"><input id="u-p" class="form-control mb-2" placeholder="Pass"><input id="u-n" class="form-control" placeholder="ชื่อ">`, preConfirm: () => ({ id: document.getElementById('u-i').value, pass: document.getElementById('u-p').value, name: document.getElementById('u-n').value, status: 'employee' })});
    if (f && f.id) { showLoading("กำลังเพิ่ม..."); await postAction("LOGIN", "addUser", f); window.loadPage('user'); }
}

async function genReport(fmt) {
    showLoading("กำลังสร้างไฟล์รายงาน...");
    const res = await postAction("SHOW", "generateReport", { format: fmt });
    if (res.fileData) {
        downloadFile(res.fileData, res.fileName);
        Swal.fire("สำเร็จ", "ดาวน์โหลดเรียบร้อย", "success");
        window.loadPage('report');
    }
}

function bindTableEvents() {
    const chk = document.getElementById("check-all");
    if(chk) chk.onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

// เริ่มต้นแอป
document.addEventListener("DOMContentLoaded", () => window.loadPage("dash"));
