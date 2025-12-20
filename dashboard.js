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

const LOCATIONS = ["-", "501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
const STATUS_OPTIONS = ["-", "ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

// ============================================================
// 2. UTILITY FUNCTIONS
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

function showLoading(msg = "กำลังประมวลผล...") {
    document.getElementById("page-content").innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" style="width: 3.5rem; height: 3.5rem;"></div>
            <h4 class="fw-bold">${msg}</h4>
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

const pad = (n) => String(n).padStart(2, '0');
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

function formatDateCell(val) {
    if (!val || String(val).includes("1899")) return "-";
    const m = String(val).match(/Date\(([^)]+)\)/);
    if (m) {
        const [y, mo, d] = m[1].split(',').map(Number);
        return `${pad(d)}/${pad(mo + 1)}/${y + 543}`;
    }
    return val;
}

const getSelectedRows = () => Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));

// ============================================================
// 3. ROUTER & PAGE RENDERING
// ============================================================

window.loadPage = async function(page, param = null) {
    const pageTitle = document.getElementById("page-title");
    showLoading(); 

    // ตรวจสอบชื่อฟังก์ชันใน routes ให้ตรงกับด้านล่าง
    const routes = {
        "dash":    renderDashboard,
        "wait":    renderWait,
        "list":    renderList,
        "history": () => renderHistory(param),
        "user":    renderUser,
        "report":  renderReport,
        "manual":  renderManual
    };

    const titles = {
        "dash": "🏰 แผงควบคุม", "wait": "🕓 รอตรวจสอบ", "list": "📋 ฐานข้อมูลครุภัณฑ์",
        "history": "📜 ประวัติย้อนหลัง", "user": "👥 จัดการสมาชิก", "report": "📑 รายงานและเอกสาร", "manual": "📘 คู่มือการใช้งาน"
    };

    if (routes[page]) {
        pageTitle.textContent = titles[page];
        await routes[page]();
        document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
    }
};

// ============================================================
// 4. PAGES
// ============================================================

