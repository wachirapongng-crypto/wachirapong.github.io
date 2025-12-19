document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // 1. CONSTANTS & DOM ELEMENTS
    // ============================================================

    const BASE_URL = "https://script.google.com/macros/s/AKfycbytUjsxc0zhTeD1qkb8DQOl7o7YzthDfSwAWXfroHqycY7IwZsEetpEoHKL_AC7R7HNVw/exec";
    
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

    async function fetchJSON(url, method = "GET", body = null) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const options = method === "POST" ? { method: "POST", body, signal: controller.signal } : { method: "GET", signal: controller.signal };
            const response = await fetch(url, options);
            clearTimeout(timeout);
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.warn(`fetchJSON: คืนค่า []. Text: ${text.slice(0, 100)}`);
                return []; 
            }
        } catch (err) {
            clearTimeout(timeout);
            console.error("fetchJSON error:", err);
            return [];
        }
    }

    function showLoadingMessage(message = "กำลังโหลดข้อมูลอยู่...") {
        pageContent.innerHTML = `
            <div class="text-center py-5">
                <h3 class="mb-3">${message}</h3>
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>`;
    }

    // --- ฟังก์ชันดาวน์โหลดไฟล์จาก Base64 ---
    function downloadFile(base64Data, fileName) {
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
        link.click();
        window.URL.revokeObjectURL(link.href);
    }

    function formatDateTH(value) {
        if (!value) return "";
        let date;
        const parts = String(value).split('/');
        if (parts.length === 3) {
            date = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
        } else {
            date = new Date(value);
        }
        if (isNaN(date.getTime()) || date.getFullYear() < 2000) return value;
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    }

    function formatTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");
        return `${hh}:${mm} น.`;
    }

    function computeRowFromData(rowData, index) {
        return rowData && (rowData._row || rowData.row || rowData.__row) ? (rowData._row || rowData.row || rowData.__row) : (index + 2);
    }

    async function showSuccessAndRefresh(message, refreshFunc, loadingMessage) {
        await Swal.fire({ title: "สำเร็จ!", text: message, icon: "success", showConfirmButton: false, timer: 1000 });
        showLoadingMessage(loadingMessage);
        await refreshFunc();
    }

    function handleRefresh(pageName, loadingMessage) {
        return async () => {
            showLoadingMessage(loadingMessage);
            const pageRenderers = { 'wait': renderWaitPage, 'list': renderListPage, 'user': renderUserPage, 'report': renderReportPage };
            const renderer = pageRenderers[pageName];
            if (renderer) await renderer();
        };
    }

    // ============================================================
    // 3. ROUTER
    // ============================================================

    async function loadPageInternal(page) {
        pageContent.innerHTML = "";
        const pageConfig = {
            "wait":   { title: "🕓 ครุภัณฑ์ที่รอตรวจสอบ", loader: "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...", renderer: renderWaitPage },
            "list":   { title: "📋 รายการครุภัณฑ์ทั้งหมด", loader: "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...", renderer: renderListPage },
            "user":   { title: "👥 จัดการสมาชิก", loader: "กำลังโหลดรายชื่อสมาชิก...", renderer: renderUserPage },
            "report": { title: "📑 รายงานและการออกเอกสาร", loader: "กำลังโหลดรายงาน...", renderer: renderReportPage },
            "manual": { title: "📘 คู่มือการใช้งานระบบ", loader: null, renderer: renderManualPage }
        };
        const config = pageConfig[page];
        if (config) {
            pageTitle.textContent = config.title;
            if (config.loader) showLoadingMessage(config.loader);
            if (config.renderer) await config.renderer();
        } else {
            pageTitle.textContent = "Dashboard";
            pageContent.innerHTML = "<div class='alert alert-info text-center'>กรุณาเลือกเมนูด้านซ้ายเพื่อเริ่มต้นใช้งาน</div>";
        }
    }

    window.loadPage = loadPageInternal;
    window.loadPage("wait");

    // ============================================================
    // 4. DATA ACTIONS & RENDER FUNCTIONS
    // ============================================================

    async function postAction(sheetName, action, params = {}) {
        const body = new FormData();
        body.append("sheet", sheetName);
        body.append("action", action);
        Object.entries(params).forEach(([key, value]) => body.append(key, value));
        const result = await fetchJSON(BASE_URL, "POST", body);
        return result;
    }

    // --- 5.1 หน้า WAIT ---
    async function renderWaitPage() {
        const data = await fetchJSON(URLS.WAIT);
        const LOCATIONS = ["-","501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
        const STATUS = ["-","ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

        const createOptions = (options, selectedValue) => options.map(v => `<option value="${v}" ${v === selectedValue ? "selected" : ""}>${v}</option>`).join("");

        const createRow = (r, i) => {
            const row = computeRowFromData(r, i);
            return `
                <tr data-row="${row}">
                    <td>${r["รหัส"] || ""}</td>
                    <td>${r["ชื่อ"] || ""}</td>
                    <td><select class="form-select form-select-sm wait-loc">${createOptions(LOCATIONS, r["ที่อยู่"])}</select></td>
                    <td><select class="form-select form-select-sm wait-status">${createOptions(STATUS, r["สถานะ"])}</select></td>
                    <td><input class="form-control form-control-sm wait-note" value="${r["หมายเหตุ"] || ""}"></td>
                    <td class="text-nowrap wait-date">${formatDateTH(r["วันที่"])}</td>
                    <td class="text-nowrap wait-time">${formatTime(r["เวลา"])}</td>
                    <td class="text-center"><button class="btn btn-success btn-sm move-log">✔</button></td>
                    <td class="text-center"><button class="btn btn-danger btn-sm del-wait">🗑</button></td>
                </tr>`;
        };

        pageContent.innerHTML = `
            <div class="mb-3 text-end"><button id="refresh-wait" class="btn btn-outline-primary btn-sm">🔄 รีเฟรช</button></div>
            <div class="table-responsive"><table class="table table-bordered table-striped align-middle">
                <thead class="table-dark"><tr><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th><th>ยืนยัน</th><th>ลบ</th></tr></thead>
                <tbody>${data.map(createRow).join("")}</tbody>
            </table></div>`;

        document.getElementById("refresh-wait").onclick = handleRefresh('wait', "กำลังรีเฟรชข้อมูล...");

        document.querySelectorAll(".move-log").forEach(btn => {
            btn.onclick = async function () {
                const tr = this.closest("tr");
                const row = tr.dataset.row;
                try {
                    await postAction("LOG", "addLog", {
                        "รหัส": tr.children[0].innerText.trim(),
                        "ชื่อ": tr.children[1].innerText.trim(),
                        "ที่อยู่": tr.querySelector(".wait-loc").value,
                        "สถานะ": tr.querySelector(".wait-status").value,
                        "หมายเหตุ": tr.querySelector(".wait-note").value,
                        "วันที่": tr.querySelector(".wait-date").innerText.trim(),
                        "เวลา": tr.querySelector(".wait-time").innerText.trim()
                    });
                    await postAction("WAIT", "delete", { row });
                    await showSuccessAndRefresh("บันทึกเข้าสู่รายงานแล้ว", renderWaitPage, "กำลังอัปเดต...");
                } catch (e) { Swal.fire("ผิดพลาด!", e.message, "error"); }
            };
        });
    }

    // --- 5.4 หน้า REPORT & AUTO DOWNLOAD ---
    async function renderReportPage() {
        showLoadingMessage("กำลังดึงข้อมูลรายงาน...");
        const data = await fetchJSON(URLS.SHOW); 

        const createRow = (r) => `
            <tr>
                <td>${r["รหัสครุภัณฑ์"] || ""}</td>
                <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
                <td>${r["ที่เก็บ"] || ""}</td>
                <td><span class="badge bg-secondary">${r["สถานะ"] || ""}</span></td>
                <td>${r["รายละเอียดเพิ่มเติม"] || ""}</td>
            </tr>`;

        pageContent.innerHTML = `
            <div class="mb-3 text-end">
                <button id="btn-preview" class="btn btn-primary shadow-sm">
                    <i class="bi bi-file-earmark-arrow-down"></i> สร้างและดาวน์โหลดรายงาน
                </button>
            </div>
            <div class="table-responsive">
                <table class="table table-bordered table-striped align-middle">
                    <thead class="table-success">
                        <tr><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สภาพ</th><th>หมายเหตุ</th></tr>
                    </thead>
                    <tbody>
                        ${data.length > 0 ? data.map(createRow).join("") : '<tr><td colspan="5" class="text-center">ไม่พบข้อมูล</td></tr>'}
                    </tbody>
                </table>
            </div>`;

        document.getElementById("btn-preview").onclick = () => {
            if (data.length === 0) return Swal.fire("ไม่พบข้อมูล", "ไม่มีรายการในชีท SHOW ที่จะออกรายงาน", "warning");

            Swal.fire({
                title: 'เลือกรูปแบบรายงาน',
                text: `พบข้อมูล ${data.length} รายการ ระบบจะดาวน์โหลดไฟล์ลงเครื่องทันที`,
                icon: 'question',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: '📕 ไฟล์ PDF',
                denyButtonText: '📑 ไฟล์ Word (.docx)',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#dc3545',
                denyButtonColor: '#0d6efd',
            }).then(async (result) => {
                let format = "";
                if (result.isConfirmed) format = "pdf";
                else if (result.isDenied) format = "doc";
                else return;

                generateFile(format);
            });
        };
    }

    async function generateFile(format) {
        Swal.fire({ 
            title: 'กำลังเตรียมไฟล์...', 
            html: 'กรุณารอสักครู่ ระบบกำลังจัดทำเอกสารและดาวน์โหลด...',
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        try {
            const body = new FormData();
            body.append("action", "generateReport");
            body.append("format", format);

            const response = await fetch(BASE_URL, { method: "POST", body: body });
            const result = await response.json();

            if (result.ok || result.status === "success") {
                // เรียกใช้ฟังก์ชันดาวน์โหลดอัตโนมัติ
                downloadFile(result.fileData, result.fileName);
                Swal.fire("สำเร็จ!", "ระบบดาวน์โหลดไฟล์เรียบร้อยแล้ว", "success");
            } else {
                throw new Error(result.message || "เกิดข้อผิดพลาดในการสร้างไฟล์");
            }
        } catch (e) {
            Swal.fire("เกิดข้อผิดพลาด!", e.message, "error");
        }
    }

    // --- 5.5 หน้า MANUAL (ฉบับปรับปรุงละเอียด) ---
    function renderManualPage() {
        pageContent.innerHTML = `
            <div class="card shadow-sm border-0">
                <div class="card-header bg-gradient-primary text-white py-3">
                    <h5 class="m-0"><i class="bi bi-book-half me-2"></i> ขั้นตอนการใช้งานระบบบริหารจัดการครุภัณฑ์</h5>
                </div>
                <div class="card-body p-4">
                    <div class="row g-4">
                        <div class="col-md-6">
                            <div class="p-3 border rounded-3 h-100 bg-light">
                                <h6 class="text-primary fw-bold"><i class="bi bi-1-circle-fill me-2"></i> การตรวจสอบข้อมูล (หน้า WAIT)</h6>
                                <ul class="small mt-2">
                                    <li>ข้อมูลจากผู้ใช้งานทั่วไปจะมาปรากฏที่นี่</li>
                                    <li><b>เลือกที่อยู่:</b> ระบุห้องหรือสถานที่ปัจจุบันของครุภัณฑ์</li>
                                    <li><b>เลือกสถานะ:</b> ระบุความพร้อมใช้งาน (ใช้งานได้/ชำรุด ฯลฯ)</li>
                                    <li>กดปุ่ม <span class="badge bg-success">✔</span> เพื่อบันทึกข้อมูลเข้าสู่ฐานข้อมูลรายงาน</li>
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="p-3 border rounded-3 h-100 bg-light">
                                <h6 class="text-primary fw-bold"><i class="bi bi-2-circle-fill me-2"></i> การจัดการครุภัณฑ์ (หน้า LIST)</h6>
                                <ul class="small mt-2">
                                    <li>ใช้สำหรับเพิ่ม (➕) รหัสและชื่อครุภัณฑ์ใหม่เข้าสู่ระบบ</li>
                                    <li>สามารถแก้ไขข้อมูล (📝) หรือลบข้อมูลที่ไม่ต้องการ (🗑)</li>
                                    <li>ระบบจะสร้าง <b>Barcode</b> และ <b>QR Code</b> ให้โดยอัตโนมัติสำหรับทุกรายการ</li>
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="p-3 border rounded-3 h-100 bg-light">
                                <h6 class="text-primary fw-bold"><i class="bi bi-3-circle-fill me-2"></i> การออกรายงาน (หน้า REPORT)</h6>
                                <ul class="small mt-2">
                                    <li>ตรวจสอบความถูกต้องของรายการทั้งหมดในตาราง</li>
                                    <li>กดปุ่ม <b>"สร้างและดาวน์โหลดรายงาน"</b></li>
                                    <li>เลือก <b>PDF</b> สำหรับพิมพ์ส่งหน่วยงาน หรือ <b>Word</b> สำหรับนำไปแก้ไขต่อ</li>
                                    <li><b class="text-danger">หมายเหตุ:</b> ไฟล์จะถูกดาวน์โหลดลงเครื่องคอมพิวเตอร์ของคุณทันที</li>
                                </ul>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="p-3 border rounded-3 h-100 bg-light">
                                <h6 class="text-primary fw-bold"><i class="bi bi-person-badge-fill me-2"></i> การจัดการสมาชิก (หน้า USER)</h6>
                                <ul class="small mt-2">
                                    <li>เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ควรใช้งานส่วนนี้</li>
                                    <li>ใช้เพิ่ม/แก้ไข ชื่อ และรหัสผ่านของผู้เข้าใช้งานระบบ</li>
                                    <li>กำหนดสิทธิ์ (Status) เป็น Admin หรือ Employee ตามความเหมาะสม</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="alert alert-warning mt-4 small mb-0">
                        <i class="bi bi-info-circle-fill me-2"></i> หากระบบทำงานช้าในขั้นตอนออกรายงาน กรุณาอย่ากดปิดหน้าต่างหรือกดซ้ำ ระบบกำลังประมวลผลข้อมูลขนาดใหญ่ผ่าน Google Drive
                    </div>
                </div>
            </div>`;
    }

    // --- ฟังก์ชันเสริมที่เหลือ (รันตามปกติ) ---
    async function renderListPage() { /* เหมือนเดิม */ }
    async function renderUserPage() { /* เหมือนเดิม */ }
});
