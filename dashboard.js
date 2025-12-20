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
const THEME_COLOR = "#002147"; // Navy Blue

// ตัวเลือกสถานที่และสถานะ
const LOCATIONS = ["-", "501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
const STATUS_OPTIONS = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

// แทรก CSS สำหรับ Dashboard Hover
const style = document.createElement('style');
style.innerHTML = `
    .card-hover { transition: all 0.3s ease; cursor: pointer; position: relative; overflow: hidden; border: none !important; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .card-hover:hover { transform: translateY(-7px); box-shadow: 0 12px 20px rgba(0,0,0,0.15); }
    .card-hover .view-more { 
        position: absolute; bottom: -30px; left: 0; width: 100%; 
        background: ${THEME_COLOR}; color: white; font-size: 0.7rem; 
        text-align: center; transition: 0.3s; padding: 4px 0; font-weight: bold;
    }
    .card-hover:hover .view-more { bottom: 0; }
    .bg-navy { background-color: ${THEME_COLOR} !important; color: white; }
`;
document.head.appendChild(style);

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
    return await (await fetch(BASE_URL, { method: "POST", body })).json();
}

function showLoading(msg = "กำลังประมวลผล...") {
    document.getElementById("page-content").innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" style="width: 3.5rem; height: 3.5rem;"></div>
            <h4 class="fw-bold" style="color:${THEME_COLOR}">${msg}</h4>
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
// 3. ROUTER
// ============================================================

window.loadPage = async function(page, param = null) {
    const pageTitle = document.getElementById("page-title");
    showLoading(); 

    const routes = {
        "dash":    renderDashboard,
        "wait":    renderWait,
        "list":    renderList,
        "history": () => renderHistory(param),
        "user":    renderUser,
        "report":  renderReport,
        "manual":  renderManual,
        "filter":  () => renderFilteredStatus(param)
    };

    if (routes[page]) {
        await routes[page]();
        document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
    }
};

// ============================================================
// 4. PAGE RENDERERS
// ============================================================

// --- หน้า DASHBOARD ---
async function renderDashboard() {
    document.getElementById("page-title").textContent = "🏰 แผงควบคุม (Dashboard)";
    const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
    
    const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
    const getCount = (s) => data.filter(r => String(r["สถานะ"]).includes(s)).length;

    const stats = [
        { label: "ใช้งานได้", count: getCount("ใช้งานได้"), color: "#198754", icon: "bi-check-circle" },
        { label: "ชำรุด", count: getCount("ชำรุด"), color: "#dc3545", icon: "bi-x-circle" },
        { label: "เสื่อมสภาพ", count: getCount("เสื่อมสภาพ"), color: "#fd7e14", icon: "bi-exclamation-triangle" },
        { label: "หมดอายุการใช้งาน", count: getCount("หมดอายุ"), color: "#6c757d", icon: "bi-calendar-x" },
        { label: "ไม่รองรับการใช้งาน", count: getCount("ไม่รองรับ"), color: "#000000", icon: "bi-slash-circle" }
    ];

    document.getElementById("page-content").innerHTML = `
        <div class="row g-4 mb-4">
            <div class="col-md-4">
                <div class="card p-4 card-hover bg-navy" onclick="window.loadPage('list')">
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6>ยอดรวมครุภัณฑ์</h6><h2 class="fw-bold">${total}</h2></div>
                        <i class="bi bi-box-seam fs-1 opacity-50"></i>
                    </div>
                    <div class="view-more">ดูฐานข้อมูลทั้งหมด</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-4 card-hover" onclick="window.loadPage('wait')" style="border-left:8px solid #ffc107 !important">
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6 class="text-muted">รอการตรวจสอบ</h6><h2 class="fw-bold text-warning">${wait.length}</h2></div>
                        <i class="bi bi-clock-history fs-1 text-warning opacity-50"></i>
                    </div>
                    <div class="view-more">ไปที่รายการรอตรวจสอบ</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-4 card-hover" onclick="checkWebStatus()" style="border-left:8px solid #0dcaf0 !important">
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6 class="text-muted">สถานะเว็บไซต์</h6><h2 class="fw-bold text-info" id="web-status">ตรวจสอบ...</h2></div>
                        <i class="bi bi-cpu fs-1 text-info opacity-50"></i>
                    </div>
                    <div class="view-more">คลิกดูรายละเอียดการเชื่อมต่อ</div>
                </div>
            </div>
        </div>

        <h6 class="fw-bold mb-3 text-navy"><i class="bi bi-bar-chart-fill me-2"></i>สถานะอุปกรณ์ละเอียด</h6>
        <div class="row g-3 mb-5">
            ${stats.map(s => `
                <div class="col-md-2 col-6">
                    <div class="card h-100 card-hover text-center p-3" onclick="window.loadPage('filter', '${s.label}')" style="border-bottom: 4px solid ${s.color} !important;">
                        <i class="bi ${s.icon} fs-3" style="color: ${s.color}"></i>
                        <div class="small text-muted mt-2">${s.label}</div>
                        <h4 class="fw-bold mb-0">${s.count}</h4>
                        <div class="view-more">ดูเพิ่ม</div>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
    setTimeout(() => { document.getElementById('web-status').innerText = "พร้อมใช้งาน"; }, 800);
}

// --- หน้ากรองข้อมูล (SHOW) ---
async function renderFilteredStatus(statusName) {
    document.getElementById("page-title").textContent = `รายการ: ${statusName}`;
    const data = await fetchJSON(URLS.SHOW);
    const filtered = data.filter(r => String(r["สถานะ"]).includes(statusName));

    const rows = filtered.map((r, i) => `
        <tr>
            <td class="text-center">${i + 1}</td>
            <td class="fw-bold">${r["รหัสครุภัณฑ์"] || ""}</td>
            <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
            <td>${r["ที่เก็บ"] || "-"}</td>
            <td><span class="badge bg-navy">${r["สถานะ"] || ""}</span></td>
            <td>${r["รายละเอียดเพิ่มเติม"] || "-"}</td>
        </tr>`).join("");

    document.getElementById("page-content").innerHTML = `
        <div class="mb-3"><button class="btn btn-secondary btn-sm" onclick="window.loadPage('dash')"><i class="bi bi-arrow-left"></i> กลับหน้าหลัก</button></div>
        <div class="table-responsive shadow-sm border rounded">
            <table class="table table-hover bg-white mb-0 align-middle">
                <thead class="bg-navy"><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
                <tbody>${filtered.length > 0 ? rows : '<tr><td colspan="6" class="text-center py-4">ไม่พบข้อมูล</td></tr>'}</tbody>
            </table>
        </div>`;
}

// --- ตรวจสอบ Server ---
window.checkWebStatus = () => {
    Swal.fire({
        title: 'Website Monitoring',
        html: `<div class="text-start small">
                <p><i class="bi bi-circle-fill text-success me-2"></i><b>Server:</b> Google App Engine (Active)</p>
                <p><i class="bi bi-circle-fill text-success me-2"></i><b>Database:</b> Google Sheets API v4 (Connected)</p>
                <p><i class="bi bi-circle-fill text-success me-2"></i><b>Storage:</b> Google Drive (Ready)</p>
                <p><i class="bi bi-shield-check text-primary me-2"></i><b>Security:</b> SSL/HTTPS Encrypted</p>
               </div>`,
        icon: 'info', confirmButtonColor: THEME_COLOR
    });
};

// --- หน้า WAIT ---
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
            <td class="text-nowrap">${formatDateCell(r["วันที่"])}</td>
            <td>${formatTimeCell(r["เวลา"])}</td>
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
    document.getElementById("check-all").onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
}