async function renderDashboard() {
    const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
    const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 text-center">
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid ${THEME_COLOR}"><h6>ยอดรวมครุภัณฑ์</h6><h2 class="fw-bold">${total}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #ffc107"><h6>รอการตรวจสอบ</h6><h2 class="fw-bold text-warning">${wait.length}</h2></div></div>
            <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #0dcaf0"><h6>สถานะ</h6><h2 class="fw-bold text-info">พร้อมใช้งาน</h2></div></div>
        </div>`;
}

async function renderWait() {
    const data = await fetchJSON(URLS.WAIT);
    const opt = (arr, sel) => arr.map(v => `<option value="${v}" ${v === sel ? 'selected' : ''}>${v}</option>`).join("");

    const rows = data.map((r, i) => `
        <tr data-row="${r._row || i+2}">
            <td><input type="checkbox" class="form-check-input row-checkbox"></td>
            <td class="fw-bold">${r["รหัส"]||""}</td><td>${r["ชื่อ"]||""}</td>
            <td><select class="form-select form-select-sm wait-loc">${opt(LOCATIONS, r["ที่อยู่"])}</select></td>
            <td><select class="form-select form-select-sm wait-status">${opt(STATUS_OPTIONS, r["สถานะ"])}</select></td>
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
        <div class="table-responsive shadow-sm border rounded"><table class="table table-hover align-middle bg-white mb-0">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th><th>ส่ง</th><th>ลบ</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table></div>`;
    document.getElementById("check-all").onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
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
            <td class="text-center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${code}" height="45"></td>
            <td class="text-center"><button class="btn btn-warning btn-sm" onclick="editList(this)">📝</button></td>
            <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('DATA', this)">🗑</button></td>
            <td class="text-center"><button class="btn btn-info btn-sm text-white px-3" onclick="window.loadPage('history', '${r["รหัสครุภัณฑ์"]}')">📜 ประวัติ</button></td>
        </tr>`}).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <div><button class="btn btn-primary btn-sm" onclick="openDynamicAddForm()">➕ เพิ่มรายการ (หลายชุด)</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('DATA')">🗑 ลบที่เลือก</button></div>
            <button class="btn btn-outline-secondary btn-sm" onclick="window.loadPage('list')">🔄 รีเฟรช</button>
        </div>
        <div class="table-responsive shadow-sm rounded border"><table class="table table-hover align-middle bg-white mb-0">
            <thead class="table-dark"><tr><th><input type="checkbox" id="check-all"></th><th>รหัส</th><th>ชื่อ</th><th>Barcode</th><th>QRCode</th><th>แก้</th><th>ลบ</th><th>สืบค้น</th></tr></thead>
            <tbody id="table-body">${rows}</tbody>
        </table></div>`;
    document.getElementById("check-all").onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

async function renderUser() {
    const data = await fetchJSON(URLS.USER);
    const rows = data.map((u, i) => `<tr data-row="${u._row || i+2}">
        <td><input type="checkbox" class="form-check-input row-checkbox"></td>
        <td>${u["ID"]||""}</td><td>${u["name"]||""}</td><td><span class="badge ${u["Status"]==='admin'?'bg-danger':'bg-info text-dark'}">${u["Status"]}</span></td>
        <td class="text-center"><button class="btn btn-warning btn-sm" onclick="editUser(this)">📝 แก้ไข</button></td>
        <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('LOGIN', this)">🗑 ลบ</button></td>
    </tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <button class="btn btn-primary btn-sm" onclick="addUser()">➕ เพิ่มสมาชิกใหม่</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('LOGIN')">🗑 ลบสมาชิกที่เลือก</button>
        </div>
        <div class="table-responsive shadow-sm rounded border"><table class="table table-hover align-middle bg-white mb-0"><thead class="table-dark"><tr><th>เลือก</th><th>ID</th><th>ชื่อ</th><th>สิทธิ์</th><th>แก้</th><th>ลบ</th></tr></thead><tbody id="table-body">${rows}</tbody></table></div>`;
    document.getElementById("check-all").onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

async function renderHistory(id = "") {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
            <input type="text" id="h-input" class="form-control" placeholder="พิมพ์รหัสครุภัณฑ์..." value="${id}">
            <button class="btn btn-primary px-4" onclick="window.loadPage('history', document.getElementById('h-input').value)">สืบค้น</button>
            <button class="btn btn-secondary px-3" onclick="window.loadPage('list')">ย้อนกลับ</button>
        </div></div><div id="h-result"></div>`;
    if(!id) return;
    const resDiv = document.getElementById("h-result");
    const json = await fetchJSON(`https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`);
    const logs = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : "")).filter(r => String(r[0]) === String(id));
    if(logs.length === 0) { resDiv.innerHTML = `<div class="alert alert-warning text-center">ไม่พบประวัติรหัส: ${id}</div>`; return; }
    resDiv.innerHTML = `<div class="p-3 bg-light rounded border mb-3 small text-navy">📦 <b>รหัส:</b> ${id} | <b>ชื่อ:</b> ${logs[0][1]}</div>
        <div class="table-responsive shadow-sm border"><table class="table table-bordered bg-white mb-0">
        <thead class="table-dark"><tr><th>วันที่</th><th>เวลา</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${logs.map(r => `<tr><td>${formatDateCell(r[5])}</td><td>${formatTimeCell(r[6])}</td><td>${r[2]}</td><td><span class="badge ${r[3].includes('ใช้งานได้')?'bg-success':'bg-danger'}">${r[3]}</span></td><td>${r[4]}</td></tr>`).join("")}</tbody></table></div>`;
}

