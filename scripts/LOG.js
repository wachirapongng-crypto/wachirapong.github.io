// ตั้งชื่อไฟล์: LOG.js (ตามที่คุณต้องการ)

const params = new URLSearchParams(window.location.search);
const id = params.get("id"); // รหัสครุภัณฑ์ที่ส่งมา
const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const sheetName = "LOG"; // ชีตที่เก็บประวัติการตรวจสอบ
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

// --- Utility Functions ---

function pad(n){ return String(n).padStart(2,'0'); }

function formatDateCell(val){
    if (!val) return "-";
    const m = String(val).match(/Date\(([^)]+)\)/);
    if (m) {
      const [y, mo, d] = m[1].split(',').map(Number);
      return `${pad(d)}/${pad(mo+1)}/${y}`;
    }
    const t = Date.parse(val);
    if (!isNaN(t)) {
      const d = new Date(t);
      return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
    }
    return val;
}

function formatTimeCell(val){
    if (!val) return "-";
    const m = String(val).match(/Date\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(Number);
      if (parts.length >= 6) return `${pad(parts[3])}:${pad(parts[4])}`;
    }
    const t = String(val).match(/(\d{1,2}):(\d{2})/);
    if (t) return `${pad(t[1])}:${pad(t[2])}`;
    return val;
}

function escapeHtml(str){
    if (str == null) return "";
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'", "&#39;");
}

// Helper function เพื่อกำหนด Class สีสถานะของ Bootstrap (เหมือน Show.js)
function getStatusBadgeClass(status) {
    const s = (status || "").toLowerCase().trim();
    if (s.includes("ใช้งานได้")) return "bg-success"; 
    if (s.includes("ชำรุด")) return "bg-danger";
    if (s.includes("เสื่อมสภาพ")) return "bg-danger";
    if (s.includes("ซ่อม") || s.includes("ส่งซ่อม")) return "bg-warning text-dark";
    return "bg-secondary";
}

// --- Main Logic ---

async function loadDetail() {
    const container = document.getElementById("detail");

    if (!id) {
        // 💡 ใช้ alert ของ Bootstrap
        container.innerHTML = `<div class="alert alert-danger text-center"><i class="bi bi-exclamation-triangle-fill"></i> ไม่พบรหัสครุภัณฑ์ใน URL</div>`;
        return;
    }

    try {
        const res = await fetch(baseURL);
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
        if (!match) throw new Error("response ผิดรูปแบบ");

        const json = JSON.parse(match[1]);
        if (!json.table || !json.table.rows) throw new Error("ข้อมูลตารางไม่ถูกต้อง");

        // [0:รหัส, 1:ชื่อ, 2:ที่เก็บ, 3:สถานะ, 4:รายละเอียด, 5:วันที่, 6:เวลา]
        const rows = json.table.rows.map(r => (r.c||[]).map(c => c ? c.v : ""));

        // กรองหาประวัติของรหัสครุภัณฑ์ที่ต้องการ
        const logs = rows.filter(r => String(r[0]) === String(id));

        if (logs.length === 0) {
            // 💡 ใช้ alert ของ Bootstrap
            container.innerHTML = `<div class="alert alert-warning text-center"><i class="bi bi-search"></i> ไม่พบประวัติสำหรับรหัส: <b>${escapeHtml(id)}</b></div>`;
            return;
        }

        const [code, name, , , , , ] = logs[0]; // ดึงข้อมูลหลักจากแถวแรก

        // สร้างแถวตารางประวัติ (ใช้ Bootstrap Class)
        const tableRows = logs.map(r => {
            const status = escapeHtml(r[3]);
            const statusClass = getStatusBadgeClass(r[3]);

            return `
                <tr>
                    <td class="text-nowrap">${formatDateCell(r[5])}</td>
                    <td class="text-nowrap">${formatTimeCell(r[6])}</td>
                    <td>${escapeHtml(r[2])}</td>
                    <td><span class="badge ${statusClass}">${status}</span></td>
                    <td>${escapeHtml(r[4])}</td>
                </tr>
            `;
        }).join("");

        // Render ผลลัพธ์สุดท้าย (ใช้ Bootstrap Class)
        container.innerHTML = `
            <h2 class="h4 text-primary mb-4">
                <i class="bi bi-tag"></i> ประวัติ: ${escapeHtml(id)} - ${escapeHtml(name)}
            </h2>

            <div class="row mb-4 g-3">
                <div class="col-md-6">
                    <div class="p-3 bg-light rounded shadow-sm">
                        <p class="mb-1 text-muted small">รหัสครุภัณฑ์:</p>
                        <p class="lead fw-bold mb-0">${escapeHtml(code)}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-3 bg-light rounded shadow-sm">
                        <p class="mb-1 text-muted small">ชื่อครุภัณฑ์:</p>
                        <p class="lead fw-bold mb-0">${escapeHtml(name)}</p>
                    </div>
                </div>
            </div>

            <h3 class="h5 mb-3 mt-4 text-secondary"><i class="bi bi-clock-history"></i> รายการประวัติการตรวจสอบ (${logs.length} ครั้ง)</h3>
            
            <div class="table-responsive">
                <table class="table table-bordered table-striped table-hover align-middle">
                    <thead class="table-primary">
                        <tr>
                            <th>วันที่</th>
                            <th>เวลา</th>
                            <th>ที่เก็บ</th>
                            <th>สถานะ</th>
                            <th>รายละเอียดเพิ่มเติม</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>`;

    } catch (err) {
        console.error(err);
        // 💡 ใช้ alert ของ Bootstrap
        container.innerHTML = `<div class="alert alert-danger text-center"><i class="bi bi-x-octagon"></i> โหลดข้อมูลล้มเหลว: ${escapeHtml(err.message)}</div>`;
    }
}

loadDetail();
