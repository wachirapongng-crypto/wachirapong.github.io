/***************************************************
 * dashboard.js — Bootstrap Version
 * - ปรับ Styling ให้ใช้ Class ของ Bootstrap
 ***************************************************/

document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // 1. CONSTANTS & CONFIG
    // ============================================================
    
    const BASE = "https://script.google.com/macros/s/AKfycbzyOwWg00Fp9NgGg6AscrNb3uSNjHAp6d-E9Z3bjG-IalIXgm4wJpc3sFpmkY0iVlNv2w/exec";

    const URLS = {
        DATA: BASE + "?sheet=DATA",
        WAIT: BASE + "?sheet=WAIT",
        LOG:  BASE + "?sheet=LOG",
        USER: BASE + "?sheet=LOGIN",
        SHOW: BASE + "?sheet=SHOW"
    };

    const pageTitle   = document.getElementById("page-title");
    const pageContent = document.getElementById("page-content");


    // ============================================================
    // 2. UTILITY FUNCTIONS
    // ============================================================

    async function fetchJSON(url, method = "GET", body = null) {
        const controller = new AbortController();
        const signal = controller.signal;
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
            const opt = method === "POST" ? { method: "POST", body, signal } : { method: "GET", signal };
            const res = await fetch(url, opt);
            clearTimeout(timeout);
            
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.warn("fetchJSON: ไม่ใช่ JSON, คืนค่า []. Text:", text.slice(0, 100));
                return [];
            }
        } catch (err) {
            clearTimeout(timeout);
            console.error("fetchJSON error:", err);
            return [];
        }
    }

    // ปรับ Loading ให้ใช้ Spinner ของ Bootstrap
    function showLoadingMessage(message = "กำลังโหลดข้อมูลอยู่...") {
        pageContent.innerHTML = `
            <div class="text-center py-5">
                <h3 class="mb-3">${message}</h3>
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>`;
    }

    function formatDateTH(v) {
        if (!v) return "";
        let d;
        const parts = String(v).split('/');
        
        if (parts.length === 3) {
            const isoLikeString = `${parts[2]}/${parts[1]}/${parts[0]}`;
            d = new Date(isoLikeString);
        } else {
            d = new Date(v);
        }

        if (isNaN(d.getTime()) || d.getFullYear() < 2000) {
            return v; 
        }

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear() + 543;
        
        return `${day}/${month}/${year}`;
    }

    function formatTime(v) {
        if (!v) return "";
        const d = new Date(v);
        if (isNaN(d.getTime())) return v;
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm} น.`;
    }

    function computeRowFromData(r, i) {
         return r && (r._row || r.row || r.__row) ? (r._row || r.row || r.__row) : (i + 2);
    }

    async function showSuccessAndRefresh(message, refreshFunc, loadingMessage) {
        await Swal.fire({
            title: "สำเร็จ!",
            text: message,
            icon: "success",
            showConfirmButton: false,
            timer: 1000
        });
        showLoadingMessage(loadingMessage);
        await refreshFunc();
    }

    function handleRefresh(pageName, loadingMessage) {
        return async () => {
            showLoadingMessage(loadingMessage);
            if (pageName === 'wait') await renderWaitPage();
            else if (pageName === 'list') await renderListPage();
            else if (pageName === 'user') await renderUserPage();
            else if (pageName === 'report') await renderReportPage();
        };
    }


    // ============================================================
    // 3. ROUTER
    // ============================================================

    async function loadPageInternal(page) {
        pageContent.innerHTML = "";
        
        if (page === "wait") {
            pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
            showLoadingMessage("กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");
            await renderWaitPage();
        }
        else if (page === "list") {
            pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
            showLoadingMessage("กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
            await renderListPage();
        }
        else if (page === "user") {
            pageTitle.textContent = "👥 จัดการสมาชิก";
            showLoadingMessage("กำลังโหลดรายชื่อสมาชิก...");
            await renderUserPage();
        }
        else if (page === "report") {
            pageTitle.textContent = "📑 รายงาน LOG / SHOW";
            showLoadingMessage("กำลังโหลดรายงาน...");
            await renderReportPage();
        }
        else if (page === "manual") {
            pageTitle.textContent = "📘 คู่มือการใช้งาน";
            renderManualPage();
        }
        else {
            pageTitle.textContent = "Dashboard";
            pageContent.innerHTML = "<div class='alert alert-info'>กรุณาเลือกเมนูด้านซ้าย</div>";
        }
    }

    window.loadPage = loadPageInternal;
    window.loadPage("wait");


    // ============================================================
    // 4. FORM HELPER (SweetAlert - ยังคงใช้ Style เดิมบางส่วนเพื่อให้แสดงผลใน Popup ได้ดี)
    // ============================================================

    async function showAssetForm(title, code = '', name = '', confirmText = 'บันทึก') {
        return Swal.fire({
            title: title,
            html: `
                <div class="row g-2 text-start p-2">
                    <div class="col-12 col-md-6">
                        <label class="form-label fw-bold">รหัสครุภัณฑ์:</label>
                        <input id="swal-code" class="form-control" value="${code}" placeholder="ระบุรหัสครุภัณฑ์">
                    </div>
                    <div class="col-12 col-md-6">
                        <label class="form-label fw-bold">ชื่อครุภัณฑ์:</label>
                        <input id="swal-name" class="form-control" value="${name}" placeholder="ระบุชื่อครุภัณฑ์">
                    </div>
                </div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: 'ยกเลิก',
            customClass: {
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-secondary'
            },
            preConfirm: () => {
                const newCode = document.getElementById('swal-code').value.trim();
                const newName = document.getElementById('swal-name').value.trim();
                if (!newCode || !newName) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                    return false;
                }
                return { code: newCode, name: newName };
            }
        });
    }

    async function showUserForm(title, id = '', pass = '', status = 'employee', name = '', confirmText = 'บันทึก') {
        return Swal.fire({
            title: title,
            html: `
                <div class="d-flex flex-column gap-2 text-start p-2">
                    <div>
                        <label class="form-label fw-bold">ID:</label>
                        <input id="swal-id" class="form-control" value="${id}" placeholder="ID">
                    </div>
                    <div>
                        <label class="form-label fw-bold">Pass:</label>
                        <input id="swal-pass" class="form-control" value="${pass}" placeholder="Password">
                    </div>
                    <div>
                        <label class="form-label fw-bold">Status:</label>
                        <select id="swal-status" class="form-select">
                            <option value="admin" ${status === "admin" ? "selected" : ""}>admin</option>
                            <option value="employee" ${status === "employee" ? "selected" : ""}>employee</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label fw-bold">ชื่อ:</label>
                        <input id="swal-name" class="form-control" value="${name}" placeholder="ชื่อ">
                    </div>
                </div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                const newId = document.getElementById('swal-id').value.trim();
                const newPass = document.getElementById('swal-pass').value.trim();
                const newStatus = document.getElementById('swal-status').value.trim();
                const newName = document.getElementById('swal-name').value.trim();
                if (!newId || !newPass || !newStatus || !newName) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                    return false;
                }
                return { id: newId, pass: newPass, status: newStatus, name: newName };
            }
        });
    }


    // ============================================================
    // 5. RENDER FUNCTIONS
    // ============================================================

    // ------------------------------------------------------------
    // 5.1 หน้า WAIT (Bootstrap Table & Buttons)
    // ------------------------------------------------------------
    async function renderWaitPage() {
        const data = await fetchJSON(URLS.WAIT);
        const LOCATIONS = ["501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
        const STATUS = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

        let html = `
            <div class="mb-3 text-end">
                <button id="refresh-wait" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-arrow-clockwise"></i> 🔄 รีเฟรช
                </button>
            </div>
            <div class="table-responsive">
                <table class="table table-bordered table-striped table-hover align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th>
                            <th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th>
                            <th>ยืนยัน</th><th>ลบ</th>
                        </tr>
                    </thead>
                    <tbody>`;

        data.forEach((r, i) => {
            const row = computeRowFromData(r, i);
            html += `
                <tr data-row="${row}">
                    <td>${r["รหัส"] || ""}</td>
                    <td>${r["ชื่อ"] || ""}</td>
                    <td>
                        <select class="form-select form-select-sm wait-loc" style="min-width: 80px;">
                            ${LOCATIONS.map(v => `<option value="${v}" ${v === r["ที่อยู่"] ? "selected" : ""}>${v}</option>`).join("")}
                        </select>
                    </td>
                    <td>
                        <select class="form-select form-select-sm wait-status" style="min-width: 120px;">
                            ${STATUS.map(v => `<option value="${v}" ${v === r["สถานะ"] ? "selected" : ""}>${v}</option>`).join("")}
                        </select>
                    </td>
                    <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"] || ""}" placeholder="ระบุเพิ่ม"></td>
                    
                    <td class="text-nowrap">${formatDateTH(r["วันที่"])}</td>
                    <td class="text-nowrap">${formatTime(r["เวลา"])}</td>
                    
                    <td class="text-center"><button class="btn btn-success btn-sm move-log">✔</button></td>
                    <td class="text-center"><button class="btn btn-danger btn-sm del-wait">🗑</button></td>
                </tr>`;
        });

        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        document.getElementById("refresh-wait").onclick = handleRefresh('wait', "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");

        // === ปุ่มย้ายข้อมูล (Move to Log) ===
        document.querySelectorAll(".move-log").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการบันทึก?", text: "ต้องการย้ายรายการนี้ไปที่รายงาน?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ยืนยัน", cancelButtonText: "ยกเลิก",
                    confirmButtonColor: '#198754', cancelButtonColor: '#6c757d'
                });
                
                if (!confirmResult.isConfirmed) return;

                try {
                    const tr = this.closest("tr");
                    const row = tr.dataset.row;
                    
                    const body = new FormData();
                    body.append("sheet", "LOG");
                    body.append("action", "addLog");
                    body.append("รหัส", tr.children[0].innerText.trim());
                    body.append("ชื่อ", tr.children[1].innerText.trim());
                    body.append("ที่อยู่", tr.querySelector(".wait-loc").value);
                    body.append("สถานะ", tr.querySelector(".wait-status").value);
                    body.append("หมายเหตุ", tr.querySelector(".wait-note").value);
                    body.append("วันที่", tr.children[5].innerText.trim());
                    body.append("เวลา", tr.children[6].innerText.trim());
                    
                    await fetchJSON(BASE, "POST", body);

                    const del = new FormData();
                    del.append("sheet", "WAIT");
                    del.append("action", "delete");
                    del.append("row", row);
                    await fetchJSON(BASE, "POST", del);

                    await showSuccessAndRefresh("เพิ่มรายการสำเร็จ", renderWaitPage, "กำลังโหลดข้อมูล...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้อง", "error");
                }
            };
        });

        // === ปุ่มลบข้อมูล (Delete Wait) ===
        document.querySelectorAll(".del-wait").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการลบ?", text: "ต้องการลบรายการนี้?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบเลย", cancelButtonText: "ยกเลิก",
                    confirmButtonColor: '#dc3545'
                });
                
                if (!confirmResult.isConfirmed) return;

                try {
                    const row = this.closest("tr").dataset.row;
                    const body = new FormData();
                    body.append("sheet", "WAIT");
                    body.append("action", "delete");
                    body.append("row", row);
                    await fetchJSON(BASE, "POST", body);
                    await showSuccessAndRefresh("ลบสำเร็จ", renderWaitPage, "กำลังโหลดข้อมูล...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้อง", "error");
                }
            };
        });

    }


    // ------------------------------------------------------------
    // 5.2 หน้า LIST (Bootstrap Table & Buttons)
    // ------------------------------------------------------------
    async function renderListPage() {
        const data = await fetchJSON(URLS.DATA);
        const filteredData = data.filter(r => r["รหัสครุภัณฑ์"] && r["รหัสครุภัณฑ์"].toString().trim() !== "");

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="m-0">รายการครุภัณฑ์</h4>
                <div>
                    <button id="add-item" class="btn btn-primary btn-sm">➕ เพิ่มรายการ</button>
                    <button id="refresh-list" class="btn btn-outline-secondary btn-sm">🔄 รีเฟรช</button>
                </div>
            </div>
            
            <div class="table-responsive">
            <table class="table table-bordered table-striped table-hover align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อ</th>
                            <th>Barcode</th><th>QRCode</th><th>แก้ไข</th><th>ลบ</th>
                        </tr>
                    </thead>
                    <tbody>`;

        filteredData.forEach((r, i) => {
            const row = computeRowFromData(r, i);
            const codeRaw = r["รหัสครุภัณฑ์"] || "";
            const code = encodeURIComponent(codeRaw);
            const name = r["ชื่อครุภัณฑ์"] || "";
            const barcodeURL = `https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128&translate-esc=true`;
            const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${code}`;

            html += `<tr data-row="${row}">
                <td class="text-center">${r["ลำดับ"] || (i + 1)}</td>
                <td class="list-code fw-bold">${codeRaw}</td>
                <td class="list-name">${name}</td>
                <td class="text-center"><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td>
                <td class="text-center"><img src="${qrURL}" alt="qr" style="height:50px;"></td>
                <td class="text-center"><button class="btn btn-warning btn-sm list-update">📝</button></td>
                <td class="text-center"><button class="btn btn-danger btn-sm list-delete">🗑</button></td>
            </tr>`;
        });
        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        document.getElementById("refresh-list").onclick = handleRefresh('list', "กำลังโหลดรายการ...");

        // === ปุ่มเพิ่มรายการ ===
        const addBtn = document.getElementById("add-item");
        if (addBtn) addBtn.onclick = async () => {
             const { value: formValues } = await showAssetForm('➕ เพิ่มรายการครุภัณฑ์ใหม่', '', '', 'เพิ่มรายการ');
             if (!formValues) return;
             
             try {
                const body = new FormData();
                body.append("sheet", "DATA");
                body.append("action", "add");
                body.append("code", formValues.code);
                body.append("name", formValues.name);
                await fetchJSON(BASE, "POST", body);
                await showSuccessAndRefresh("เพิ่มรายการสำเร็จ", renderListPage, "กำลังโหลดรายการ...");
            } catch (e) {
                await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้อง", "error");
            }
        };

        // === ปุ่มแก้ไขรายการ ===
        document.querySelectorAll(".list-update").forEach(btn => {
            btn.onclick = async function () {
                const tr = this.closest("tr");
                const row = tr.dataset.row;
                const code = tr.querySelector(".list-code").innerText.trim();
                const name = tr.querySelector(".list-name").innerText.trim();
                
                const { value: formValues } = await showAssetForm('📝 แก้ไขข้อมูลครุภัณฑ์', code, name, 'บันทึกการแก้ไข');
                if (!formValues) return;

                try {
                    const body = new FormData();
                    body.append("sheet", "DATA");
                    body.append("action", "update");
                    body.append("row", row);
                    body.append("code", formValues.code);
                    body.append("name", formValues.name);
                    await fetchJSON(BASE, "POST", body);
                    await showSuccessAndRefresh("แก้ไขสำเร็จ", renderListPage, "กำลังโหลดรายการ...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้อง", "error");
                }
            };
        });

        // === ปุ่มลบรายการ ===
        document.querySelectorAll(".list-delete").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการลบ?", text: "ลบรายการนี้ถาวร?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก", confirmButtonColor: '#dc3545'
                });
                if (!confirmResult.isConfirmed) return;
                
                try {
                    const row = this.closest("tr").dataset.row;
                    const body = new FormData();
                    body.append("sheet", "DATA");
                    body.append("action", "delete");
                    body.append("row", row);
                    await fetchJSON(BASE, "POST", body);
                    await showSuccessAndRefresh("ลบสำเร็จ", renderListPage, "กำลังโหลดรายการ...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้อง", "error");
                }
            };
        });
    }


    // ------------------------------------------------------------
    // 5.3 หน้า USER (Bootstrap Table & Buttons)
    // ------------------------------------------------------------
    async function renderUserPage() {
        const data = await fetchJSON(URLS.USER);
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="m-0">จัดการสมาชิก</h4>
                <div>
                    <button id="add-user" class="btn btn-primary btn-sm">➕ เพิ่มสมาชิก</button>
                    <button id="refresh-user" class="btn btn-outline-secondary btn-sm">🔄 รีเฟรช</button>
                </div>
            </div>
            <div class="table-responsive">
            <table class="table table-bordered table-striped table-hover align-middle">
                <thead class="table-dark">
                    <tr><th>ID</th><th>Pass</th><th>Status</th><th>Name</th><th>แก้ไข</th><th>ลบ</th></tr>
                </thead>
                <tbody>`;

        data.forEach((u, i) => {
            const row = computeRowFromData(u, i);
            let badgeClass = u["Status"] === 'admin' ? 'bg-danger' : 'bg-info text-dark';
            
            html += `<tr data-row="${row}">
                <td class="user-id">${u["ID"] || ""}</td>
                <td class="user-pass text-muted">****</td>
                <td><span class="badge ${badgeClass} user-status">${u["Status"] || ""}</span></td>
                <td class="user-name">${u["name"] || ""}</td>
                <td class="text-center"><button class="btn btn-warning btn-sm up-user">📝</button></td>
                <td class="text-center"><button class="btn btn-danger btn-sm del-user">🗑</button></td>
                <td style="display:none;" class="real-pass">${u["Pass"] || ""}</td> 
            </tr>`;
        });
        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        document.getElementById("refresh-user").onclick = handleRefresh('user', "กำลังโหลดสมาชิก...");

        // === ปุ่มเพิ่มสมาชิก ===
        const addUserBtn = document.getElementById("add-user");
        if (addUserBtn) addUserBtn.onclick = async () => {
             const { value: formValues } = await showUserForm('➕ เพิ่มสมาชิกใหม่', '', '', 'employee', '', 'เพิ่มสมาชิก');
             if (!formValues) return;
             try {
                const body = new FormData();
                body.append("sheet", "LOGIN");
                body.append("action", "addUser");
                body.append("id", formValues.id);
                body.append("pass", formValues.pass);
                body.append("status", formValues.status);
                body.append("name", formValues.name);
                await fetchJSON(BASE, "POST", body);
                await showSuccessAndRefresh("เพิ่มสมาชิกสำเร็จ", renderUserPage, "กำลังโหลดสมาชิก...");
            } catch (e) { await Swal.fire("ผิดพลาด!", "Connection error", "error"); }
        };

        // === ปุ่มแก้ไขสมาชิก ===
        document.querySelectorAll(".up-user").forEach(btn => {
            btn.onclick = async function () {
                const tr = this.closest("tr");
                const row = tr.dataset.row;
                const id = tr.querySelector(".user-id").innerText.trim();
                // ดึง pass จาก hidden cell หรือจะให้กรอกใหม่ก็ได้ (ในที่นี้ดึงจาก hidden .real-pass เพื่อความง่าย)
                const pass = tr.querySelector(".real-pass").innerText.trim(); 
                const status = tr.querySelector(".user-status").innerText.trim();
                const name = tr.querySelector(".user-name").innerText.trim();
                
                const { value: formValues } = await showUserForm('📝 แก้ไขสมาชิก', id, pass, status, name, 'บันทึก');
                if (!formValues) return;
                try {
                    const body = new FormData();
                    body.append("sheet", "LOGIN");
                    body.append("action", "updateUser");
                    body.append("row", row);
                    body.append("id", formValues.id);
                    body.append("pass", formValues.pass);
                    body.append("status", formValues.status);
                    body.append("name", formValues.name);
                    await fetchJSON(BASE, "POST", body);
                    await showSuccessAndRefresh("แก้ไขสำเร็จ", renderUserPage, "กำลังโหลดสมาชิก...");
                } catch (e) { await Swal.fire("ผิดพลาด!", "Connection error", "error"); }
            };
        });

        // === ปุ่มลบสมาชิก ===
        document.querySelectorAll(".del-user").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการลบ?", text: "ลบสมาชิกนี้ถาวร?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก", confirmButtonColor: '#dc3545'
                });
                if (!confirmResult.isConfirmed) return;
                try {
                    const row = this.closest("tr").dataset.row;
                    const body = new FormData();
                    body.append("sheet", "LOGIN");
                    body.append("action", "deleteUser");
                    body.append("row", row);
                    await fetchJSON(BASE, "POST", body);
                    await showSuccessAndRefresh("ลบสำเร็จ", renderUserPage, "กำลังโหลดสมาชิก...");
                } catch (e) { await Swal.fire("ผิดพลาด!", "Connection error", "error"); }
            };
        });
    }


    // ------------------------------------------------------------
    // 5.4 หน้า REPORT (Bootstrap Table & Buttons)
    // ------------------------------------------------------------
    async function renderReportPage() {
        const data = await fetchJSON(URLS.SHOW);
        let html = `
            <div class="mb-3 text-end">
                <button id="export-report" class="btn btn-success">
                    <i class="bi bi-file-earmark-excel"></i> ⬇️ Export Excel
                </button>
            </div>
            <div class="table-responsive">
            <table class="table table-bordered table-striped table-hover align-middle">
                <thead class="table-success">
                    <tr>
                        <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th>
                        <th>รายละเอียดเพิ่มเติม</th><th>วันที่</th><th>เวลา</th>
                    </tr>
                </thead>
                <tbody>`;

        data.forEach(r => {
            html += `<tr>
                <td>${r["รหัสครุภัณฑ์"] || ""}</td>
                <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
                <td>${r["ที่เก็บ"] || ""}</td>
                <td><span class="badge bg-secondary">${r["สถานะ"] || ""}</span></td>
                <td>${r["รายละเอียดเพิ่มเติม"] || ""}</td>
                <td>${r["วันที่"] || ""}</td> <td>${r["เวลา"] || ""}</td> 
            </tr>`;
        });
        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        // === ปุ่มสร้างรายงาน ===
        document.getElementById("export-report").onclick = async function () {
            const confirmResult = await Swal.fire({
                title: "สร้างรายงาน?", text: "ระบบจะสร้างไฟล์ Excel", icon: "question",
                showCancelButton: true, confirmButtonText: "สร้างเลย"
            });
            if (!confirmResult.isConfirmed) return;

            try {
                const body = new FormData();
                body.append("sheet", "SHOW");
                body.append("action", "generateReport");
                const result = await fetchJSON(BASE, "POST", body);

                if (result && result.status === "success" && result.fileURL) {
                    await Swal.fire({
                        title: "สำเร็จ!",
                        html: `ดาวน์โหลดไฟล์: <a href="${result.fileURL}" target="_blank" class="btn btn-primary mt-2">คลิกที่นี่เพื่อดาวน์โหลด</a>`,
                        icon: "success"
                    });
                } else {
                    await Swal.fire("ผิดพลาด!", "ไม่สามารถสร้างรายงานได้", "error");
                }
            } catch (e) { await Swal.fire("ผิดพลาด!", "Connection error", "error"); }
        };
    }


    // ------------------------------------------------------------
    // 5.5 หน้า MANUAL (Bootstrap Card)
    // ------------------------------------------------------------
    function renderManualPage() {
        pageContent.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-header bg-primary text-white">
                    <h4 class="m-0">📘 คู่มือการใช้งาน</h4>
                </div>
                <div class="card-body">
                    <h5 class="text-primary">1. ครุภัณฑ์ที่รอตรวจสอบ (WAIT)</h5>
                    <p class="text-muted ms-3">- ตรวจสอบรายการ เลือกสถานที่/สถานะ แล้วกด <span class="badge bg-success">✔</span> เพื่อบันทึก</p>
                    
                    <h5 class="text-primary mt-4">2. รายการครุภัณฑ์ทั้งหมด (LIST)</h5>
                    <p class="text-muted ms-3">- จัดการฐานข้อมูล เพิ่มรายการใหม่ หรือแก้ไขรายการเดิม</p>
                    
                    <h5 class="text-primary mt-4">3. จัดการสมาชิก (USER)</h5>
                    <p class="text-muted ms-3">- สำหรับ Admin เพิ่มหรือลบผู้ใช้งานระบบ</p>
                    
                    <h5 class="text-primary mt-4">4. รายงาน (REPORT)</h5>
                    <p class="text-muted ms-3">- ดูประวัติการบันทึกและ Export ไฟล์ Excel</p>
                </div>
            </div>
        `;
    }

});
