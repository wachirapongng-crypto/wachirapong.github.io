// ============================================================
// 1. CONFIG & CONSTANTS
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
        return [];
    }
}

function showLoading(msg = "กำลังโหลดข้อมูล...") {
    document.getElementById("page-content").innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
            <h3 class="fw-bold">${msg}</h3>
        </div>`;
}

function downloadFile(base64Data, fileName) {
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
}

async function postAction(sheet, action, params = {}) {
    const body = new FormData();
    body.append("sheet", sheet);
    body.append("action", action);
    Object.entries(params).forEach(([k, v]) => body.append(k, v));
    return await fetchJSON(BASE_URL, "POST", body);
}

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
    if (m) {
        const p = m[1].split(',').map(Number);
        if (p.length >= 6) return `${pad(p[3])}:${pad(p[4])} น.`;
    }
    const t = String(val).match(/(\d{1,2}):(\d{2})/);
    if (t) return `${pad(t[1])}:${pad(t[2])} น.`;
    return val;
}

function getStatusBadgeClass(status) {
    const s = (status || "").trim();
    if (s.includes("ใช้งานได้")) return "bg-success";
    if (s.includes("ชำรุด") || s.includes("เสื่อมสภาพ")) return "bg-danger";
    if (s.includes("ซ่อม")) return "bg-warning text-dark";
    return "bg-secondary";
}

// ============================================================
// 3. ROUTER & PAGE RENDERING
// ============================================================

// ประกาศ loadPage เข้า window โดยตรง (ตัด let loadPage ออกแล้ว)
window.loadPage = async function(page, param = null) {
    const pageTitle = document.getElementById("page-title");
    showLoading();

    const routes = {
        "dash":   { t: "🏰 แผงควบคุม", f: renderDashboard },
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
        // ปรับสีปุ่ม Navy หลัง Render
        document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
    }
};

async function renderDashboard() {
    const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
    const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
    const broken = data.filter(r => String(r["สถานะ"]||"").includes("ชำรุด")).length;
    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 text-center">
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid ${THEME_COLOR}"><h6>ครุภัณฑ์ทั้งหมด</h6><h2 class="fw-bold">${total}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #ffc107"><h6>รอตรวจสอบ</h6><h2 class="fw-bold text-warning">${wait.length}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #dc3545"><h6>แจ้งชำรุด</h6><h2 class="fw-bold text-danger">${broken}</h2></div></div>
        </div>`;
}

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
            <td class="text-nowrap">${formatDateCell(r["วันที่"])}</td>
            <td class="text-nowrap">${formatTimeCell(r["เวลา"])}</td>
            <td class="text-center"><button class="btn btn-success btn-sm" onclick="confirmWait(this)">✔</button></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('WAIT', this)">🗑</button></td>
        </tr>`).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3"><button class="btn btn-success btn-sm" onclick="bulkConfirmWait()">✔ ยืนยันที่เลือก</button>
        <button class="btn btn-danger btn-sm" onclick="bulkDelete('WAIT')">🗑 ลบที่เลือก</button></div>
        <div class="table-responsive"><table class="table table-bordered align-middle shadow-sm bg-white">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th><th>ยืนยัน</th><th>ลบ</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table></div>`;
    bindTableEvents();
}

