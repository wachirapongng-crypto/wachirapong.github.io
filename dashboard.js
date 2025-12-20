// ประกาศ loadPage เป็น Global
let loadPage;

document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // 1. CONFIG & CONSTANTS
    // ============================================================
    const BASE_URL = "https://script.google.com/macros/s/AKfycbytUjsxc0zhTeD1qkb8DQOl7o7YzthDfSwAWXfroHqycY7IwZsEetpEoHKL_AC7R7HNVw/exec";
    const URLS = Object.freeze({
        DATA: BASE_URL + "?sheet=DATA",
        WAIT: BASE_URL + "?sheet=WAIT",
        USER: BASE_URL + "?sheet=LOGIN",
        SHOW: BASE_URL + "?sheet=SHOW",
        LOG:  BASE_URL + "?sheet=LOG"
    });
    const THEME_COLOR = "#002147";

    // ============================================================
    // 2. UTILITY FUNCTIONS (ดัดแปลงจาก LOG.js)
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
        if (m) {
            const parts = m[1].split(',').map(Number);
            if (parts.length >= 6) return `${pad(parts[3])}:${pad(parts[4])} น.`;
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
        return await fetchJSON(BASE_URL, "POST", body);
    }

    function showLoading(msg = "กำลังโหลด...") {
        document.getElementById("page-content").innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                <h3 class="fw-bold">${msg}</h3>
            </div>`;
    }

    const getSelectedRows = () => Array.from(document.querySelectorAll(".row-checkbox:checked")).map(cb => cb.closest("tr"));

    // ============================================================
    // 3. RENDER TEMPLATE (ตารางมาตรฐาน)
    // ============================================================
    function renderTable(headers, rows, bulkActions = "", toolActions = "") {
        document.getElementById("page-content").innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div class="bulk-btns d-flex gap-2">${bulkActions}</div>
                <div class="tool-btns d-flex gap-2">
                    ${toolActions}
                    <input type="text" id="t-search" class="form-control form-control-sm shadow-sm" placeholder="🔍 ค้นหา..." style="width:180px;">
                </div>
            </div>
            <div class="table-responsive shadow-sm rounded border">
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
            document.querySelectorAll("#table-body tr").forEach(tr => tr.style.display = tr.innerText.toLowerCase().includes(val) ? "" : "none");
        };
        document.getElementById("check-all").onclick = (e) => document.querySelectorAll(".row-checkbox").forEach(cb => cb.checked = e.target.checked);
    }

    // ============================================================
    // 4. PAGE RENDERERS
    // ============================================================

    // --- DASHBOARD ---
    async function renderDashboard() {
        const [data, wait] = await Promise.all([fetchJSON(URLS.DATA), fetchJSON(URLS.WAIT)]);
        const total = data.filter(r => r["รหัสครุภัณฑ์"]).length;
        document.getElementById("page-content").innerHTML = `
            <div class="row g-4 text-center">
                <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid ${THEME_COLOR}"><h6>ครุภัณฑ์ทั้งหมด</h6><h2 class="fw-bold">${total}</h2></div></div>
                <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #ffc107"><h6>รอตรวจสอบ</h6><h2 class="fw-bold text-warning">${wait.length}</h2></div></div>
                <div class="col-md-4"><div class="card p-4 border-0 shadow-sm" style="border-left:5px solid #0dcaf0"><h6>สมาชิกในระบบ</h6><h2 class="fw-bold text-info">จัดการได้</h2></div></div>
            </div>`;
    }

    // --- WAIT (เพิ่มคอลัมน์เวลา) ---
    async function renderWait() {
        const data = await fetchJSON(URLS.WAIT);
        const rows = data.map((r, i) => `
            <tr data-row="${r._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td class="fw-bold">${r["รหัส"]||""}</td><td>${r["ชื่อ"]||""}</td>
                <td>${r["ที่อยู่"]||"-"}</td><td><span class="badge ${getStatusBadgeClass(r["สถานะ"])}">${r["สถานะ"]}</span></td>
                <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"]||""}"></td>
                <td>${formatDateCell(r["วันที่"])}</td><td>${formatTimeCell(r["เวลา"])}</td>
                <td class="text-center"><button class="btn btn-success btn-sm" onclick="confirmWait(this)">✔</button></td>
                <td class="text-center"><button class="btn btn-danger btn-sm" onclick="deleteRow('WAIT', this)">🗑</button></td>
            </tr>`).join("");
        
        renderTable(["รหัส", "ชื่อ", "ที่อยู่", "สถานะ", "หมายเหตุ", "วันที่", "เวลา", "ส่ง", "ลบ"], rows, 
            `<button class="btn btn-success btn-sm" onclick="bulkConfirmWait()">✔ ยืนยันที่เลือก</button>
             <button class="btn btn-danger btn-sm" onclick="bulkDelete('WAIT')">🗑 ลบที่เลือก</button>`
        );
    }

    // --- LIST (QR Code + Sequential Add) ---
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
                <td class="text-center"><button class="btn btn-info btn-sm text-white" onclick="window.loadPage('history', '${r['รหัสครุภัณฑ์']}')">📜 ประวัติ</button></td>
            </tr>`}).join("");

        renderTable(["รหัส", "ชื่อ", "Barcode", "QR Code", "แก้", "ลบ", "สืบค้น"], rows,
            `<button class="btn btn-danger btn-sm" onclick="bulkDelete('DATA')">🗑 ลบที่เลือก</button>`,
            `<button class="btn btn-primary btn-sm" onclick="addListSequential()">➕ เพิ่มรายการ</button>`
        );
    }

    // --- USER (เพิ่ม Edit/Bulk Delete) ---
    async function renderUser() {
        const data = await fetchJSON(URLS.USER);
        const rows = data.map((u, i) => `
            <tr data-row="${u._row || i+2}">
                <td><input type="checkbox" class="form-check-input row-checkbox"></td>
                <td>${u["ID"]||""}</td><td>${u["name"]||""}</td><td><span class="badge bg-info text-dark">${u["Status"]}</span></td>
                <td class="text-center">
                    <button class="btn btn-warning btn-sm" onclick="editUser(this)">📝</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRow('LOGIN', this)">🗑</button>
                </td>
            </tr>`).join("");
        
        renderTable(["ID", "ชื่อ-นามสกุล", "สิทธิ์", "จัดการ"], rows, 
            `<button class="btn btn-danger btn-sm" onclick="bulkDelete('LOGIN')">🗑 ลบสมาชิกที่เลือก</button>`,
            `<button class="btn btn-primary btn-sm" onclick="addUser()">➕ เพิ่มสมาชิก</button>`
        );
    }

    // --- HISTORY (นำ LOG.js มาปรับปรุง) ---
    async function renderHistory(id = "") {
        document.getElementById("page-content").innerHTML = `
            <div class="card border-0 shadow-sm mb-4"><div class="card-body d-flex gap-2">
                <input type="text" id="h-input" class="form-control" placeholder="รหัสครุภัณฑ์..." value="${id}">
                <button class="btn btn-primary px-4" onclick="window.loadPage('history', document.getElementById('h-input').value)">สืบค้น</button>
                <button class="btn btn-secondary px-3" onclick="window.loadPage('list')">ย้อนกลับ</button>
            </div></div><div id="h-result"></div>`;
        
        if(!id) return;
        const resDiv = document.getElementById("h-result");
        resDiv.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-secondary"></div></div>`;
        
        const gvizURL = `https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/gviz/tq?tqx=out:json&sheet=LOG`;
        const res = await fetch(gvizURL);
        const text = await res.text();
        const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/)[1]);
        const rows = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : ""));
        const filtered = rows.filter(r => String(r[0]) === String(id));

        if(filtered.length === 0) { resDiv.innerHTML = `<div class="alert alert-warning">ไม่พบประวัติรหัส: ${id}</div>`; return; }

        resDiv.innerHTML = `
            <div class="p-3 bg-light rounded border mb-3">📦 <b>ครุภัณฑ์:</b> ${filtered[0][1]}</div>
            <div class="table-responsive"><table class="table table-bordered bg-white shadow-sm">
                <thead class="table-dark"><tr><th>วันที่</th><th>เวลา</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
                <tbody>${filtered.map(r => `<tr><td>${formatDateCell(r[5])}</td><td>${formatTimeCell(r[6])}</td><td>${r[2]}</td><td><span class="badge ${getStatusBadgeClass(r[3])}">${r[3]}</span></td><td>${r[4]}</td></tr>`).join("")}</tbody>
            </table></div>`;
    }

    // --- MANUAL (หน้าคู่มือแบบสมบูรณ์) ---
    function renderManual() {
        document.getElementById("page-content").innerHTML = `
            <div class="card border-0 shadow-sm p-4">
                <h4 class="fw-bold mb-4" style="color:${THEME_COLOR}"><i class="bi bi-journal-text me-2"></i> คู่มือการใช้งานระบบสำหรับอาจารย์</h4>
                <div class="row g-4">
                    <div class="col-md-6">
                        <h6 class="fw-bold text-primary">1. การตรวจสอบครุภัณฑ์ (หน้า WAIT)</h6>
                        <p class="small text-muted">เมื่อได้รับแจ้งข้อมูล อาจารย์สามารถเลือก 'ที่อยู่' และ 'สถานะ' ใหม่ได้ทันที หากข้อมูลถูกต้องให้กดปุ่ม <span class="badge bg-success">✔</span> เพื่อบันทึกเข้าประวัติ หรือเลือกหลายรายการแล้วกด "ยืนยันที่เลือก"</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold text-primary">2. การจัดการฐานข้อมูล (หน้า LIST)</h6>
                        <p class="small text-muted">ใช้สำหรับเพิ่มรหัสและชื่อครุภัณฑ์เข้าสู่ระบบ ระบบจะสร้าง Barcode และ QR Code ให้อัตโนมัติ สามารถกดปุ่ม <span class="badge bg-info">📜 ประวัติ</span> เพื่อดูประวัติการซ่อม/ย้ายของชิ้นนั้นๆ</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold text-primary">3. การออกรายงาน (หน้า REPORT)</h6>
                        <p class="small text-muted">ระบบจะดึงข้อมูลสถานะล่าสุดมาแสดง อาจารย์สามารถเลือกดาวน์โหลดเป็นไฟล์ <b>PDF</b> (สำหรับพิมพ์) หรือ <b>Word</b> (สำหรับแก้ไขต่อ) ได้โดยตรง</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold text-primary">4. การจัดการสมาชิก (หน้า USER)</h6>
                        <p class="small text-muted">เฉพาะผู้ดูแลระบบ สามารถเพิ่มสิทธิ์ <b>Admin</b> (จัดการได้ทุกอย่าง) หรือ <b>Employee</b> (ดูและตรวจสอบได้อย่างเดียว) ได้ที่หน้านี้</p>
                    </div>
                </div>
                <div class="alert alert-warning mt-4 small"><i class="bi bi-exclamation-triangle me-2"></i> <b>ข้อควรระวัง:</b> การลบข้อมูลในหน้า LIST จะเป็นการลบรหัสครุภัณฑ์ออกจากระบบถาวร กรุณาตรวจสอบก่อนยืนยัน</div>
            </div>`;
    }

    // ============================================================
    // 5. ACTION LOGIC
    // ============================================================

    // ระบบเพิ่มรายการต่อเนื่อง (Sequential Add)
    window.addListSequential = async function() {
        const { value: f } = await Swal.fire({
            title: 'เพิ่มครุภัณฑ์ใหม่',
            html: `<input id="sw-c" class="form-control mb-2" placeholder="รหัสครุภัณฑ์"><input id="sw-n" class="form-control" placeholder="ชื่อครุภัณฑ์">`,
            showCancelButton: true, confirmButtonText: 'บันทึกและเพิ่มต่อ', cancelButtonText: 'เสร็จสิ้น',
            preConfirm: () => ({ code: document.getElementById('sw-c').value.trim(), name: document.getElementById('sw-n').value.trim() })
        });
        if (f && f.code) {
            await postAction("DATA", "add", f);
            window.addListSequential(); // เรียกตัวเองซ้ำเพื่อเพิ่มช่องใหม่
        } else { window.loadPage('list'); }
    };

    window.confirmWait = async (btn) => {
        const tr = btn.closest("tr");
        showLoading("กำลังบันทึก...");
        await postAction("LOG", "addLog", { 
            "รหัส": tr.cells[1].innerText, "ชื่อ": tr.cells[2].innerText, 
            "ที่อยู่": tr.querySelector(".wait-loc").value, "สถานะ": tr.querySelector(".wait-status").value, 
            "หมายเหตุ": tr.querySelector(".wait-note").value 
        });
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

    // ============================================================
    // 6. ROUTER ENGINE
    // ============================================================
    window.loadPage = async function(page, param = null) {
        showLoading();
        const routes = { "dash": renderDashboard, "wait": renderWait, "list": renderList, "history": () => renderHistory(param), "user": renderUser, "report": renderReport, "manual": renderManual };
        if (routes[page]) {
            await routes[page]();
            // ตกแต่งปุ่ม Navy
            document.querySelectorAll('.btn-primary').forEach(b => b.style.backgroundColor = THEME_COLOR);
        }
    };

    window.loadPage("dash");
});
