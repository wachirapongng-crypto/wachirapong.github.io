// ============================================================
// 1. CONSTANTS & CONFIG (ประกาศไว้นอกสุดเพื่อความเสถียร)
// ============================================================
const BASE_URL = "https://script.google.com/macros/s/AKfycbytUjsxc0zhTeD1qkb8DQOl7o7YzthDfSwAWXfroHqycY7IwZsEetpEoHKL_AC7R7HNVw/exec";
const URLS = Object.freeze({
    DATA: BASE_URL + "?sheet=DATA",
    WAIT: BASE_URL + "?sheet=WAIT",
    LOG:  BASE_URL + "?sheet=LOG",
    USER: BASE_URL + "?sheet=LOGIN",
    SHOW: BASE_URL + "?sheet=SHOW"
});
const THEME_COLOR = "#002147";

// ตัวแปรเก็บสถานะหน้าปัจจุบันเพื่อใช้ Refresh
let currentPage = 'dash';

// ============================================================
// 2. CORE UTILITIES
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

function showLoadingMessage(message = "กำลังประมวลผล...") {
    const content = document.getElementById("page-content");
    content.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
            <h3 class="mb-3">${message}</h3>
        </div>`;
}

function downloadFile(base64Data, fileName) {
    try {
        const byteCharacters = atob(base64Data.replace(/-/g, '+').replace(/_/g, '/'));
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/octet-stream" });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link); // ต้อง append เข้า body ก่อนในบาง Browser
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
    } catch (e) { console.error("Download Error:", e); }
}

function formatDateTH(v) {
    if (!v) return "-";
    let d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear() + 543}`;
}

async function postAction(sheet, action, params = {}) {
    const body = new FormData();
    body.append("sheet", sheet);
    body.append("action", action);
    Object.entries(params).forEach(([k, v]) => body.append(k, v));
    return await fetchJSON(BASE_URL, "POST", body);
}

// ============================================================
// 3. ROUTER (ประกาศแบบ Global Function)
// ============================================================

window.loadPage = async function(page, param = null) {
    currentPage = page; // บันทึกหน้าปัจจุบัน
    const pageTitle = document.getElementById("page-title");
    showLoadingMessage("กำลังโหลดข้อมูล...");

    const routes = {
        "dash":   { t: "🏰 แผงควบคุม", f: renderDashboardPage },
        "wait":   { t: "🕓 ครุภัณฑ์ที่รอตรวจสอบ", f: renderWaitPage },
        "list":   { t: "📋 รายการครุภัณฑ์ทั้งหมด", f: renderListPage },
        "history": { t: "📜 ประวัติย้อนหลัง", f: () => renderHistoryPage(param) },
        "user":    { t: "👥 จัดการสมาชิก", f: renderUserPage },
        "report":  { t: "📑 รายงานและการออกเอกสาร", f: renderReportPage },
        "manual":  { t: "📘 คู่มือการใช้งาน", f: renderManualPage }
    };

    const route = routes[page];
    if (route) {
        pageTitle.textContent = route.t;
        await route.f();
        // ปรับสีปุ่มหลังโหลดเสร็จ
        document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
    }
};

// ============================================================
// 4. PAGES RENDERERS
// ============================================================