async function renderList() {
    const data = await fetchJSON(URLS.DATA);
    const rows = data.filter(r => r["รหัสครุภัณฑ์"]).map((r, i) => {
        const code = encodeURIComponent(r["รหัสครุภัณฑ์"]);
        return `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td class="fw-bold">${r["รหัสครุภัณฑ์"]}</td><td>${r["ชื่อครุภัณฑ์"]}</td>
            <td class="text-center"><img src="https://barcode.tec-it.com/barcode.ashx?data=${code}" height="30"></td>
            <td class="text-center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${code}" height="40"></td>
            <td class="text-center"><button class="btn btn-warning btn-sm" onclick="editList(this)">📝</button></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('DATA', this)">🗑</button></td>
            <td class="text-center"><button class="btn btn-info btn-sm text-white px-3" onclick="window.loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜 ประวัติ</button></td>
        </tr>`}).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3"><button class="btn btn-primary btn-sm" onclick="addListSequential()">➕ เพิ่มรายการ</button>
        <button class="btn btn-danger btn-sm" onclick="bulkDelete('DATA')">🗑 ลบที่เลือก</button></div>
        <div class="table-responsive"><table class="table table-bordered align-middle bg-white shadow-sm">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>Barcode</th><th>QRCode</th><th>แก้</th><th>ลบ</th><th>สืบค้น</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table></div>`;
    bindTableEvents();
}

async function renderUser() {
    const data = await fetchJSON(URLS.USER);
    const rows = data.map((u, i) => `
        <tr data-row="${u._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td>${u["ID"]||""}</td><td>${u["name"]||""}</td><td><span class="badge ${u["Status"]==='admin'?'bg-danger':'bg-info text-dark'}">${u["Status"]}</span></td>
            <td class="text-center">
                <button class="btn btn-warning btn-sm" onclick="editUser(this)">📝</button>
                <button class="btn btn-danger btn-sm" onclick="deleteRow('LOGIN', this)">🗑</button>
            </td>
        </tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <button class="btn btn-primary btn-sm" onclick="addUser()">➕ เพิ่มสมาชิกใหม่</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('LOGIN')">🗑 ลบที่เลือก</button>
        </div>
        <table class="table table-bordered align-middle bg-white shadow-sm"><thead class="table-dark"><tr><th>เลือก</th><th>ID</th><th>ชื่อสมาชิก</th><th>สิทธิ์</th><th>จัดการ</th></tr></thead><tbody id="table-body">${rows}</tbody></table>`;
    bindTableEvents();
}

async function renderHistory(id = "") {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
            <input type="text" id="h-input" class="form-control" placeholder="ระบุรหัสครุภัณฑ์..." value="${id}">
            <button class="btn btn-primary px-4" onclick="window.loadPage('history', document.getElementById('h-input').value)">สืบค้น</button>
            <button class="btn btn-secondary px-3" onclick="window.loadPage('list')">ย้อนกลับ</button>
        </div></div><div id="h-result"></div>`;
    
    if(!id) return;
    const resDiv = document.getElementById("h-result");
    resDiv.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-secondary"></div></div>`;
    
    const gvizURL = `https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`;
    const res = await fetch(gvizURL);
    const text = await res.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    const rows = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : ""));
    const filtered = rows.filter(r => String(r[0]) === String(id));

    if(filtered.length === 0) { resDiv.innerHTML = `<div class="alert alert-warning">ไม่พบประวัติสำหรับรหัส: ${id}</div>`; return; }

    resDiv.innerHTML = `
        <div class="p-3 bg-light rounded border mb-3">📦 <b>ครุภัณฑ์:</b> ${filtered[0][1]}</div>
        <div class="table-responsive shadow-sm"><table class="table table-bordered bg-white mb-0">
            <thead class="table-dark"><tr><th>วันที่</th><th>เวลา</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
            <tbody>${filtered.map(r => `<tr><td>${formatDateCell(r[5])}</td><td>${formatTimeCell(r[6])}</td><td>${r[2]}</td><td><span class="badge ${getStatusBadgeClass(r[3])}">${r[3]}</span></td><td>${r[4]}</td></tr>`).join("")}</tbody>
        </table></div>`;
}

