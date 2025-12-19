document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // 1. CONSTANTS & DOM ELEMENTS
    // ============================================================

    // URL พื้นฐานสำหรับ Google Apps Script Web App
    const BASE_URL = "https://script.google.com/macros/s/AKfycbytUjsxc0zhTeD1qkb8DQOl7o7YzthDfSwAWXfroHqycY7IwZsEetpEoHKL_AC7R7HNVw/exec";
    
    // Object สำหรับเก็บ URL เต็มของแต่ละ Sheet เพื่อให้เข้าถึงได้ง่ายและอ่านง่าย
    const URLS = Object.freeze({
        DATA: BASE_URL + "?sheet=DATA",
        WAIT: BASE_URL + "?sheet=WAIT",
        LOG:  BASE_URL + "?sheet=LOG",
        USER: BASE_URL + "?sheet=LOGIN",
        SHOW: BASE_URL + "?sheet=SHOW"
    });

    const pageTitle   = document.getElementById("page-title");
    const pageContent = document.getElementById("page-content");

    // ============================================================
    // 2. UTILITY FUNCTIONS
    // ============================================================

    /**
     * ดึงข้อมูล JSON จาก URL พร้อมจัดการ Timeout และ Error
     * @param {string} url - URL ที่จะเรียกใช้
     * @param {string} method - HTTP Method (GET หรือ POST)
     * @param {FormData|null} body - ข้อมูลที่จะส่งในรูปแบบ FormData สำหรับ POST
     * @returns {Promise<Array<Object>|Object>} ข้อมูลที่ได้จากการแปลง JSON หรือ Array ว่างหากเกิดข้อผิดพลาด
     */
    async function fetchJSON(url, method = "GET", body = null) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // ตั้ง Timeout 15 วินาที

        try {
            const options = method === "POST" ? { method: "POST", body, signal: controller.signal } : { method: "GET", signal: controller.signal };
            const response = await fetch(url, options);
            clearTimeout(timeout);
            
            // ใช้ response.json() โดยตรงจะจัดการ Content-Type ได้ดีกว่า
            // แต่เนื่องจาก Google Script มักจะส่งเป็น Text กลับมา จึงคงการอ่านเป็น Text ไว้ก่อน
            const text = await response.text();
            
            try {
                return JSON.parse(text);
            } catch (e) {
                // หากแปลง JSON ไม่ได้ ให้ Log คำเตือนและคืนค่าเป็น Array ว่าง เพื่อให้โค้ดเรียกใช้งานทำงานต่อไปได้
                console.warn(`fetchJSON: ไม่ใช่ JSON, คืนค่า []. Text (ตัวอย่าง 100 ตัวอักษร): ${text.slice(0, 100)}`);
                return []; 
            }
        } catch (err) {
            clearTimeout(timeout);
            // ตรวจสอบว่าเป็น Abort Error (Timeout) หรือ Error อื่นๆ
            if (err.name === 'AbortError') {
                console.error("fetchJSON error: Request timed out (15s).");
            } else {
                console.error("fetchJSON error:", err);
            }
            return []; // คืนค่าเป็น Array ว่างในกรณีที่เกิด Error
        }
    }

    /** แสดง Loading Spinner ด้วย Bootstrap */
    function showLoadingMessage(message = "กำลังโหลดข้อมูลอยู่...") {
        pageContent.innerHTML = `
            <div class="text-center py-5">
                <h3 class="mb-3">${message}</h3>
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>`;
    }

    /**
     * แปลง String ให้เป็น Date และ Format เป็น วัน/เดือน/ปี (พ.ศ.)
     * รองรับรูปแบบ d/m/y (เช่น 1/12/2025) และ ISO/Timestamp
     * @param {string} value - ค่าวันที่
     * @returns {string} วันที่ในรูปแบบ dd/mm/yyyy (พ.ศ.) หรือค่าเดิมหากไม่ถูกต้อง
     */
    function formatDateTH(value) {
        if (!value) return "";
        let date;
        // ตรวจสอบและแปลงรูปแบบ d/m/y ให้เป็นรูปแบบที่ new Date รองรับได้ดีขึ้น
        const parts = String(value).split('/');
        if (parts.length === 3) {
            date = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`); // m/d/y
        } else {
            date = new Date(value);
        }

        if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
            return value; // คืนค่าเดิมหากแปลงไม่ได้
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
        
        return `${day}/${month}/${year}`;
    }

    /**
     * แปลง String ให้เป็น Time และ Format เป็น ชั่วโมง:นาที
     * @param {string} value - ค่าเวลา
     * @returns {string} เวลาในรูปแบบ hh:mm น. หรือค่าเดิมหากไม่ถูกต้อง
     */
    function formatTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");
        return `${hh}:${mm} น.`;
    }

    /**
     * คำนวณเลข Row ที่จะใช้ใน Google Sheet API
     * (โดยปกติ Google Sheet จะนับ Row แรกเป็น 1 และ Data Row จะเริ่มที่ 2)
     * @param {Object} rowData - Object ข้อมูลที่ได้จากการ Fetch
     * @param {number} index - Index ของ Array (เริ่มต้นที่ 0)
     * @returns {number} เลข Row ใน Google Sheet
     */
    function computeRowFromData(rowData, index) {
        // ใช้ค่า _row, row หรือ __row จากข้อมูล หากไม่มี ให้ใช้ index + 2
        return rowData && (rowData._row || rowData.row || rowData.__row) 
            ? (rowData._row || rowData.row || rowData.__row) 
            : (index + 2);
    }

    /**
     * แสดง Popup สำเร็จด้วย SweetAlert และทำการ Refresh หน้า
     * @param {string} message - ข้อความแจ้งเตือน
     * @param {Function} refreshFunc - ฟังก์ชันที่ใช้ในการ Refresh หน้า
     * @param {string} loadingMessage - ข้อความ Loading ขณะ Refresh
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
     * สร้าง Event Handler สำหรับปุ่ม Refresh 
     * @param {string} pageName - ชื่อหน้า ('wait', 'list', 'user', 'report')
     * @param {string} loadingMessage - ข้อความ Loading
     * @returns {Function} ฟังก์ชัน async สำหรับ Refresh
     */
    function handleRefresh(pageName, loadingMessage) {
        return async () => {
            showLoadingMessage(loadingMessage);
            // ใช้ Map/Object แทน if/else if เพื่อให้สั้นและอ่านง่ายขึ้น
            const pageRenderers = {
                'wait': renderWaitPage,
                'list': renderListPage,
                'user': renderUserPage,
                'report': renderReportPage
            };
            const renderer = pageRenderers[pageName];
            if (renderer) await renderer();
        };
    }

    // ============================================================
    // 3. ROUTER
    // ============================================================

    /**
     * เปลี่ยนหน้าตามชื่อที่กำหนด
     * @param {string} page - ชื่อหน้า
     */
    async function loadPageInternal(page) {
        pageContent.innerHTML = "";
        
        const pageConfig = {
            "wait":   { title: "🕓 ครุภัณฑ์ที่รอตรวจสอบ", loader: "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...", renderer: renderWaitPage },
            "list":   { title: "📋 รายการครุภัณฑ์ทั้งหมด", loader: "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...", renderer: renderListPage },
            "user":   { title: "👥 จัดการสมาชิก", loader: "กำลังโหลดรายชื่อสมาชิก...", renderer: renderUserPage },
            "report": { title: "📑 รายงาน LOG / SHOW", loader: "กำลังโหลดรายงาน...", renderer: renderReportPage },
            "manual": { title: "📘 คู่มือการใช้งาน", loader: null, renderer: renderManualPage }
        };

        const config = pageConfig[page];

        if (config) {
            pageTitle.textContent = config.title;
            if (config.loader) showLoadingMessage(config.loader);
            // เรียกใช้ Renderer
            if (config.renderer) await config.renderer();
        } else {
            pageTitle.textContent = "Dashboard";
            pageContent.innerHTML = "<div class='alert alert-info'>กรุณาเลือกเมนูด้านซ้าย</div>";
        }
    }

    // กำหนดให้ฟังก์ชัน loadPageInternal สามารถเรียกใช้จากนอก Block ได้ (เช่น จาก Menu)
    window.loadPage = loadPageInternal;
    // โหลดหน้าเริ่มต้น
    window.loadPage("wait");


    // ============================================================
    // 4. FORM HELPER (SweetAlert Prompts)
    // ============================================================

    /** แสดงฟอร์มครุภัณฑ์สำหรับเพิ่ม/แก้ไข */
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
            // PreConfirm สำหรับ Validate ข้อมูล
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

    /** แสดงฟอร์มสมาชิกสำหรับเพิ่ม/แก้ไข */
    async function showUserForm(title, id = '', pass = '', status = 'employee', name = '', confirmText = 'บันทึก') {
        return Swal.fire({
            title: title,
            html: `
                <div class="d-flex flex-column gap-2 text-start p-2">
                    <div><label class="form-label fw-bold">ID:</label><input id="swal-id" class="form-control" value="${id}" placeholder="ID"></div>
                    <div><label class="form-label fw-bold">Pass:</label><input id="swal-pass" class="form-control" value="${pass}" placeholder="Password"></div>
                    <div>
                        <label class="form-label fw-bold">Status:</label>
                        <select id="swal-status" class="form-select">
                            <option value="admin" ${status === "admin" ? "selected" : ""}>admin</option>
                            <option value="employee" ${status === "employee" ? "selected" : ""}>employee</option>
                        </select>
                    </div>
                    <div><label class="form-label fw-bold">ชื่อ:</label><input id="swal-name" class="form-control" value="${name}" placeholder="ชื่อ"></div>
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
    // 5. DATA ACTIONS & RENDER FUNCTIONS
    // ============================================================

    /**
     * ฟังก์ชันจัดการ POST Request สำหรับ Add/Update/Delete ข้อมูล
     * @param {string} sheetName - ชื่อ sheet ("DATA", "WAIT", "LOGIN")
     * @param {string} action - ชนิดของ action
     * @param {Object} params - Object ของ parameters ที่จะ append เข้า FormData
     */
    async function postAction(sheetName, action, params = {}) {
        const body = new FormData();
        body.append("sheet", sheetName);
        body.append("action", action);
        Object.entries(params).forEach(([key, value]) => body.append(key, value));

        const result = await fetchJSON(BASE_URL, "POST", body);

        if (result && result.status === "success") {
            return result;
        } else {
            // โยน Error เพื่อให้ Catch ด้านบนจัดการ
            throw new Error(result ? result.message : "การเชื่อมต่อขัดข้อง");
        }
    }
    
    // --- 5.1 หน้า WAIT ---
    async function renderWaitPage() {
        const data = await fetchJSON(URLS.WAIT);
        const LOCATIONS = ["-","501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
        const STATUS = ["-","ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

        // ฟังก์ชันสร้าง Dropdown Options
        const createOptions = (options, selectedValue) => 
            options.map(v => `<option value="${v}" ${v === selectedValue ? "selected" : ""}>${v}</option>`).join("");

        // ฟังก์ชันสร้าง Table Row
        const createRow = (r, i) => {
            const row = computeRowFromData(r, i);
            return `
                <tr data-row="${row}">
                    <td>${r["รหัส"] || ""}</td>
                    <td>${r["ชื่อ"] || ""}</td>
                    <td>
                        <select class="form-select form-select-sm wait-loc" style="min-width: 80px;">
                            ${createOptions(LOCATIONS, r["ที่อยู่"])}
                        </select>
                    </td>
                    <td>
                        <select class="form-select form-select-sm wait-status" style="min-width: 120px;">
                            ${createOptions(STATUS, r["สถานะ"])}
                        </select>
                    </td>
                    <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"] || ""}" placeholder="ระบุเพิ่ม"></td>
                    
                    <td class="text-nowrap wait-date">${formatDateTH(r["วันที่"])}</td>
                    <td class="text-nowrap wait-time">${formatTime(r["เวลา"])}</td>
                    
                    <td class="text-center"><button class="btn btn-success btn-sm move-log">✔</button></td>
                    <td class="text-center"><button class="btn btn-danger btn-sm del-wait">🗑</button></td>
                </tr>`;
        };

        const html = `
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
                    <tbody>
                        ${data.map(createRow).join("")}
                    </tbody>
                </table>
            </div>`;

        pageContent.innerHTML = html;

        document.getElementById("refresh-wait").onclick = handleRefresh('wait', "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");

        // === Event Handlers (ใช้ Arrow Function เพื่อความสั้น) ===

        // ย้ายข้อมูลไป LOG
        document.querySelectorAll(".move-log").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการบันทึก?", text: "ต้องการย้ายรายการนี้ไปที่รายงาน?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ยืนยัน", cancelButtonText: "ยกเลิก",
                    confirmButtonColor: '#198754', cancelButtonColor: '#6c757d'
                });
                
                if (!confirmResult.isConfirmed) return;

                const tr = this.closest("tr");
                const row = tr.dataset.row;
                
                try {
                    // 1. เพิ่ม Log
                    await postAction("LOG", "addLog", {
                        "รหัส": tr.children[0].innerText.trim(),
                        "ชื่อ": tr.children[1].innerText.trim(),
                        "ที่อยู่": tr.querySelector(".wait-loc").value,
                        "สถานะ": tr.querySelector(".wait-status").value,
                        "หมายเหตุ": tr.querySelector(".wait-note").value,
                        "วันที่": tr.querySelector(".wait-date").innerText.trim(),
                        "เวลา": tr.querySelector(".wait-time").innerText.trim()
                    });

                    // 2. ลบ Wait
                    await postAction("WAIT", "delete", { row });

                    await showSuccessAndRefresh("เพิ่มรายการสำเร็จ", renderWaitPage, "กำลังโหลดข้อมูล...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", e.message, "error");
                }
            };
        });

        // ลบข้อมูล Wait
        document.querySelectorAll(".del-wait").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการลบ?", text: "ต้องการลบรายการนี้?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบเลย", cancelButtonText: "ยกเลิก",
                    confirmButtonColor: '#dc3545'
                });
                
                if (!confirmResult.isConfirmed) return;

                const row = this.closest("tr").dataset.row;
                
                try {
                    await postAction("WAIT", "delete", { row });
                    await showSuccessAndRefresh("ลบสำเร็จ", renderWaitPage, "กำลังโหลดข้อมูล...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", e.message, "error");
                }
            };
        });
    }


    // --- 5.2 หน้า LIST ---
    async function renderListPage() {
        const data = await fetchJSON(URLS.DATA);
        // กรองข้อมูลที่ไม่มีรหัสครุภัณฑ์
        const filteredData = data.filter(r => r["รหัสครุภัณฑ์"] && r["รหัสครุภัณฑ์"].toString().trim() !== "");

        // ฟังก์ชันสร้าง Table Row
        const createRow = (r, i) => {
            const row = computeRowFromData(r, i);
            const codeRaw = r["รหัสครุภัณฑ์"] || "";
            // ควรใช้ encodeURIComponent สำหรับ URL Parameter เพื่อความปลอดภัย
            const code = encodeURIComponent(codeRaw); 
            const name = r["ชื่อครุภัณฑ์"] || "";
            // ใช้ URL ที่สั้นลง
            const barcodeURL = `https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128`;
            const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${code}`;

            return `<tr data-row="${row}">
                <td class="text-center">${r["ลำดับ"] || (i + 1)}</td>
                <td class="list-code fw-bold">${codeRaw}</td>
                <td class="list-name">${name}</td>
                <td class="text-center"><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td>
                <td class="text-center"><img src="${qrURL}" alt="qr" style="height:50px;"></td>
                <td class="text-center"><button class="btn btn-warning btn-sm list-update">📝</button></td>
                <td class="text-center"><button class="btn btn-danger btn-sm list-delete">🗑</button></td>
            </tr>`;
        };

        const html = `
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
                    <tbody>
                        ${filteredData.map(createRow).join("")}
                    </tbody>
                </table>
            </div>`;

        pageContent.innerHTML = html;

        document.getElementById("refresh-list").onclick = handleRefresh('list', "กำลังโหลดรายการ...");

        // === Event Handlers ===

        // เพิ่มรายการ
        document.getElementById("add-item").onclick = async () => {
             const { value: formValues } = await showAssetForm('➕ เพิ่มรายการครุภัณฑ์ใหม่', '', '', 'เพิ่มรายการ');
             if (!formValues) return;
             
             try {
                await postAction("DATA", "add", { code: formValues.code, name: formValues.name });
                await showSuccessAndRefresh("เพิ่มรายการสำเร็จ", renderListPage, "กำลังโหลดรายการ...");
            } catch (e) {
                await Swal.fire("ผิดพลาด!", e.message, "error");
            }
        };

        // แก้ไขรายการ
        document.querySelectorAll(".list-update").forEach(btn => {
            btn.onclick = async function () {
                const tr = this.closest("tr");
                const row = tr.dataset.row;
                const code = tr.querySelector(".list-code").innerText.trim();
                const name = tr.querySelector(".list-name").innerText.trim();
                
                const { value: formValues } = await showAssetForm('📝 แก้ไขข้อมูลครุภัณฑ์', code, name, 'บันทึกการแก้ไข');
                if (!formValues) return;

                try {
                    await postAction("DATA", "update", { row, code: formValues.code, name: formValues.name });
                    await showSuccessAndRefresh("แก้ไขสำเร็จ", renderListPage, "กำลังโหลดรายการ...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", e.message, "error");
                }
            };
        });

        // ลบรายการ
        document.querySelectorAll(".list-delete").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการลบ?", text: "ลบรายการนี้ถาวร?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก", confirmButtonColor: '#dc3545'
                });
                if (!confirmResult.isConfirmed) return;
                
                const row = this.closest("tr").dataset.row;
                
                try {
                    await postAction("DATA", "delete", { row });
                    await showSuccessAndRefresh("ลบสำเร็จ", renderListPage, "กำลังโหลดรายการ...");
                } catch (e) {
                    await Swal.fire("ผิดพลาด!", e.message, "error");
                }
            };
        });
    }


    // --- 5.3 หน้า USER ---
    async function renderUserPage() {
        const data = await fetchJSON(URLS.USER);

        // ฟังก์ชันสร้าง Table Row
        const createRow = (u, i) => {
            const row = computeRowFromData(u, i);
            const badgeClass = u["Status"] === 'admin' ? 'bg-danger' : 'bg-info text-dark';
            
            return `<tr data-row="${row}">
                <td class="user-id">${u["ID"] || ""}</td>
                <td class="user-pass text-muted">****</td>
                <td><span class="badge ${badgeClass} user-status">${u["Status"] || ""}</span></td>
                <td class="user-name">${u["name"] || ""}</td>
                <td class="text-center"><button class="btn btn-warning btn-sm up-user">📝</button></td>
                <td class="text-center"><button class="btn btn-danger btn-sm del-user">🗑</button></td>
                <td style="display:none;" class="real-pass">${u["Pass"] || ""}</td>
            </tr>`;
        };

        const html = `
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
                <tbody>
                    ${data.map(createRow).join("")}
                </tbody>
            </table>
            </div>`;

        pageContent.innerHTML = html;

        document.getElementById("refresh-user").onclick = handleRefresh('user', "กำลังโหลดสมาชิก...");

        // === Event Handlers ===

        // เพิ่มสมาชิก
        document.getElementById("add-user").onclick = async () => {
            const { value: formValues } = await showUserForm('➕ เพิ่มสมาชิกใหม่', '', '', 'employee', '', 'เพิ่มสมาชิก');
            if (!formValues) return;
            try {
                await postAction("LOGIN", "addUser", formValues);
                await showSuccessAndRefresh("เพิ่มสมาชิกสำเร็จ", renderUserPage, "กำลังโหลดสมาชิก...");
            } catch (e) { await Swal.fire("ผิดพลาด!", e.message, "error"); }
        };

        // แก้ไขสมาชิก
        document.querySelectorAll(".up-user").forEach(btn => {
            btn.onclick = async function () {
                const tr = this.closest("tr");
                const row = tr.dataset.row;
                const id = tr.querySelector(".user-id").innerText.trim();
                const pass = tr.querySelector(".real-pass").innerText.trim();
                const status = tr.querySelector(".user-status").innerText.trim();
                const name = tr.querySelector(".user-name").innerText.trim();
                
                const { value: formValues } = await showUserForm('📝 แก้ไขสมาชิก', id, pass, status, name, 'บันทึก');
                if (!formValues) return;
                
                try {
                    await postAction("LOGIN", "updateUser", { row, ...formValues });
                    await showSuccessAndRefresh("แก้ไขสำเร็จ", renderUserPage, "กำลังโหลดสมาชิก...");
                } catch (e) { await Swal.fire("ผิดพลาด!", e.message, "error"); }
            };
        });

        // ลบสมาชิก
        document.querySelectorAll(".del-user").forEach(btn => {
            btn.onclick = async function () {
                const confirmResult = await Swal.fire({
                    title: "ยืนยันการลบ?", text: "ลบสมาชิกนี้ถาวร?", icon: "warning",
                    showCancelButton: true, confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก", confirmButtonColor: '#dc3545'
                });
                if (!confirmResult.isConfirmed) return;
                try {
                    const row = this.closest("tr").dataset.row;
                    await postAction("LOGIN", "deleteUser", { row });
                    await showSuccessAndRefresh("ลบสำเร็จ", renderUserPage, "กำลังโหลดสมาชิก...");
                } catch (e) { await Swal.fire("ผิดพลาด!", e.message, "error"); }
            };
        });
    }


  // --- 5.4 หน้า REPORT (ฉบับมีระบบ Preview) ---
async function renderReportPage() {
    const data = await fetchJSON(URLS.SHOW); 

    const createRow = (r) => `
        <tr>
            <td>${r["รหัสครุภัณฑ์"] || ""}</td>
            <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
            <td>${r["ที่เก็บ"] || ""}</td>
            <td><span class="badge bg-secondary">${r["สถานะ"] || ""}</span></td>
            <td>${r["รายละเอียดเพิ่มเติม"] || ""}</td>
        </tr>`;

    const html = `
        <div class="mb-3 text-end">
            <button id="btn-preview" class="btn btn-info text-white">
                <i class="bi bi-eye"></i> 👀 ตรวจสอบรายงานก่อนออกไฟล์
            </button>
        </div>
        <div class="table-responsive">
            <table class="table table-bordered table-striped align-middle">
                <thead class="table-success">
                    <tr>
                        <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สภาพ</th><th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.length > 0 ? data.map(createRow).join("") : '<tr><td colspan="5" class="text-center">ไม่มีข้อมูล</td></tr>'}
                </tbody>
            </table>
        </div>`;

    pageContent.innerHTML = html;

    // เมื่อคลิกปุ่ม Preview
    document.getElementById("btn-preview").onclick = () => {
        if (data.length === 0) return Swal.fire("ไม่พบข้อมูล", "กรุณาเพิ่มข้อมูลก่อนออกรายงาน", "warning");

        // สร้างตารางจำลองสำหรับ Preview ใน SweetAlert
        let previewTable = `
            <div style="font-size: 0.8rem; text-align: left;">
                <p><b>ตัวอย่างข้อมูลที่จะปรากฏในรายงาน (รวม ${data.length} รายการ)</b></p>
                <table class="table table-sm table-bordered">
                    <thead><tr class="table-light"><th>รหัส</th><th>รายการ</th><th>สภาพ</th></tr></thead>
                    <tbody>
                        ${data.slice(0, 5).map(r => `<tr><td>${r["รหัสครุภัณฑ์"]}</td><td>${r["ชื่อครุภัณฑ์"]}</td><td>${r["สถานะ"]}</td></tr>`).join("")}
                        ${data.length > 5 ? '<tr><td colspan="3" class="text-center">... และรายการอื่นๆ ...</td></tr>' : ''}
                    </tbody>
                </table>
                <p class="mt-2 text-danger">* กรุณาเลือกรูปแบบไฟล์ที่ต้องการออกรายงาน</p>
            </div>`;

        Swal.fire({
            title: 'ยืนยันการออกรายงาน',
            html: previewTable,
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '📕 PDF',
            denyButtonText: '📑 Google Doc',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#dc3545', // สีแดงสำหรับ PDF
            denyButtonColor: '#0d6efd',    // สีฟ้าสำหรับ Doc
        }).then(async (result) => {
            let format = "";
            if (result.isConfirmed) format = "pdf";
            else if (result.isDenied) format = "doc";
            else return; // ยกเลิก

            // เริ่มกระบวนการสร้างไฟล์
            generateFile(format);
        });
    };
}

// ฟังก์ชันสำหรับส่งคำสั่งไปที่ Apps Script
async function generateFile(format) {
    Swal.fire({ title: 'กำลังสร้างไฟล์...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const result = await postAction("SHOW", "generateReport", { format: format });
        if (result.ok) {
            Swal.fire({
                title: "สร้างสำเร็จ!",
                html: `<a href="${result.fileURL}" target="_blank" class="btn btn-success w-100">คลิกเพื่อเปิดไฟล์ ${format.toUpperCase()}</a>`,
                icon: "success"
            });
        }
    } catch (e) { Swal.fire("ผิดพลาด!", e.message, "error"); }
}


    // --- 5.5 หน้า MANUAL ---
    function renderManualPage() {
        pageContent.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-header bg-primary text-white"><h4 class="m-0">📘 คู่มือการใช้งาน</h4></div>
                <div class="card-body">
                    <h5 class="text-primary">1. ครุภัณฑ์ที่รอตรวจสอบ (WAIT)</h5>
                    <p class="text-muted ms-3">- ตรวจสอบรายการ เลือกสถานที่/สถานะ แล้วกด <span class="badge bg-success">✔</span> เพื่อบันทึกเข้าสู่รายงาน</p>
                    
                    <h5 class="text-primary mt-4">2. รายการครุภัณฑ์ทั้งหมด (LIST)</h5>
                    <p class="text-muted ms-3">- จัดการฐานข้อมูล เพิ่มรายการใหม่ (➕) หรือแก้ไข/ลบรายการเดิม (📝/🗑)</p>
                    
                    <h5 class="text-primary mt-4">3. จัดการสมาชิก (USER)</h5>
                    <p class="text-muted ms-3">- สำหรับ Admin เพิ่ม (➕) หรือแก้ไข/ลบผู้ใช้งานระบบ (📝/🗑)</p>
                    
                    <h5 class="text-primary mt-4">4. รายงาน (REPORT)</h5>
                    <p class="text-muted ms-3">- ดูประวัติการบันทึกข้อมูล และ Export ไฟล์ Excel</p>
                </div>
            </div>
        `;
    }

});