async function renderReport() {
    const data = await fetchJSON(URLS.SHOW);
    const rows = data.map(r => `<tr><td>${r["รหัสครุภัณฑ์"]||""}</td><td>${r["ชื่อครุภัณฑ์"]||""}</td><td>${r["ที่เก็บ"]||""}</td><td>${r["สถานะ"]||""}</td></tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 text-end"><button class="btn btn-success" onclick="genReport('pdf')">📕 PDF</button> <button class="btn btn-primary" onclick="genReport('doc')">📑 Word</button></div>
        <div class="table-responsive shadow-sm border rounded"><table class="table table-bordered bg-white mb-0"><thead class="table-success"><tr><th>รหัส</th><th>ชื่อ</th><th>ที่เก็บ</th><th>สภาพ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderManual() {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm p-4"><h5 class="fw-bold mb-4" style="color:${THEME_COLOR}"><i class="bi bi-book me-2"></i> คู่มือการใช้งาน</h5>
            <div class="row g-3">
                <div class="col-md-6"><div class="p-3 border rounded bg-light"><h6>1. การตรวจสอบ (WAIT)</h6><p class="small text-muted">เลือกที่อยู่และสถานะ แล้วกดยืนยัน (✔) เพื่อบันทึกลงประวัติ</p></div></div>
                <div class="col-md-6"><div class="p-3 border rounded bg-light"><h6>2. การจัดการ (LIST)</h6><p class="small text-muted">เพิ่มรายการแบบต่อเนื่อง ระบบจะสร้าง Barcode/QRCode ให้อัตโนมัติ</p></div></div>
            </div>
        </div>`;
}

// ============================================================
// 5. ACTIONS
// ============================================================

window.openDynamicAddForm = async function() {
    let rowCount = 1;
    const getRowHTML = (i) => `<div class="item-row border-bottom py-2 mb-2" id="row-${i}"><div class="fw-bold text-primary small mb-1 text-start">รายการที่ ${i}</div><div class="row g-2"><div class="col-5"><input class="form-control form-control-sm sw-code" placeholder="รหัส"></div><div class="col-7"><input class="form-control form-control-sm sw-name" placeholder="ชื่อครุภัณฑ์"></div></div></div>`;

    const { value: formValues } = await Swal.fire({
        title: 'เพิ่มรายการครุภัณฑ์',
        html: `<div id="dynamic-container" style="max-height: 400px; overflow-y: auto; padding:10px;">${getRowHTML(1)}</div>`,
        showCancelButton: true, confirmButtonText: 'บันทึกทั้งหมด', confirmButtonColor: THEME_COLOR,
        didOpen: () => {
            const container = document.getElementById('dynamic-container');
            container.addEventListener('input', (e) => {
                if (e.target.classList.contains('sw-name')) {
                    const allRows = container.querySelectorAll('.item-row');
                    const lastRow = allRows[allRows.length - 1];
                    if (lastRow.querySelector('.sw-code').value && lastRow.querySelector('.sw-name').value) {
                        rowCount++;
                        const div = document.createElement('div');
                        div.innerHTML = getRowHTML(rowCount);
                        container.appendChild(div.firstElementChild);
                        container.scrollTop = container.scrollHeight;
                    }
                }
            });
        },
        preConfirm: () => {
            let data = [];
            document.querySelectorAll('.item-row').forEach(r => {
                const c = r.querySelector('.sw-code').value.trim();
                const n = r.querySelector('.sw-name').value.trim();
                if(c && n) data.push({ code: c, name: n });
            });
            if(data.length === 0) return Swal.showValidationMessage('กรุณากรอกข้อมูล');
            return data;
        }
    });

    if (formValues) {
        showLoading(`กำลังบันทึก ${formValues.length} รายการ...`);
        for (const item of formValues) await postAction("DATA", "add", item);
        Swal.fire("สำเร็จ", "บันทึกเรียบร้อย", "success");
        window.loadPage('list');
    }
};

window.confirmWait = async (btn) => {
    const tr = btn.closest("tr");
    const conf = await Swal.fire({ title: 'ยืนยันส่งข้อมูล?', icon: 'question', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading();
        await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, "หมายเหตุ": tr.querySelector(".wait-note").value });
        await postAction("WAIT", "delete", { row: tr.dataset.row });
        window.loadPage('wait');
    }
};

