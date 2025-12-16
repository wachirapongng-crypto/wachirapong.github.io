/***************************************************
 * dashboard.js — Full fixed & cleaned (v3.3 Readable)
 * - จัดรูปแบบให้อ่านง่าย มีคอมเมนต์กำกับท้ายฟังก์ชัน
 ***************************************************/

document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // 1. CONSTANTS & CONFIG (ค่าคงที่และการตั้งค่า)
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
    // 2. UTILITY FUNCTIONS (ฟังก์ชันช่วยทำงานทั่วไป)
    // ============================================================

    // ฟังก์ชันดึงข้อมูล JSON จาก Server
    async function fetchJSON(url, method = "GET", body = null) {
        const controller = new AbortController();
        const signal = controller.signal;
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s Timeout

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
    } // <--- จบฟังก์ชัน fetchJSON


    // ฟังก์ชันแสดงหน้าจอ Loading
    function showLoadingMessage(message = "กำลังโหลดข้อมูลอยู่...") {
        pageContent.innerHTML = `
            <div style="text-align:center; padding: 50px;">
                <h3>${message}</h3>
                <div class="loader-spinner" style="border-top-color:#3498db; width: 40px; height: 40px; border-width: 4px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
            </div>`;
    } // <--- จบฟังก์ชัน showLoadingMessage


    // ฟังก์ชันแปลงวันที่ (สำคัญมาก: แก้ปัญหา DD/MM/YYYY)
    function formatDateTH(v) {
        if (!v) return "";
        let d;
        const parts = String(v).split('/');
        
        if (parts.length === 3) {
            // กรณีมาเป็น 01/10/2025 -> แปลงเป็น 2025/10/01 เพื่อให้ JS อ่านออก
            const isoLikeString = `${parts[2]}/${parts[1]}/${parts[0]}`;
            d = new Date(isoLikeString);
        } else {
            // กรณีมาเป็นรูปแบบอื่น
            d = new Date(v);
        }

        // ตรวจสอบว่าวันที่ใช้ได้ไหม
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) {
            return v; 
        }

        // แปลงเป็น พ.ศ.
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear() + 543;
        
        return `${day}/${month}/${year}`;
    } // <--- จบฟังก์ชัน formatDateTH


    // ฟังก์ชันแปลงเวลา
    function formatTime(v) {
        if (!v) return "";
        const d = new Date(v);
        if (isNaN(d.getTime())) return v;
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm} น.`;
    } // <--- จบฟังก์ชัน formatTime


    // ฟังก์ชันหาเลขแถว (Row Index)
    function computeRowFromData(r, i) {
         return r && (r._row || r.row || r.__row) ? (r._row || r.row || r.__row) : (i + 2);
    } // <--- จบฟังก์ชัน computeRowFromData


    // ฟังก์ชันแสดงผลสำเร็จและรีโหลดหน้า
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
    } // <--- จบฟังก์ชัน showSuccessAndRefresh


    // ฟังก์ชันสร้างตัวกด Refresh
    function handleRefresh(pageName, loadingMessage) {
        return async () => {
            showLoadingMessage(loadingMessage);
            if (pageName === 'wait') await renderWaitPage();
            else if (pageName === 'list') await renderListPage();
            else if (pageName === 'user') await renderUserPage();
            else if (pageName === 'report') await renderReportPage();
        };
    } // <--- จบฟังก์ชัน handleRefresh


    // ============================================================
    // 3. ROUTER (ตัวจัดการเปลี่ยนหน้า)
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
            pageContent.innerHTML = "<p>เลือกเมนูด้านซ้าย</p>";
        }
    } // <--- จบฟังก์ชัน loadPageInternal

    // เปิดให้เรียกใช้จาก HTML ได้
    window.loadPage = loadPageInternal;
    // เริ่มต้นโหลดหน้าแรก
    window.loadPage("wait");


    // ============================================================
    // 4. FORM HELPER (ฟอร์ม SweetAlert)
    // ============================================================

    // ฟอร์มสำหรับเพิ่ม/แก้ไข ครุภัณฑ์
    async function showAssetForm(title, code = '', name = '', confirmText = 'บันทึก') {
        return Swal.fire({
            title: title,
            html: `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; padding: 10px 20px; width: 100%;">
                    <div style="grid-column: 1 / 2;">
                        <label for="swal-code" style="font-weight: bold; display: block; margin-bottom: 5px;">รหัสครุภัณฑ์:</label>
                        <input id="swal-code" class="swal2-input" value="${code}" placeholder="ระบุรหัสครุภัณฑ์" style="margin: 0; padding: 10px; width: 100%;">
                    </div>
                    <div style="grid-column: 2 / 3;">
                        <label for="swal-name" style="font-weight: bold; display: block; margin-bottom: 5px;">ชื่อครุภัณฑ์:</label>
                        <input id="swal-name" class="swal2-input" value="${name}" placeholder="ระบุชื่อครุภัณฑ์" style="margin: 0; padding: 10px; width: 100%;">
                    </div>
                </div>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: 'ยกเลิก',
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
    } // <--- จบฟังก์ชัน showAssetForm

    // ฟอร์มสำหรับเพิ่ม/แก้ไข สมาชิก
    async function showUserForm(title, id = '', pass = '', status = 'employee', name = '', confirmText = 'บันทึก') {
        return Swal.fire({
            title: title,
            html: `
                <div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 10px 20px; text-align: left; padding: 10px 20px; width: 100%;">
                    <label for="swal-id" style="align-self: center; font-weight: bold;">ID:</label>
                    <input id="swal-id" class="swal2-input" value="${id}" placeholder="ID" style="margin: 0; padding: 10px;">
                    
                    <label for="swal-pass" style="align-self: center; font-weight: bold;">Pass:</label>
                    <input id="swal-pass" class="swal2-input" value="${pass}" placeholder="Password" style="margin: 0; padding: 10px;">
                    
                    <label for="swal-status" style="align-self: center; font-weight: bold;">Status:</label>
                    <select id="swal-status" class="swal2-select" style="margin: 0; padding: 10px; width: 100%; font-size: inherit;">
                        <option value="admin" ${status === "admin" ? "selected" : ""}>admin</option>
                        <option value="employee" ${status === "employee" ? "selected" : ""}>employee</option>
                    </select>

                    <label for="swal-name" style="align-self: center; font-weight: bold;">ชื่อ:</label>
                    <input id="swal-name" class="swal2-input" value="${name}" placeholder="ชื่อ" style="margin: 0; padding: 10px;">
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
    } // <--- จบฟังก์ชัน showUserForm


    // ============================================================
    // 5. RENDER FUNCTIONS (ฟังก์ชันแสดงผลหน้าจอ)
    // ============================================================

    // ------------------------------------------------------------
    // 5.1 หน้า WAIT (ครุภัณฑ์รอตรวจสอบ)
    // ------------------------------------------------------------
    async function renderWaitPage() {
        const data = await fetchJSON(URLS.WAIT);
        const LOCATIONS = ["501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
        const STATUS = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

        let html = `
            <div style="margin-bottom:10px">
                <button id="refresh-wait" class="btn">🔄 รีเฟรช</button>
            </div>
            <div style="overflow-x: auto;">
                <table class="dash-table">
                    <thead>
                        <tr>
                            <th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th>
                            <th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th>
                            <th>ย้ายเข้ารายงาน</th><th>ลบ</th>
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
                        <select class="wait-loc">
                            ${LOCATIONS.map(v => `<option value="${v}" ${v === r["ที่อยู่"] ? "selected" : ""}>${v}</option>`).join("")}
                        </select>
                    </td>
                    <td>
                        <select class="wait-status">
                            ${STATUS.map(v => `<option value="${v}" ${v === r["สถานะ"] ? "selected" : ""}>${v}</option>`).join("")}
                        </select>
                    </td>
                    <td><input class="wait-note" value="${r["หมายเหตุ"] || ""}" placeholder="รายละเอียดเพิ่มเติม"></td>
                    
                    <td>${formatDateTH(r["วันที่"])}</td>
                    <td>${formatTime(r["เวลา"])}</td>
                    
                    <td><button class="btn move-log">✔</button></td>
                    <td><button class="btn del-wait">🗑</button></td>
                </tr>`;
        });

        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        // ปุ่ม Refresh
        document.getElementById("refresh-wait").onclick = handleRefresh('wait', "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");

        // === ปุ่มย้ายข้อมูล (Move to Log) ===
        document.querySelectorAll(".move-log").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "คุณแน่ใจหรือไม่?", text: "ยืนยันการเพิ่มรายการเข้ารายงาน?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ใช่, ยืนยัน!", cancelButtonText: "ยกเลิก"
                });
                
                if (!confirmResult.isConfirmed) return;

                try {
                    const tr = this.closest("tr");
                    const row = tr.dataset.row;
                    
                    // เตรียมข้อมูลสำหรับ Log
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
                    
                    // 1. เพิ่มเข้า Log
                    const logResult = await fetchJSON(BASE, "POST", body);

                    // 2. ลบออกจาก Wait
                    const del = new FormData();
                    del.append("sheet", "WAIT");
                    del.append("action", "delete");
                    del.append("row", row);
                    const deleteResult = await fetchJSON(BASE, "POST", del);

                    if (logResult && deleteResult) {
                        await showSuccessAndRefresh("เพิ่มรายการสำเร็จ", renderWaitPage, "กำลังโหลดข้อมูล...");
                    }
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้อง", "error");
                }
            }; // <--- จบ onclick ของ move-log
        });

        // === ปุ่มลบข้อมูล (Delete Wait) ===
        document.querySelectorAll(".del-wait").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "คุณแน่ใจหรือไม่?", text: "ต้องการลบรายการนี้?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบเลย", cancelButtonText: "ยกเลิก"
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
            }; // <--- จบ onclick ของ del-wait
        });

    } // <--- จบฟังก์ชัน renderWaitPage


    // ------------------------------------------------------------
    // 5.2 หน้า LIST (รายการครุภัณฑ์ทั้งหมด)
    // ------------------------------------------------------------
    async function renderListPage() {
        const data = await fetchJSON(URLS.DATA);
        const filteredData = data.filter(r => r["รหัสครุภัณฑ์"] && r["รหัสครุภัณฑ์"].toString().trim() !== "");

        let html = `
            <h3>รายการครุภัณฑ์</h3>
            <div style="margin-bottom:10px">
                <button id="add-item" class="btn">➕ เพิ่มรายการใหม่</button>
                <button id="refresh-list" class="btn">🔄 รีเฟรช</button>
            </div>
            <hr>
            <div style="overflow-x: auto;">
            <table class="dash-table">
                    <thead>
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
                <td>${r["ลำดับ"] || (i + 1)}</td>
                <td class="list-code">${codeRaw}</td>
                <td class="list-name">${name}</td>
                <td><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td>
                <td><img src="${qrURL}" alt="qr" style="height:60px;"></td>
                <td><button class="btn list-update">📝</button></td>
                <td><button class="btn list-delete">🗑</button></td>
            </tr>`;
        });
        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        document.getElementById("refresh-list").onclick = handleRefresh('list', "กำลังโหลดรายการ...");

        // === ปุ่มเพิ่มรายการ (Add Item) ===
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
        }; // <--- จบ onclick ของ add-item

        // === ปุ่มแก้ไขรายการ (Update Item) ===
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
            }; // <--- จบ onclick ของ list-update
        });

        // === ปุ่มลบรายการ (Delete Item) ===
        document.querySelectorAll(".list-delete").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการลบ?", text: "ลบรายการนี้ถาวร?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก"
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
            }; // <--- จบ onclick ของ list-delete
        });

    } // <--- จบฟังก์ชัน renderListPage


    // ------------------------------------------------------------
    // 5.3 หน้า USER (จัดการสมาชิก)
    // ------------------------------------------------------------
    async function renderUserPage() {
        const data = await fetchJSON(URLS.USER);
        let html = `
            <h3>จัดการสมาชิก</h3>
            <div style="margin-bottom:10px">
                <button id="add-user" class="btn">➕ เพิ่มสมาชิกใหม่</button>
                <button id="refresh-user" class="btn">🔄 รีเฟรช</button>
            </div><hr>
            <div style="overflow-x: auto;">
            <table class="dash-table">
                <thead>
                    <tr><th>ID</th><th>Pass</th><th>Status</th><th>Name</th><th>แก้ไข</th><th>ลบ</th></tr>
                </thead>
                <tbody>`;

        data.forEach((u, i) => {
            const row = computeRowFromData(u, i);
            html += `<tr data-row="${row}">
                <td class="user-id">${u["ID"] || ""}</td>
                <td class="user-pass">${u["Pass"] || ""}</td>
                <td class="user-status">${u["Status"] || ""}</td>
                <td class="user-name">${u["name"] || ""}</td>
                <td><button class="btn up-user">📝</button></td>
                <td><button class="btn del-user">🗑</button></td>
            </tr>`;
        });
        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        document.getElementById("refresh-user").onclick = handleRefresh('user', "กำลังโหลดสมาชิก...");

        // === ปุ่มเพิ่มสมาชิก (Add User) ===
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
        }; // <--- จบ onclick ของ add-user

        // === ปุ่มแก้ไขสมาชิก (Update User) ===
        document.querySelectorAll(".up-user").forEach(btn => {
            btn.onclick = async function () {
                const tr = this.closest("tr");
                const row = tr.dataset.row;
                const id = tr.querySelector(".user-id").innerText.trim();
                const pass = tr.querySelector(".user-pass").innerText.trim();
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
            }; // <--- จบ onclick ของ up-user
        });

        // === ปุ่มลบสมาชิก (Delete User) ===
        document.querySelectorAll(".del-user").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการลบ?", text: "ลบสมาชิกนี้ถาวร?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก"
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
            }; // <--- จบ onclick ของ del-user
        });

    } // <--- จบฟังก์ชัน renderUserPage


    // ------------------------------------------------------------
    // 5.4 หน้า REPORT (รายงาน)
    // ------------------------------------------------------------
    async function renderReportPage() {
        const data = await fetchJSON(URLS.SHOW);
        let html = `
            <div style="margin-bottom:10px">
                <button id="export-report" class="btn">⬇️ สร้างรายงาน (Excel)</button>
            </div>
            <div style="overflow-x: auto;">
            <table class="dash-table"><thead><tr>
                <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th>
                <th>รายละเอียดเพิ่มเติม</th><th>วันที่</th><th>เวลา</th>
            </tr></thead><tbody>`;

        data.forEach(r => {
            html += `<tr>
                <td>${r["รหัสครุภัณฑ์"] || ""}</td>
                <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
                <td>${r["ที่เก็บ"] || ""}</td>
                <td>${r["สถานะ"] || ""}</td>
                <td>${r["รายละเอียดเพิ่มเติม"] || ""}</td>
                <td>${r["วันที่"] || ""}</td> <td>${r["เวลา"] || ""}</td> </tr>`;
        });
        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        // === ปุ่มสร้างรายงาน (Export Excel) ===
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
                        html: `ดาวน์โหลดไฟล์: <a href="${result.fileURL}" target="_blank">คลิกที่นี่</a>`,
                        icon: "success"
                    });
                } else {
                    await Swal.fire("ผิดพลาด!", "ไม่สามารถสร้างรายงานได้", "error");
                }
            } catch (e) { await Swal.fire("ผิดพลาด!", "Connection error", "error"); }
        }; // <--- จบ onclick ของ export-report

    } // <--- จบฟังก์ชัน renderReportPage


    // ------------------------------------------------------------
    // 5.5 หน้า MANUAL (คู่มือ)
    // ------------------------------------------------------------
    function renderManualPage() {
        pageContent.innerHTML = `
            <h2>📘 คู่มือการใช้งาน</h2><hr>
            <h3>1. ครุภัณฑ์ที่รอตรวจสอบ (WAIT)</h3>
            <p>รายการที่รอการยืนยันสถานะ สามารถแก้ไขข้อมูลและกดยืนยัน (✔) เพื่อย้ายเข้ารายงาน</p>
            <h3>2. รายการครุภัณฑ์ทั้งหมด (LIST)</h3>
            <p>จัดการข้อมูลหลัก เพิ่ม/ลบ/แก้ไข รายการครุภัณฑ์</p>
            <h3>3. จัดการสมาชิก (USER)</h3>
            <p>เพิ่มและจัดการสิทธิ์ผู้เข้าใช้งาน (Admin/Employee)</p>
            <h3>4. รายงาน (REPORT)</h3>
            <p>ดูรายการที่ตรวจสอบแล้วและ Export เป็น Excel</p>
        `;
    } // <--- จบฟังก์ชัน renderManualPage

}); // <--- จบ DOMContentLoaded (ปีกกาตัวสุดท้ายของไฟล์)
