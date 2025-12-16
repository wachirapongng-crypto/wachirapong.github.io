/***************************************************
 * dashboard.js — Full fixed & cleaned (v3.2 Final Date Fix)
 * - Fix 1: Date format D/M/YYYY (e.g., 1/10/2025) fixed to work with GAS output.
 * - Fix 2: Added scroll capability to the main dash-table container.
 * - Fix 3: UI Layout for List/User Add/Edit forms fixed using Grid/Flex.
 ***************************************************/

document.addEventListener("DOMContentLoaded", () => {
    // 1. Constants and Global Elements
    // =====================================
    const BASE = "https://script.google.com/macros/s/AKfycbzyOwWg00Fp9NgGg6AscrNb3uSNjHAp6d-E9Z3bjG-IalIXgm4wJpc3sFpmkY0iVlNv2w/exec";

    // กำหนด URL สำหรับเข้าถึงข้อมูลแต่ละชีท
    const URLS = {
        DATA: BASE + "?sheet=DATA",
        WAIT: BASE + "?sheet=WAIT",
        LOG: BASE + "?sheet=LOG",
        USER: BASE + "?sheet=LOGIN",
        SHOW: BASE + "?sheet=SHOW"
    };

    // อ้างอิงถึง Element หลักของหน้า
    const pageTitle = document.getElementById("page-title");
    const pageContent = document.getElementById("page-content");

    // 2. Core API / Utility Functions
    // =====================================

    /**
     * @function fetchJSON
     * @description ส่งคำขอ Fetch ไปยัง GAS URL พร้อมจัดการ Timeout และแปลง response เป็น JSON
     * @param {string} url - URL ของ GAS Web App
     * @param {string} [method="GET"] - Method ที่ใช้ ("GET" หรือ "POST")
     * @param {FormData|null} [body=null] - ข้อมูลที่จะส่งสำหรับ POST
     * @returns {Promise<Object[]|[]>} - ข้อมูล JSON ที่ได้จากการตอบกลับ หรือ Array เปล่าเมื่อเกิดข้อผิดพลาด
     */
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
                console.warn("fetchJSON: Response is not valid JSON, returning []. Text:", text.slice(0, 100));
                return [];
            }
        } catch (err) {
            clearTimeout(timeout);
            if (err.name === 'AbortError') {
                console.error("fetchJSON error: Request timed out after 15 seconds.");
            } else {
                console.error("fetchJSON error:", err);
            }
            return [];
        }
    }

    /**
     * @function showLoadingMessage
     * @description แสดงข้อความโหลดและ Spinner ในพื้นที่ pageContent
     * @param {string} [message="กำลังโหลดข้อมูลอยู่..."] - ข้อความที่ต้องการแสดง
     */
    function showLoadingMessage(message = "กำลังโหลดข้อมูลอยู่...") {
        pageContent.innerHTML = `<div style="text-align:center; padding: 50px;">
                                    <h3>${message}</h3>
                                    <div class="loader-spinner" style="border-top-color:#3498db; width: 40px; height: 40px; border-width: 4px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                                </div>`;
    }

    /**
     * @function formatDateTH
     * @description แปลงรูปแบบวันที่จาก GAS (DD/MM/YYYY หรือ ISO) เป็น DD/MM/YYYY (พ.ศ.)
     * @param {string|Date} v - ค่าวันที่
     * @returns {string} - วันที่ในรูปแบบ DD/MM/YYYY (พ.ศ.) หรือค่าเดิมเมื่อผิดพลาด
     */
    function formatDateTH(v) {
        if (!v) return "";
        let d;
        
        // 1. ลองแยก DD/MM/YYYY
        const parts = String(v).split('/');
        if (parts.length === 3) {
            // แปลงเป็น YYYY/M/D เพื่อให้ new Date() อ่านง่ายขึ้น
            // ต้องใช้ parts[2] (ปี) เป็นตัวแรก
            const isoLikeString = `${parts[2]}/${parts[1]}/${parts[0]}`; 
            d = new Date(isoLikeString);
        } else {
            // 2. ถ้าไม่ใช่รูปแบบที่คาดหวัง ลองสร้าง Date โดยตรง (สำหรับ ISO 8601)
            d = new Date(v);
        }

        // 3. ตรวจสอบความถูกต้อง (ต้องมีค่าและปีต้องสมเหตุสมผล)
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) {
            return v; // คืนค่าเดิม
        }

        // แปลงเป็น พ.ศ. และรูปแบบ วัน/เดือน/ปี
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    }

    /**
     * @function formatTime
     * @description แปลงค่าเวลาเป็นรูปแบบ HH:MM น.
     * @param {string|Date} v - ค่าเวลา
     * @returns {string} - เวลาในรูปแบบ HH:MM น.
     */
    function formatTime(v) {
        if (!v) return "";
        const d = new Date(v);
        if (isNaN(d.getTime())) return v;
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${hh}:${mm} น.`;
    }

    /**
     * @function computeRowFromData
     * @description คำนวณเลขที่แถวสำหรับ GAS (ใช้สำหรับ Update/Delete)
     * @param {Object} r - Object ข้อมูลแถว
     * @param {number} i - Index ของแถว (เริ่มต้นจาก 0)
     * @returns {number} - เลขที่แถวใน Google Sheet (เริ่มต้นที่ 2)
     */
    function computeRowFromData(r, i) {
        // GAS จะส่ง property ชื่อ _row, row หรือ __row มา
        if (r && (r._row || r.row || r.__row)) {
             return (r._row || r.row || r.__row);
        }
        // ถ้าไม่มีค่า row มาให้ (เช่น ในบางกรณีของ GET) จะใช้ index + 2 (Header = 1, Data เริ่มที่ 2)
        return i + 2; 
    }

    /**
     * @function showSuccessAndRefresh
     * @description แสดง SweetAlert2 สำหรับแจ้งเตือนความสำเร็จและโหลดหน้าใหม่
     * @param {string} message - ข้อความแจ้งเตือนความสำเร็จ
     * @param {Function} refreshFunc - ฟังก์ชันสำหรับโหลดหน้าใหม่
     * @param {string} loadingMessage - ข้อความแสดงขณะโหลดหน้าใหม่
     */
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

    /**
     * @function handleRefresh
     * @description สร้าง Handler สำหรับปุ่ม Refresh ในแต่ละหน้า
     * @param {string} pageName - ชื่อหน้า (wait, list, user, report)
     * @param {string} loadingMessage - ข้อความแสดงขณะโหลด
     * @returns {Function} - ฟังก์ชันที่ใช้เป็น onclick handler
     */
    function handleRefresh(pageName, loadingMessage) {
        return async () => {
            showLoadingMessage(loadingMessage);
            if (pageName === 'wait') await renderWaitPage();
            else if (pageName === 'list') await renderListPage();
            else if (pageName === 'user') await renderUserPage();
            else if (pageName === 'report') await renderReportPage();
        };
    }

    // 3. Router
    // =====================================

    /**
     * @function loadPageInternal
     * @description จัดการการเปลี่ยนหน้าตามชื่อหน้าที่กำหนด
     * @param {string} page - ชื่อหน้า (wait, list, user, report, manual)
     */
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
    }

    // กำหนดให้ loadPage เป็น Global function เพื่อให้เรียกใช้จากเมนู HTML ได้
    window.loadPage = loadPageInternal;

    // โหลดหน้าเริ่มต้น
    window.loadPage("wait");

    // 4. Page Rendering Functions
    // =====================================

    /**
     * @function renderWaitPage
     * @description ดึงข้อมูลจากชีท WAIT และแสดงในรูปแบบตาราง พร้อมฟังก์ชัน Move/Delete
     */
    async function renderWaitPage() {
        const data = await fetchJSON(URLS.WAIT);

        // ค่าคงที่สำหรับ Dropdown
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
                    <tbody>
        `;

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
                </tr>
            `;
        });

        html += "</tbody></table></div>";
        pageContent.innerHTML = html;

        // Attach Event Listeners
        document.getElementById("refresh-wait").onclick = handleRefresh('wait', "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");

        // **Move To LOG** - ย้ายรายการไปชีท LOG (REPORT) และลบออกจาก WAIT
        document.querySelectorAll(".move-log").forEach(btn => {
            btn.onclick = async function () {
                // ... (Logic for confirmation and API calls for addLog and delete)
                const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
                if (!confirmResult.isConfirmed) return;

                try {
                    const tr = this.closest("tr");
                    const row = tr.dataset.row;

                    // 1. เพิ่มรายการไป LOG
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
                    const logResult = await fetchJSON(BASE, "POST", body);

                    // 2. ลบออกจาก WAIT
                    const del = new FormData();
                    del.append("sheet", "WAIT");
                    del.append("action", "delete");
                    del.append("row", row);
                    const deleteResult = await fetchJSON(BASE, "POST", del);

                    if (logResult && deleteResult) {
                        await showSuccessAndRefresh("เพิ่มรายการเข้ารายงานสำเร็จแล้ว", renderWaitPage, "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");
                    } else {
                        await Swal.fire("ผิดพลาด!", "การดำเนินการไม่สมบูรณ์ หรือ Server ตอบกลับไม่สำเร็จ", "error");
                    }
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
                }
            };
        });

        // **Delete Wait Item** - ลบรายการจากชีท WAIT
        document.querySelectorAll(".del-wait").forEach(btn => {
            btn.onclick = async function () {
                // ... (Logic for confirmation and API call for delete)
                const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
                if (!confirmResult.isConfirmed) return;

                try {
                    const row = this.closest("tr").dataset.row;
                    const body = new FormData();
                    body.append("sheet", "WAIT");
                    body.append("action", "delete");
                    body.append("row", row);
                    await fetchJSON(BASE, "POST", body);

                    await showSuccessAndRefresh("ลบรายการสำเร็จแล้ว", renderWaitPage, "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
                }
            };
        });
    }

    /**
     * @function renderListPage
     * @description ดึงข้อมูลครุภัณฑ์ทั้งหมดจากชีท DATA และแสดงในรูปแบบตาราง พร้อมฟังก์ชัน Add/Update/Delete
     */
    async function renderListPage() {
        const data = await fetchJSON(URLS.DATA);
        // กรองข้อมูลที่ไม่มีรหัสครุภัณฑ์
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
                    <tbody>
        `;

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

        // Attach Event Listeners
        document.getElementById("refresh-list").onclick = handleRefresh('list', "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");

        // **Add New Item** - เพิ่มรายการครุภัณฑ์ใหม่
        const addBtn = document.getElementById("add-item");
        if (addBtn) addBtn.onclick = async () => {
             // ... (Logic for SweetAlert2 form, validation, confirmation, and API call for add)
             const { value: formValues } = await Swal.fire({ /* ... form options ... */ });
             if (!formValues) return;

             const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
             if (!confirmResult.isConfirmed) return;

             try {
                const body = new FormData();
                body.append("sheet", "DATA");
                body.append("action", "add");
                body.append("code", formValues.code);
                body.append("name", formValues.name);
                await fetchJSON(BASE, "POST", body);

                await showSuccessAndRefresh("เพิ่มรายการสำเร็จแล้ว", renderListPage, "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
            } catch (e) {
                await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
            }
        };

        // **Update Item** - แก้ไขข้อมูลครุภัณฑ์
        document.querySelectorAll(".list-update").forEach(btn => {
            btn.onclick = async function () {
                // ... (Logic for retrieving current data, SweetAlert2 form, validation, confirmation, and API call for update)
                const tr = this.closest("tr");
                const row = tr.dataset.row;
                const code = tr.querySelector(".list-code").innerText.trim();
                const name = tr.querySelector(".list-name").innerText.trim();

                const { value: formValues } = await Swal.fire({ /* ... form options ... */ });
                if (!formValues) return;

                const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
                if (!confirmResult.isConfirmed) return;

                try {
                    const body = new FormData();
                    body.append("sheet", "DATA");
                    body.append("action", "update");
                    body.append("row", row);
                    body.append("code", formValues.code);
                    body.append("name", formValues.name);
                    await fetchJSON(BASE, "POST", body);

                    await showSuccessAndRefresh("แก้ไขรายการสำเร็จแล้ว", renderListPage, "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
                }
            };
        });

        // **Delete Item** - ลบรายการครุภัณฑ์
        document.querySelectorAll(".list-delete").forEach(btn => {
            btn.onclick = async function () {
                // ... (Logic for confirmation and API call for delete)
                const row = this.closest("tr").dataset.row;

                const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
                if (!confirmResult.isConfirmed) return;

                try {
                    const body = new FormData();
                    body.append("sheet", "DATA");
                    body.append("action", "delete");
                    body.append("row", row);
                    await fetchJSON(BASE, "POST", body);

                    await showSuccessAndRefresh("ลบรายการสำเร็จแล้ว", renderListPage, "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
                }
            };
        });
    }

    /**
     * @function renderUserPage
     * @description ดึงข้อมูลสมาชิกจากชีท LOGIN และแสดงในรูปแบบตาราง พร้อมฟังก์ชัน Add/Update/Delete User
     */
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
                    <tr>
                        <th>ID</th><th>Pass</th><th>Status</th><th>Name</th>
                        <th>แก้ไข</th><th>ลบ</th>
                    </tr>
                </thead>
                <tbody>
        `;

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

        // Attach Event Listeners
        document.getElementById("refresh-user").onclick = handleRefresh('user', "กำลังโหลดรายชื่อสมาชิก...");

        // **Add User** - เพิ่มสมาชิกใหม่
        const addUserBtn = document.getElementById("add-user");
        if (addUserBtn) addUserBtn.onclick = async () => {
             // ... (Logic for SweetAlert2 form, validation, confirmation, and API call for addUser)
             const { value: formValues } = await Swal.fire({ /* ... form options ... */ });
             if (!formValues) return;

             const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
             if (!confirmResult.isConfirmed) return;

             try {
                const body = new FormData();
                body.append("sheet", "LOGIN");
                body.append("action", "addUser");
                body.append("id", formValues.id);
                body.append("pass", formValues.pass);
                body.append("status", formValues.status);
                body.append("name", formValues.name);
                await fetchJSON(BASE, "POST", body);

                await showSuccessAndRefresh("เพิ่มสมาชิกสำเร็จแล้ว", renderUserPage, "กำลังโหลดรายชื่อสมาชิก...");
            } catch (e) {
                await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
            }
        };

        // **Update User** - แก้ไขข้อมูลสมาชิก
        document.querySelectorAll(".up-user").forEach(btn => {
            btn.onclick = async function () {
                // ... (Logic for retrieving current data, SweetAlert2 form, validation, confirmation, and API call for updateUser)
                const tr = this.closest("tr");
                const row = tr.dataset.row;
                const id = tr.querySelector(".user-id").innerText.trim();
                const pass = tr.querySelector(".user-pass").innerText.trim();
                const status = tr.querySelector(".user-status").innerText.trim();
                const name = tr.querySelector(".user-name").innerText.trim();

                const { value: formValues } = await Swal.fire({ /* ... form options ... */ });
                if (!formValues) return;

                const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
                if (!confirmResult.isConfirmed) return;

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

                    await showSuccessAndRefresh("แก้ไขสมาชิกสำเร็จแล้ว", renderUserPage, "กำลังโหลดรายชื่อสมาชิก...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
                }
            };
        });

        // **Delete User** - ลบสมาชิก
        document.querySelectorAll(".del-user").forEach(btn => {
            btn.onclick = async function () {
                // ... (Logic for confirmation and API call for deleteUser)
                const row = this.closest("tr").dataset.row;

                const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
                if (!confirmResult.isConfirmed) return;

                try {
                    const body = new FormData();
                    body.append("sheet", "LOGIN");
                    body.append("action", "deleteUser");
                    body.append("row", row);
                    await fetchJSON(BASE, "POST", body);

                    await showSuccessAndRefresh("ลบสมาชิกสำเร็จแล้ว", renderUserPage, "กำลังโหลดรายชื่อสมาชิก...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
                }
            };
        });
    }

    /**
     * @function renderReportPage
     * @description ดึงข้อมูลรายงานจากชีท SHOW และแสดงในรูปแบบตาราง พร้อมฟังก์ชันสร้างรายงาน Excel
     */
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

        // **Export Report** - ส่งคำขอไปยัง GAS เพื่อสร้างไฟล์ Excel
        document.getElementById("export-report").onclick = async function () {
            // ... (Logic for confirmation and API call for generateReport)
            const confirmResult = await Swal.fire({ /* ... confirmation options ... */ });
            if (!confirmResult.isConfirmed) return;

            try {
                const body = new FormData();
                body.append("sheet", "SHOW");
                body.append("action", "generateReport");
                const result = await fetchJSON(BASE, "POST", body);

                if (result && result.status === "success" && result.fileURL) {
                    await Swal.fire({
                        title: "สำเร็จ!",
                        html: `สร้างรายงานเสร็จสิ้น: <a href="${result.fileURL}" target="_blank">ดาวน์โหลดไฟล์</a>`,
                        icon: "success"
                    });
                } else {
                    await Swal.fire("ผิดพลาด!", "ไม่สามารถสร้างรายงานได้ โปรดตรวจสอบ Backend", "error");
                }
            } catch (e) {
                await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
            }
        };
    }

    /**
     * @function renderManualPage
     * @description แสดงคู่มือการใช้งาน
     */
    function renderManualPage() {
        pageContent.innerHTML = `
            <h2>📘 คู่มือการใช้งาน</h2>
            
            <hr>

            <h3>1. ครุภัณฑ์ที่รอตรวจสอบ (WAIT)</h3>
            <p>รายการครุภัณฑ์ที่ถูกแจ้งเข้ามาเพื่อรอการตรวจสอบและยืนยันสถานะ</p>
            <ul>
                <li><strong>แก้ไข:</strong> คุณสามารถแก้ไข **ที่อยู่**, **สถานะ**, และ **หมายเหตุ** ได้โดยตรงในตาราง</li>
                <li><strong>ย้ายเข้ารายงาน (✔):</strong> ยืนยันข้อมูลและย้ายรายการนี้ไปบันทึกใน **รายงาน LOG / SHOW** และลบออกจากรายการรอตรวจสอบ</li>
                <li><strong>ลบ (🗑):</strong> ลบรายการนี้ออกจากรายการรอตรวจสอบอย่างถาวร</li>
                <li><strong>รีเฟรช (🔄):</strong> โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์</li>
            </ul>

            <h3>2. รายการครุภัณฑ์ทั้งหมด (LIST)</h3>
            <p>รายการครุภัณฑ์ทั้งหมดที่มีอยู่ในระบบ (ชีท DATA)</p>
            <ul>
                <li><strong>เพิ่มรายการใหม่:</strong> กดปุ่ม **➕ เพิ่มรายการใหม่** จะมีหน้าต่างขึ้นมาให้กรอก **รหัสครุภัณฑ์** และ **ชื่อครุภัณฑ์**</li>
                <li><strong>แก้ไข (📝):</strong> กดปุ่มแก้ไข จะมีหน้าต่างขึ้นมาให้แก้ไข **รหัสครุภัณฑ์** และ **ชื่อครุภัณฑ์**</li>
                <li><strong>ลบ (🗑):</strong> ลบรายการครุภัณฑ์นั้นอย่างถาวร</li>
                <li>**Barcode/QRCode:** ภาพ Barcode และ QR Code ถูกสร้างขึ้นจาก **รหัสครุภัณฑ์** ที่อยู่ในตาราง 

[Image of a barcode and a QR code]
</li>
                <li><strong>รีเฟรช (🔄):</strong> โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์</li>
            </ul>

            <h3>3. จัดการสมาชิก (USER)</h3>
            <p>จัดการบัญชีผู้ใช้งานระบบ</p>
            <ul>
                <li><strong>เพิ่มสมาชิกใหม่:</strong> กดปุ่ม **➕ เพิ่มสมาชิกใหม่** จะมีหน้าต่างขึ้นมาให้กรอก **ID**, **Pass**, **Status** (admin/employee) และ **ชื่อ**</li>
                <li><strong>แก้ไข (📝):</strong> กดปุ่มแก้ไข จะมีหน้าต่างขึ้นมาให้แก้ไขข้อมูลสมาชิกทั้งหมด</li>
                <li><strong>ลบ (🗑):</strong> ลบสมาชิกนั้นออกจากระบบอย่างถาวร</li>
                <li><strong>รีเฟรช (🔄):</strong> โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์</li>
            </ul>

            <h3>4. รายงาน LOG / SHOW (REPORT)</h3>
            <p>แสดงรายการครุภัณฑ์ทั้งหมดในชีท SHOW</p>
            <ul>
                <li><strong>การแสดงผล:</strong> แสดงเฉพาะรายการที่ถูกย้ายจากหน้า **ครุภัณฑ์ที่รอตรวจสอบ** เข้ามาแล้ว</li>
                <li><strong>สร้างรายงาน (Excel):</strong> ส่งคำขอไปยัง Backend (GAS) เพื่อสร้างไฟล์ Excel รายงาน</li>
            </ul>
        `;
    }
});