async function renderDashboardPage() {
    const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
    const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
    const broken = data.filter(r => String(r["สถานะ"]||"").includes("ชำรุด")).length;
    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 mb-4 text-center">
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid ${THEME_COLOR}"><small>ครุภัณฑ์ทั้งหมด</small><h2 class="fw-bold">${total}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #ffc107"><small>รอตรวจสอบ</small><h2 class="fw-bold text-warning">${wait.length}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #dc3545"><small>แจ้งชำรุด</small><h2 class="fw-bold text-danger">${broken}</h2></div></div>
        </div>`;
}

async function renderWaitPage() {
    const data = await fetchJSON(URLS.WAIT);
    const LOCS = ["-","501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
    const STAS = ["-","ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];
    const opt = (arr, sel) => arr.map(v => `<option value="${v}" ${v===sel?'selected':''}>${v}</option>`).join("");

    const rows = data.map((r, i) => `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td class="fw-bold">${r["รหัส"]||""}</td>
            <td>${r["ชื่อ"]||""}</td>
            <td><select class="form-select form-select-sm wait-loc">${opt(LOCS, r["ที่อยู่"])}</select></td>
            <td><select class="form-select form-select-sm wait-status">${opt(STAS, r["สถานะ"])}</select></td>
            <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"]||""}"></td>
            <td class="text-nowrap">${formatDateTH(r["วันที่"])}</td>
            <td class="text-nowrap">${r["เวลา"]||"-"}</td>
            <td class="text-center"><button class="btn btn-success btn-sm" onclick="confirmWait(this)">✔</button></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteWait(this)">🗑</button></td>
        </tr>`).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <div><button class="btn btn-success btn-sm" onclick="bulkConfirmWait()">✔ ยืนยันที่เลือก</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('WAIT')">🗑 ลบที่เลือก</button></div>
            <button class="btn btn-outline-secondary btn-sm" onclick="window.loadPage('wait')">🔄 รีเฟรช</button>
        </div>
        <div class="table-responsive"><table class="table table-bordered align-middle shadow-sm">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th><th>ยืนยัน</th><th>ลบ</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table></div>`;
    bindTableEvents();
}

async function renderListPage() {
    const data = await fetchJSON(URLS.DATA);
    const rows = data.filter(r => r["รหัสครุภัณฑ์"]).map((r, i) => {
        const code = encodeURIComponent(r["รหัสครุภัณฑ์"]);
        return `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td>${i+1}</td>
            <td class="fw-bold">${r["รหัสครุภัณฑ์"]}</td>
            <td>${r["ชื่อครุภัณฑ์"]}</td>
            <td class="text-center"><img src="https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128" height="35"></td>
            <td class="text-center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${code}" height="45"></td>
            <td class="text-center"><button class="btn btn-warning btn-sm" onclick="editList(this)">📝</button></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteList(this)">🗑</button></td>
            <td class="text-center"><button class="btn btn-info btn-sm text-white" onclick="window.loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜</button></td>
        </tr>`}).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <div><button class="btn btn-primary btn-sm" onclick="addList()">➕ เพิ่มรายการ</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('DATA')">🗑 ลบที่เลือก</button></div>
            <button class="btn btn-outline-secondary btn-sm" onclick="window.loadPage('list')">🔄 รีเฟรช</button>
        </div>
        <div class="table-responsive"><table class="table table-bordered align-middle">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>#</th><th>รหัส</th><th>ชื่อ</th><th>Barcode</th><th>QRCode</th><th>แก้ไข</th><th>ลบ</th><th>ประวัติ</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table></div>`;
    bindTableEvents();
}

