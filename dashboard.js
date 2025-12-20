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
    try {
        const options = method === "POST" ? { method: "POST", body } : { method: "GET" };
        const res = await fetch(url, options);
        return await res.json();
    } catch (e) { return []; }
}

async function postAction(sheet, action, params = {}) {
    const body = new FormData();
    body.append("sheet", sheet);
    body.append("action", action);
    Object.entries(params).forEach(([k, v]) => body.append(k, v));
    return await fetchJSON(BASE_URL, "POST", body);
}

function showLoading(msg = "กำลังบันทึกข้อมูล...") {
    document.getElementById("page-content").innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
            <h4 class="fw-bold">${msg}</h4>
        </div>`;
}

// ฟังก์ชันดาวน์โหลดไฟล์
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

// จัดการเรื่องเวลาและวันที่ (แก้ปัญหาปี 1899)
const pad = (n) => String(n).padStart(2, '0');
function formatDateCell(val) {
    if (!val || String(val).includes("1899")) return "-";
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
        if (p.length >= 5) return `${pad(p[3])}:${pad(p[4])} น.`;
    }
    const t = String(val).match(/(\d{1,2}):(\d{2})/);
    if (t) return `${pad(t[1])}:${pad(t[2])} น.`;
    return val;
}

const getSelectedRows = () => Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));

// ============================================================
// 3. ROUTER
// ============================================================

window.loadPage = async function(page, param = null) {
    const pageTitle = document.getElementById("page-title");
    showLoading("กำลังโหลดหน้ารายงาน...");

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
        document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
    }
};

// ============================================================
// 4. PAGE RENDERERS
// ============================================================

async function renderDashboard() {
    const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
    const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 text-center">
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid ${THEME_COLOR}"><h6>ยอดรวมครุภัณฑ์</h6><h2 class="fw-bold">${total}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #ffc107"><h6>รอการตรวจสอบ</h6><h2 class="fw-bold text-warning">${wait.length}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #0dcaf0"><h6>การเชื่อมต่อชีท</h6><h2 class="fw-bold text-info">ปกติ</h2></div></div>
        </div>`;
}

async function renderWait() {
    const data = await fetchJSON(URLS.WAIT);
    const rows = data.map((r, i) => `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td class="fw-bold">${r["รหัส"]||""}</td><td>${r["ชื่อ"]||""}</td>
            <td>${r["ที่อยู่"]||"-"}</td><td>${r["สถานะ"]||"-"}</td>
            <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"]||""}"></td>
            <td>${formatDateCell(r["วันที่"])}</td><td>${formatTimeCell(r["เวลา"])}</td>
            <td class="text-center"><button class="btn btn-success btn-sm" onclick="confirmWait(this)">✔</button></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('WAIT', this)">🗑</button></td>
        </tr>`).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <div><button class="btn btn-success btn-sm" onclick="bulkConfirmWait()">✔ ส่งที่เลือก</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('WAIT')">🗑 ลบที่เลือก</button></div>
            <button class="btn btn-outline-secondary btn-sm" onclick="window.loadPage('wait')">🔄 รีเฟรช</button>
        </div>
        <div class="table-responsive shadow-sm rounded border"><table class="table table-hover align-middle bg-white mb-0">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th><th>ส่ง</th><th>ลบ</th></tr></thead>
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
            <td class="text-center"><button class="btn btn-info btn-sm text-white" onclick="window.loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜 ประวัติ</button></td>
        </tr>`}).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <div><button class="btn btn-primary btn-sm" onclick="addSequential(1)">➕ เพิ่มรายการ</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('DATA')">🗑 ลบที่เลือก</button></div>
            <button class="btn btn-outline-secondary btn-sm" onclick="window.loadPage('list')">🔄 รีเฟรช</button>
        </div>
        <div class="table-responsive shadow-sm rounded border"><table class="table table-hover align-middle bg-white mb-0">
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
            <td class="text-center"><button class="btn btn-warning btn-sm" onclick="editUser(this)">📝</button></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('LOGIN', this)">🗑</button></td>
        </tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <button class="btn btn-primary btn-sm" onclick="addUser()">➕ เพิ่มสมาชิก</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('LOGIN')">🗑 ลบที่เลือก</button>
        </div>
        <div class="table-responsive shadow-sm rounded border"><table class="table table-hover align-middle bg-white mb-0"><thead class="table-dark"><tr><th>เลือก</th><th>ID</th><th>ชื่อสมาชิก</th><th>สิทธิ์</th><th>แก้</th><th>ลบ</th></tr></thead><tbody id="table-body">${rows}</tbody></table></div>`;
    bindTableEvents();
}