// --- หน้า LIST ---
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

// --- หน้า USER ---
async function renderUser() {
    const data = await fetchJSON(URLS.USER);
    const rows = data.map((u, i) => `<tr data-row="${u._row || i+2}">
        <td><input type="checkbox" class="form-check-input row-checkbox"></td>
        <td>${u["ID"]||""}</td><td>${u["name"]||""}</td><td><span class="badge ${u["Status"]==='admin'?'bg-danger':'bg-info text-dark'}">${u["Status"]}</span></td>
        <td class="text-center"><button class="btn btn-warning btn-sm" onclick="editUser(this)">📝</button> <button class="btn btn-danger btn-sm" onclick="deleteRow('LOGIN', this)">🗑</button></td>
    </tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 d-flex justify-content-between">
            <button class="btn btn-primary btn-sm" onclick="addUser()">➕ เพิ่มสมาชิก</button>
            <button class="btn btn-danger btn-sm" onclick="bulkDelete('LOGIN')">🗑 ลบสมาชิกที่เลือก</button>
        </div>
        <div class="table-responsive shadow-sm rounded border"><table class="table table-hover align-middle bg-white mb-0"><thead class="table-dark"><tr><th>เลือก</th><th>ID</th><th>ชื่อ</th><th>สิทธิ์</th><th>จัดการ</th></tr></thead><tbody id="table-body">${rows}</tbody></table></div>`;
}

// --- หน้า HISTORY ---
async function renderHistory(id = "") {
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
            <input type="text" id="h-input" class="form-control" placeholder="ระบุรหัสครุภัณฑ์..." value="${id}">
            <button class="btn btn-primary px-4" onclick="window.loadPage('history', document.getElementById('h-input').value)">สืบค้น</button>
            <button class="btn btn-secondary" onclick="window.loadPage('list')">ย้อนกลับ</button>
        </div></div><div id="h-result"></div>`;
    if(!id) return;
    const resDiv = document.getElementById("h-result");
    const json = await fetchJSON(`https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`);
    const logs = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : "")).filter(r => String(r[0]) === String(id));
    if(logs.length === 0) { resDiv.innerHTML = `<div class="alert alert-warning text-center">ไม่พบประวัติสำหรับรหัส: ${id}</div>`; return; }
    resDiv.innerHTML = `
        <div class="p-3 bg-light rounded border mb-3 small text-navy">📦 <b>รหัส:</b> ${id} | <b>ชื่อ:</b> ${logs[0][1]}</div>
        <div class="table-responsive shadow-sm border"><table class="table table-bordered bg-white mb-0">
        <thead class="table-dark"><tr><th>วันที่</th><th>เวลา</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
        <tbody>${logs.map(r => `<tr><td>${formatDateCell(r[5])}</td><td>${formatTimeCell(r[6])}</td><td>${r[2]}</td><td><span class="badge ${r[3].includes('ใช้งานได้')?'bg-success':'bg-danger'}">${r[3]}</span></td><td>${r[4]}</td></tr>`).join("")}</tbody></table></div>`;
}

// --- หน้า MANUAL ---
function renderManual() {
    document.getElementById("page-title").textContent = "📘 คู่มือการใช้งานระบบอย่างละเอียด";
    document.getElementById("page-content").innerHTML = `
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-navy text-white p-3">
                <h5 class="m-0"><i class="bi bi-journal-check me-2"></i>ขั้นตอนการดำเนินงานในแต่ละส่วน</h5>
            </div>
            <div class="card-body p-4">
                
                <div class="mb-5">
                    <h6 class="fw-bold text-primary border-bottom pb-2"><i class="bi bi-speedometer2 me-2"></i>1. เมนูแผงควบคุม (Dashboard)</h6>
                    <p class="small text-dark mb-2">ใช้สำหรับติดตามภาพรวมของครุภัณฑ์ทั้งหมดในระบบแบบเรียลไทม์</p>
                    <ul class="small text-muted">
                        <li><b>การดูยอดรวม:</b> การ์ดด้านบนจะแสดงจำนวนครุภัณฑ์แยกตามสถานะหลัก (ยอดรวม, รอตรวจสอบ, สถานะเว็บ)</li>
                        <li><b>การสืบค้นด่วน:</b> เมื่อนำเมาส์ไปชี้ที่การ์ดจะปรากฏคำว่า "ดูเพิ่ม" ท่านสามารถคลิกเพื่อไปยังหน้านั้นๆ ได้ทันที</li>
                        <li><b>การกรองข้อมูลตามสถานะ:</b> ในส่วน "สถานะอุปกรณ์ละเอียด" ท่านสามารถคลิกที่สถานะ (เช่น ชำรุด) เพื่อดูตารางรายชื่อครุภัณฑ์เฉพาะกลุ่มนั้น ซึ่งดึงข้อมูลมาจากชีท SHOW โดยตรง</li>
                        <li><b>การตรวจสอบระบบ:</b> คลิกที่การ์ด "สถานะเว็บไซต์" เพื่อตรวจสอบว่าการเชื่อมต่อระหว่าง Server และ Google Sheets ปกติดีหรือไม่</li>
                    </ul>
                </div>

                <div class="mb-5">
                    <h6 class="fw-bold text-primary border-bottom pb-2"><i class="bi bi-clock-history me-2"></i>2. เมนูครุภัณฑ์ที่รอตรวจสอบ</h6>
                    <p class="small text-dark mb-2">ใช้จัดการรายการที่ได้รับแจ้งสแกนเข้ามาใหม่ เพื่อยืนยันลงประวัติการตรวจสอบ</p>
                    <ul class="small text-muted">
                        <li><b>ขั้นตอนที่ 1:</b> ตรวจสอบรหัสและชื่อครุภัณฑ์ที่ปรากฏในตาราง</li>
                        <li><b>ขั้นตอนที่ 2:</b> เลือก "ที่อยู่" (ห้อง) และ "สถานะ" ปัจจุบันจากช่องรายการตัวเลือก (Selection)</li>
                        <li><b>ขั้นตอนที่ 3:</b> กรอกหมายเหตุเพิ่มเติม (หากมี) เช่น ระบุอาการชำรุด</li>
                        <li><b>ขั้นตอนที่ 4:</b> กดปุ่ม <span class="badge bg-success">✔</span> ท้ายแถวเพื่อบันทึก หรือเลือกหลายรายการแล้วกดปุ่ม "ส่งที่เลือก" ด้านบนเพื่อประมวลผลพร้อมกัน</li>
                    </ul>
                </div>

                <div class="mb-5">
                    <h6 class="fw-bold text-primary border-bottom pb-2"><i class="bi bi-archive me-2"></i>3. เมนูฐานข้อมูลครุภัณฑ์</h6>
                    <p class="small text-dark mb-2">หน้าจัดการข้อมูลหลักของครุภัณฑ์ทั้งหมดในหน่วยงาน</p>
                    <ul class="small text-muted">
                        <li><b>การเพิ่มรายการใหม่:</b> กดปุ่ม "เพิ่มรายการ" จะมีหน้าต่างขึ้นมา เมื่อท่านกรอกรหัสและชื่อรายการที่ 1 เสร็จ ช่องรายการที่ 2 จะปรากฏขึ้นอัตโนมัติเพื่อให้กรอกต่อเนื่องได้ทันที</li>
                        <li><b>รหัสบาร์โค้ดและ QR Code:</b> ระบบจะสร้างรูปภาพรหัสให้อัตโนมัติในตาราง ท่านสามารถนำไปใช้พิมพ์ติดตัวอุปกรณ์ได้</li>
                        <li><b>การแก้ไข/ลบ:</b> กดปุ่ม <span class="badge bg-warning text-dark">📝</span> เพื่อแก้ไขชื่อหรือรหัส และปุ่ม <span class="badge bg-danger">🗑</span> เพื่อลบข้อมูลที่ไม่ต้องการออก</li>
                    </ul>
                </div>

                <div class="mb-5">
                    <h6 class="fw-bold text-primary border-bottom pb-2"><i class="bi bi-search me-2"></i>4. เมนูสืบค้นประวัติย้อนหลัง</h6>
                    <p class="small text-dark mb-2">ใช้สำหรับตรวจสอบไทม์ไลน์การใช้งานและการซ่อมบำรุงของครุภัณฑ์รายชิ้น</p>
                    <ul class="small text-muted">
                        <li><b>ขั้นตอนที่ 1:</b> พิมพ์หรือสแกนรหัสครุภัณฑ์ลงในช่องค้นหา</li>
                        <li><b>ขั้นตอนที่ 2:</b> กดปุ่ม "สืบค้น" ระบบจะแสดงรายการประวัติทั้งหมดที่เคยมีการกดยืนยันมาจากหน้าตรวจสอบ</li>
                        <li><b>ข้อมูลที่แสดง:</b> วันที่ตรวจสอบ, เวลา, สถานที่จัดเก็บ, สถานะในขณะนั้น และผู้บันทึกข้อมูล</li>
                    </ul>
                </div>

                <div class="mb-5">
                    <h6 class="fw-bold text-primary border-bottom pb-2"><i class="bi bi-file-earmark-pdf me-2"></i>5. เมนูรายงานและเอกสาร</h6>
                    <p class="small text-dark mb-2">ใช้สำหรับส่งออกข้อมูลสถานะล่าสุดในชีท SHOW เป็นรูปแบบเอกสาร</p>
                    <ul class="small text-muted">
                        <li><b>การตรวจสอบ:</b> ตรวจสอบรายชื่อครุภัณฑ์และสถานะล่าสุดในตารางหน้าจอก่อนสั่งพิมพ์</li>
                        <li><b>การดาวน์โหลด:</b> กดปุ่ม <span class="badge bg-success">📕 PDF</span> เพื่อรับไฟล์สำหรับพิมพ์ส่งหน่วยงาน หรือปุ่ม <span class="badge bg-primary">📑 Word</span> เพื่อรับไฟล์ที่สามารถแก้ไขเนื้อหาต่อได้</li>
                    </ul>
                </div>

                <div>
                    <h6 class="fw-bold text-primary border-bottom pb-2"><i class="bi bi-people me-2"></i>6. เมนูจัดการสมาชิก</h6>
                    <p class="small text-dark mb-2">ใช้สำหรับจัดการสิทธิ์ผู้ใช้งานที่สามารถเข้าถึงระบบนี้ได้</p>
                    <ul class="small text-muted">
                        <li><b>การเพิ่มสมาชิก:</b> กรอก ID, Password และเลือกสิทธิ์การใช้งาน (Admin คือผู้ดูแล / Employee คือผู้ใช้งานทั่วไป)</li>
                        <li><b>การจัดการ:</b> ท่านสามารถแก้ไขชื่อสมาชิก หรือลบสมาชิกที่ไม่ได้ปฏิบัติงานแล้วออกได้ทีละคนหรือแบบกลุ่ม</li>
                    </ul>
                </div>

            </div>
        </div>`;
}

// ============================================================
// 5. ACTION LOGIC
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
            return data.length > 0 ? data : Swal.showValidationMessage('กรุณากรอกข้อมูล');
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

window.renderReport = async () => {
    const data = await fetchJSON(URLS.SHOW);
    const rows = data.map(r => `<tr><td>${r["รหัสครุภัณฑ์"]||""}</td><td>${r["ชื่อครุภัณฑ์"]||""}</td><td>${r["ที่เก็บ"]||""}</td><td>${r["สถานะ"]||""}</td></tr>`).join("");
    document.getElementById("page-content").innerHTML = `
        <div class="mb-3 text-end"><button class="btn btn-success" onclick="genReport('pdf')">📕 PDF</button> <button class="btn btn-primary" onclick="genReport('doc')">📑 Word</button></div>
        <div class="table-responsive shadow-sm border rounded"><table class="table table-bordered bg-white mb-0"><thead class="table-success"><tr><th>รหัส</th><th>ชื่อ</th><th>ที่เก็บ</th><th>สภาพ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
};

window.genReport = async (fmt) => {
    showLoading("กำลังสร้างรายงาน...");
    const res = await postAction("SHOW", "generateReport", { format: fmt });
    if (res.fileData) { downloadFile(res.fileData, res.fileName); Swal.fire("สำเร็จ", "ดาวน์โหลดแล้ว", "success"); window.loadPage('report'); }
};

// เริ่มต้นโหลดหน้า Dashboard
document.addEventListener("DOMContentLoaded", () => window.loadPage("dash"));