async function renderUserPage() {
    const data = await fetchJSON(URLS.USER);
    const rows = data.map((u, i) => `
        <tr data-row="${u._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td>${u["ID"]||""}</td><td>****</td><td><span class="badge bg-info text-dark">${u["Status"]}</span></td><td>${u["name"]||""}</td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteUser(this)">🗑</button></td>
        </tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3"><button class="btn btn-primary btn-sm" onclick="addUser()">➕ เพิ่มสมาชิก</button></div>
        <table class="table table-bordered">
            <thead class="table-dark"><tr><th>เลือก</th><th>ID</th><th>Pass</th><th>Status</th><th>Name</th><th>ลบ</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table>`;
    bindTableEvents();
}

async function renderHistoryPage(id = "") {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
            <input type="text" id="h-input" class="form-control" placeholder="รหัสครุภัณฑ์..." value="${id}">
            <button class="btn btn-primary" onclick="window.loadPage('history', document.getElementById('h-input').value)">สืบค้น</button>
        </div></div><div id="h-result"></div>`;
    if(!id) return;
    const resDiv = document.getElementById("h-result");
    resDiv.innerHTML = "กำลังสืบค้นจากฐานข้อมูล LOG...";
    const json = await fetchJSON(`https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`);
    const logs = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : "")).filter(r => String(r[0]) === String(id));
    if(logs.length === 0) { resDiv.innerHTML = `<div class="alert alert-warning">ไม่พบประวัติ</div>`; return; }
    resDiv.innerHTML = `<table class="table table-striped border"><thead><tr><th>วันที่</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${logs.map(r => `<tr><td>${formatDateTH(r[5])}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join("")}</tbody></table>`;
}

async function renderReportPage() {
    const data = await fetchJSON(URLS.SHOW);
    const rows = data.map(r => `<tr><td>${r["รหัสครุภัณฑ์"]||""}</td><td>${r["ชื่อครุภัณฑ์"]||""}</td><td>${r["ที่เก็บ"]||""}</td><td>${r["สถานะ"]||""}</td></tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 text-end"><button class="btn btn-success" onclick="generateReport('pdf')">📕 PDF</button> <button class="btn btn-primary" onclick="generateReport('doc')">📑 Word</button></div>
        <table class="table table-bordered shadow-sm">
            <thead class="table-success"><tr><th>รหัส</th><th>ชื่อ</th><th>ที่เก็บ</th><th>สภาพ</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderManualPage() {
    document.getElementById("page-content").innerHTML = `<div class="card p-4 shadow-sm"><h5>📘 คู่มือการใช้งาน</h5><hr><p>1. หน้า Dashboard ใช้ดูสรุปยอด<br>2. หน้าตรวจสอบ ใช้ยืนยันรายการที่สแกนเข้ามา<br>3. หน้าฐานข้อมูล ใช้จัดการรายชื่อครุภัณฑ์ทั้งหมด</p></div>`;
}

// ============================================================
// 5. ACTION FUNCTIONS (Confirm/Delete/Add)
// ============================================================

async function confirmWait(btn) {
    const tr = btn.closest("tr");
    showLoadingMessage("กำลังย้ายข้อมูล...");
    const res = await postAction("LOG", "addLog", {
        "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText,
        "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value,
        "หมายเหตุ": tr.querySelector(".wait-note").value, "วันที่": formatDateTH(new Date()), "เวลา": new Date().toLocaleTimeString()
    });
    await postAction("WAIT", "delete", { row: tr.dataset.row });
    window.loadPage('wait');
}

async function bulkConfirmWait() {
    const selected = Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));
    if(selected.length === 0) return;
    const conf = await Swal.fire({ title: `ยืนยัน ${selected.length} รายการ?`, showCancelButton: true });
    if(conf.isConfirmed) {
        showLoadingMessage("กำลังประมวลผลกลุ่ม...");
        for (let tr of selected) {
            await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, "หมายเหตุ": tr.querySelector(".wait-note").value });
            await postAction("WAIT", "delete", { row: tr.dataset.row });
        }
        window.loadPage('wait');
    }
}

async function generateReport(fmt) {
    showLoadingMessage("กำลังจัดทำไฟล์...");
    const res = await postAction("SHOW", "generateReport", { format: fmt });
    if (res.status === "success" || res.fileData) {
        downloadFile(res.fileData, res.fileName);
        Swal.fire("สำเร็จ", "ดาวน์โหลดแล้ว", "success");
        window.loadPage('report');
    }
}

// Helper: ผูกเหตุการณ์ Checkbox ทั้งหมด
function bindTableEvents() {
    const chkAll = document.getElementById("check-all");
    if(chkAll) chkAll.onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

// เริ่มต้นโหลดหน้า Dashboard
document.addEventListener("DOMContentLoaded", () => window.loadPage("dash"));