async function renderHistory(id = "") {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
            <input type="text" id="h-input" class="form-control" placeholder="รหัสครุภัณฑ์..." value="${id}">
            <button class="btn btn-primary" onclick="window.loadPage('history', document.getElementById('h-input').value)">สืบค้น</button>
            <button class="btn btn-secondary" onclick="window.loadPage('list')">ย้อนกลับ</button>
        </div></div><div id="h-result"></div>`;
    
    if(!id) return;
    const resDiv = document.getElementById("h-result");
    const json = await fetchJSON(`https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`);
    const logs = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : "")).filter(r => String(r[0]) === String(id));
    
    if(logs.length === 0) { resDiv.innerHTML = `<div class="alert alert-warning">ไม่พบประวัติสำหรับรหัส: ${id}</div>`; return; }
    resDiv.innerHTML = `
        <div class="p-3 bg-light rounded border mb-3"><b>รหัส:</b> ${id} | <b>ชื่อ:</b> ${logs[0][1]}</div>
        <div class="table-responsive"><table class="table table-bordered bg-white shadow-sm">
        <thead class="table-dark"><tr><th>วันที่</th><th>เวลา</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${logs.map(r => `<tr><td>${formatDateCell(r[5])}</td><td>${formatTimeCell(r[6])}</td><td>${r[2]}</td><td><span class="badge ${getStatusBadgeClass(r[3])}">${r[3]}</span></td><td>${r[4]}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderManual() {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm p-4">
            <h5 class="fw-bold mb-3" style="color:${THEME_COLOR}">📘 คู่มือการใช้งานระบบ (สำหรับอาจารย์)</h5>
            <hr>
            <p>1. <b>Dashboard:</b> สรุปจำนวนครุภัณฑ์แยกตามสถานะ</p>
            <p>2. <b>ตรวจสอบ (WAIT):</b> ใช้ยืนยันรายการแจ้งซ่อมหรือย้ายของเพื่อลงประวัติ ท่านสามารถเลือกหลายรายการแล้วกด "ส่งที่เลือก" เพื่อความรวดเร็ว</p>
            <p>3. <b>ฐานข้อมูล (LIST):</b> ใช้จัดการรหัสหลัก ระบบจะสร้าง Barcode/QRCode ให้อัตโนมัติ สามารถดูประวัติการซ่อมรายชิ้นได้ที่นี่</p>
            <p>4. <b>รายงาน (REPORT):</b> สรุปสถานะปัจจุบันเพื่อออกเอกสารทางการในรูปแบบ PDF หรือ Word</p>
        </div>`;
}

// ============================================================
// 5. ACTION LOGIC (Add/Edit/Delete)
// ============================================================

// ระบบเพิ่มรายการต่อเนื่อง (Sequential Add)
window.addSequential = async function(count) {
    const { value: f } = await Swal.fire({
        title: `รายการที่ ${count}`,
        html: `<input id="sw-c" class="form-control mb-2" placeholder="รหัสครุภัณฑ์"><input id="sw-n" class="form-control" placeholder="ชื่อครุภัณฑ์">`,
        showCancelButton: true, confirmButtonText: 'บันทึกและเพิ่มรายการต่อไป', cancelButtonText: 'เสร็จสิ้น',
        preConfirm: () => {
            const c = document.getElementById('sw-c').value;
            const n = document.getElementById('sw-n').value;
            if(!c || !n) { Swal.showValidationMessage('กรุณากรอกให้ครบ'); return false; }
            return { code: c.trim(), name: n.trim() };
        }
    });
    if (f) {
        await postAction("DATA", "add", f);
        window.addSequential(count + 1); // เรียกตัวเองซ้ำพร้อมเพิ่มลำดับ
    } else { window.loadPage('list'); }
};

window.confirmWait = async (btn) => {
    const tr = btn.closest("tr");
    const conf = await Swal.fire({ title: 'ยืนยันรายการ?', icon: 'question', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading("กำลังส่งข้อมูล...");
        await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.cells[3].innerText, "สถานะ": tr.cells[4].innerText, "หมายเหตุ": tr.querySelector(".wait-note").value });
        await postAction("WAIT", "delete", { row: tr.dataset.row });
        window.loadPage('wait');
    }
};

window.bulkConfirmWait = async () => {
    const sel = getSelectedRows();
    if(sel.length === 0) return Swal.fire("แจ้งเตือน", "กรุณาเลือกรายการ", "info");
    const conf = await Swal.fire({ title: `ส่ง ${sel.length} รายการ?`, icon: 'question', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading(`กำลังประมวลผล ${sel.length} รายการ...`);
        sel.sort((a,b) => b.dataset.row - a.dataset.row);
        for (let tr of sel) {
            await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.cells[3].innerText, "สถานะ": tr.cells[4].innerText, "หมายเหตุ": tr.querySelector(".wait-note").value });
            await postAction("WAIT", "delete", { row: tr.dataset.row });
        }
        window.loadPage('wait');
    }
};