async function renderReport() {
    const data = await fetchJSON(URLS.SHOW);
    const rows = data.map(r => `<tr><td>${r["รหัสครุภัณฑ์"]||""}</td><td>${r["ชื่อครุภัณฑ์"]||""}</td><td>${r["ที่เก็บ"]||""}</td><td>${r["สถานะ"]||""}</td></tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 text-end"><button class="btn btn-success" onclick="genReport('pdf')">📕 PDF</button> <button class="btn btn-primary" onclick="genReport('doc')">📑 Word</button></div>
        <div class="table-responsive"><table class="table table-bordered align-middle bg-white shadow-sm">
            <thead class="table-success"><tr><th>รหัส</th><th>ชื่อ</th><th>ที่เก็บ</th><th>สภาพ</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>`;
}

function renderManual() {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm p-4">
            <h4 class="fw-bold mb-4" style="color:${THEME_COLOR}"><i class="bi bi-journal-text me-2"></i> คู่มือการใช้งานระบบ</h4>
            <div class="row g-4">
                <div class="col-md-6"><h6>1. การตรวจสอบ (WAIT)</h6><p class="small">กดยืนยันเพื่อบันทึกประวัติ หรือเลือกหลายรายการเพื่อทำพร้อมกัน</p></div>
                <div class="col-md-6"><h6>2. ฐานข้อมูล (LIST)</h6><p class="small">เพิ่ม/แก้ไขรหัสครุภัณฑ์ ระบบสร้าง QR Code ให้อัตโนมัติ</p></div>
                <div class="col-md-6"><h6>3. ประวัติ (HISTORY)</h6><p class="small">ใช้สืบค้นรายการซ่อม/ย้ายย้อนหลังรายชิ้น</p></div>
                <div class="col-md-6"><h6>4. รายงาน (REPORT)</h6><p class="small">ดาวน์โหลดเอกสารสถานะล่าสุดเป็น PDF หรือ Word</p></div>
            </div>
        </div>`;
}

// ============================================================
// 4. ACTION LOGIC (Add/Edit/Delete)
// ============================================================

window.confirmWait = async (btn) => {
    const tr = btn.closest("tr");
    showLoading("กำลังยืนยัน...");
    await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, "หมายเหตุ": tr.querySelector(".wait-note").value });
    await postAction("WAIT", "delete", { row: tr.dataset.row });
    window.loadPage('wait');
};

window.bulkConfirmWait = async () => {
    const sel = getSelectedRows();
    if(sel.length === 0) return;
    showLoading(`กำลังบันทึก ${sel.length} รายการ...`);
    sel.sort((a,b) => b.dataset.row - a.dataset.row);
    for (let tr of sel) {
        await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, "หมายเหตุ": tr.querySelector(".wait-note").value });
        await postAction("WAIT", "delete", { row: tr.dataset.row });
    }
    window.loadPage('wait');
};

window.deleteRow = async (sheet, btn) => {
    const res = await Swal.fire({ title: 'ยืนยันการลบ?', icon: 'warning', showCancelButton: true });
    if(res.isConfirmed) {
        showLoading();
        await postAction(sheet, "delete", { row: btn.closest("tr").dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : (sheet === 'WAIT' ? 'wait' : 'user'));
    }
};

window.bulkDelete = async (sheet) => {
    const sel = getSelectedRows();
    if(sel.length === 0) return;
    const res = await Swal.fire({ title: `ลบ ${sel.length} รายการ?`, icon: 'error', showCancelButton: true });
    if(res.isConfirmed) {
        showLoading();
        sel.sort((a,b) => b.dataset.row - a.dataset.row);
        for (let tr of sel) await postAction(sheet, "delete", { row: tr.dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : (sheet === 'WAIT' ? 'wait' : 'user'));
    }
};

window.addListSequential = async function() {
    const { value: f } = await Swal.fire({
        title: 'เพิ่มครุภัณฑ์ใหม่',
        html: `<input id="sw-c" class="form-control mb-2" placeholder="รหัสครุภัณฑ์"><input id="sw-n" class="form-control" placeholder="ชื่อครุภัณฑ์">`,
        showCancelButton: true, confirmButtonText: 'บันทึกและเพิ่มต่อ', cancelButtonText: 'เสร็จสิ้น',
        preConfirm: () => ({ code: document.getElementById('sw-c').value.trim(), name: document.getElementById('sw-n').value.trim() })
    });
    if (f && f.code) {
        await postAction("DATA", "add", f);
        window.addListSequential();
    } else { window.loadPage('list'); }
};

window.addUser = async () => {
    const { value: f } = await Swal.fire({ 
        title: 'เพิ่มสมาชิก', 
        html: `<input id="u-i" class="form-control mb-2" placeholder="ID"><input id="u-p" class="form-control mb-2" placeholder="Pass"><input id="u-n" class="form-control mb-2" placeholder="ชื่อ">
               <select id="u-s" class="form-select"><option value="employee">Employee</option><option value="admin">Admin</option></select>`,
        preConfirm: () => ({ id: document.getElementById('u-i').value, pass: document.getElementById('u-p').value, name: document.getElementById('u-n').value, status: document.getElementById('u-s').value })
    });
    if (f && f.id) { await postAction("LOGIN", "addUser", f); window.loadPage('user'); }
};

window.genReport = async (fmt) => {
    showLoading("กำลังสร้างไฟล์...");
    const res = await postAction("SHOW", "generateReport", { format: fmt });
    if (res.fileData) {
        downloadFile(res.fileData, res.fileName);
        Swal.fire("สำเร็จ", "ดาวน์โหลดแล้ว", "success");
        window.loadPage('report');
    }
};

function bindTableEvents() {
    const chkAll = document.getElementById("check-all");
    if(chkAll) chkAll.onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

// เริ่มต้นแอป
document.addEventListener("DOMContentLoaded", () => window.loadPage("dash"));