window.bulkConfirmWait = async () => {
    const sel = getSelectedRows();
    if(sel.length === 0) return;
    const conf = await Swal.fire({ title: `ส่ง ${sel.length} รายการ?`, showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading();
        sel.sort((a,b) => b.dataset.row - a.dataset.row);
        for (let tr of sel) {
            await postAction("LOG", "addLog", { "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, "หมายเหตุ": tr.querySelector(".wait-note").value });
            await postAction("WAIT", "delete", { row: tr.dataset.row });
        }
        window.loadPage('wait');
    }
};

window.deleteRow = async (sheet, btn) => {
    const conf = await Swal.fire({ title: 'ยืนยันลบ?', icon: 'warning', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading();
        await postAction(sheet, "delete", { row: btn.closest("tr").dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : (sheet === 'WAIT' ? 'wait' : 'user'));
    }
};

window.bulkDelete = async (sheet) => {
    const sel = getSelectedRows();
    if(sel.length === 0) return;
    const conf = await Swal.fire({ title: `ลบ ${sel.length} รายการ?`, icon: 'error', showCancelButton: true });
    if(conf.isConfirmed) {
        showLoading();
        sel.sort((a,b) => b.dataset.row - a.dataset.row);
        for (let tr of sel) await postAction(sheet, "delete", { row: tr.dataset.row });
        window.loadPage(sheet === 'DATA' ? 'list' : (sheet === 'WAIT' ? 'wait' : 'user'));
    }
};

window.editList = async (btn) => {
    const tr = btn.closest("tr");
    const { value: f } = await Swal.fire({ title: 'แก้ไขครุภัณฑ์', html: `<input id="sw-c" class="form-control mb-2" value="${tr.cells[1].innerText}"><input id="sw-n" class="form-control" value="${tr.cells[2].innerText}">`, preConfirm: () => ({ code: document.getElementById('sw-c').value, name: document.getElementById('sw-n').value })});
    if (f) { await postAction("DATA", "update", { row: tr.dataset.row, code: f.code, name: f.name }); window.loadPage('list'); }
};

window.editUser = async (btn) => {
    const tr = btn.closest("tr");
    const { value: f } = await Swal.fire({ title: 'แก้ไขสมาชิก', html: `<input id="u-n" class="form-control mb-2" value="${tr.cells[2].innerText}"><select id="u-s" class="form-select"><option value="employee">Employee</option><option value="admin">Admin</option></select>`, preConfirm: () => ({ name: document.getElementById('u-n').value, status: document.getElementById('u-s').value })});
    if (f) { await postAction("LOGIN", "update", { row: tr.dataset.row, name: f.name, status: f.status }); window.loadPage('user'); }
};

window.addUser = async () => {
    const { value: f } = await Swal.fire({ title: 'เพิ่มสมาชิกใหม่', html: `<input id="u-i" class="form-control mb-2" placeholder="ID"><input id="u-p" class="form-control mb-2" placeholder="Password"><input id="u-n" class="form-control mb-2" placeholder="ชื่อ"><select id="u-s" class="form-select"><option value="employee">Employee</option><option value="admin">Admin</option></select>`, preConfirm: () => ({ id: document.getElementById('u-i').value, pass: document.getElementById('u-p').value, name: document.getElementById('u-n').value, status: document.getElementById('u-s').value })});
    if (f && f.id) { await postAction("LOGIN", "addUser", f); window.loadPage('user'); }
};

window.genReport = async (fmt) => {
    showLoading("กำลังสร้างรายงาน...");
    const res = await postAction("SHOW", "generateReport", { format: fmt });
    if (res.fileData) { downloadFile(res.fileData, res.fileName); Swal.fire("สำเร็จ", "ดาวน์โหลดแล้ว", "success"); window.loadPage('report'); }
};

document.addEventListener("DOMContentLoaded", () => window.loadPage("dash"));