window.deleteRow = async (sheet, btn) => {
    const conf = await Swal.fire({ title: 'ลบรายการนี้?', text: 'ไม่สามารถกู้คืนได้', icon: 'warning', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading("กำลังลบ...");
        await postAction(sheet, "delete", { row: btn.closest("tr").dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : (sheet === 'WAIT' ? 'wait' : 'user'));
    }
};

window.bulkDelete = async (sheet) => {
    const sel = getSelectedRows();
    if(sel.length === 0) return;
    const conf = await Swal.fire({ title: `ลบ ${sel.length} รายการ?`, icon: 'error', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading("กำลังลบ...");
        sel.sort((a,b) => b.dataset.row - a.dataset.row);
        for (let tr of sel) await postAction(sheet, "delete", { row: tr.dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : (sheet === 'WAIT' ? 'wait' : 'user'));
    }
};

window.editList = async (btn) => {
    const tr = btn.closest("tr");
    const { value: f } = await Swal.fire({
        title: 'แก้ไขครุภัณฑ์',
        html: `<input id="sw-c" class="form-control mb-2" value="${tr.cells[1].innerText}"><input id="sw-n" class="form-control" value="${tr.cells[2].innerText}">`,
        preConfirm: () => ({ code: document.getElementById('sw-c').value, name: document.getElementById('sw-n').value })
    });
    if (f) {
        showLoading();
        await postAction("DATA", "update", { row: tr.dataset.row, code: f.code, name: f.name });
        window.loadPage('list');
    }
};

window.editUser = async (btn) => {
    const tr = btn.closest("tr");
    const { value: f } = await Swal.fire({
        title: 'แก้ไขสมาชิก',
        html: `<input id="u-n" class="form-control" value="${tr.cells[2].innerText}" placeholder="ชื่อสมาชิก">
               <select id="u-s" class="form-select mt-2"><option value="employee">Employee</option><option value="admin">Admin</option></select>`,
        preConfirm: () => ({ name: document.getElementById('u-n').value, status: document.getElementById('u-s').value })
    });
    if (f) {
        showLoading();
        await postAction("LOGIN", "update", { row: tr.dataset.row, name: f.name, status: f.status });
        window.loadPage('user');
    }
};

window.addUser = async () => {
    const { value: f } = await Swal.fire({ 
        title: 'เพิ่มสมาชิกใหม่', 
        html: `<input id="u-i" class="form-control mb-2" placeholder="ID"><input id="u-p" class="form-control mb-2" placeholder="Password"><input id="u-n" class="form-control mb-2" placeholder="ชื่อ">
               <select id="u-s" class="form-select"><option value="employee">Employee</option><option value="admin">Admin</option></select>`,
        preConfirm: () => ({ id: document.getElementById('u-i').value, pass: document.getElementById('u-p').value, name: document.getElementById('u-n').value, status: document.getElementById('u-s').value })
    });
    if (f && f.id) { await postAction("LOGIN", "addUser", f); window.loadPage('user'); }
};

window.genReport = async (fmt) => {
    showLoading("กำลังสร้างไฟล์รายงาน...");
    const res = await postAction("SHOW", "generateReport", { format: fmt });
    if (res.fileData) { downloadFile(res.fileData, res.fileName); Swal.fire("สำเร็จ", "ดาวน์โหลดแล้ว", "success"); window.loadPage('report'); }
};

function bindTableEvents() {
    const chkAll = document.getElementById("check-all");
    if(chkAll) chkAll.onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

document.addEventListener("DOMContentLoaded", () => window.loadPage("dash"));
