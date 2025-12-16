const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const sheetName = "SHOW";
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${sheetName}&t=${Date.now()}`;

const tableBody = document.querySelector("#equipmentTable tbody");
const searchInput = document.getElementById("searchInput");
const errorBox = document.getElementById("errorBox");
const debugBox = document.getElementById("debugBox");

let data = [];

// Helper function เพื่อกำหนด Class สีสถานะของ Bootstrap
function getStatusBadgeClass(status) {
    const s = (status || "").toLowerCase().trim();
    if (s.includes("ใช้งานได้")) return "bg-success"; // สีเขียว
    if (s.includes("ชำรุด") || s.includes("เสื่อมสภาพ")) return "bg-danger"; // สีแดง
    if (s.includes("ซ่อม") || s.includes("ส่งซ่อม")) return "bg-warning text-dark"; // สีเหลือง
    return "bg-secondary"; // สีเทาสำหรับสถานะอื่นๆ
}

// ✅ parse GViz JSON (คงเดิม)
function parseGviz(text) {
  const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
  if (m && m[1]) return JSON.parse(m[1]);

  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      const sub = text.substring(start, end + 1);
      return JSON.parse(sub);
    }
  } catch (e) {}

  throw new Error("ไม่พบข้อมูล JSON ใน response");
}

// ✅ โหลดข้อมูลจาก Google Sheet
async function loadEquipment() {
  // 💡 แสดง error box เป็น 'alert' ของ Bootstrap
  errorBox.style.display = "none";
  errorBox.textContent = "";

  try {
    const res = await fetch(baseURL);
    const text = await res.text();

    debugBox.style.display = "none";
    debugBox.textContent = text.slice(0, 800);

    const json = parseGviz(text);

    if (!json.table || !json.table.rows) {
      throw new Error("รูปแบบข้อมูลจากชีตไม่ถูกต้อง");
    }

    data = json.table.rows.map((r, idx) => ({
      number: r.c[0]?.v ?? "",
      code: r.c[1]?.v ?? "",
      name: r.c[2]?.v ?? "",
      location: r.c[3]?.v ?? "",
      status: r.c[4]?.v ?? "",
      details: r.c[5]?.v ?? "",
      rawRowIndex: idx + 1
    })).filter(d => d.code !== "" || d.name !== "");

    if (data.length === 0) throw new Error("ไม่พบข้อมูลในชีต SHOW");

    renderTable();
    // 💡 ซ่อน error box เมื่อโหลดสำเร็จ
    errorBox.style.display = "none";
  } catch (error) {
    console.error("❌ โหลดข้อมูลไม่สำเร็จ:", error);
    tableBody.innerHTML = `<tr><td colspan="5" class="text-danger">โหลดข้อมูลล้มเหลว</td></tr>`;
    // 💡 แสดง error box ของ Bootstrap
    errorBox.textContent = "❌ " + error.message;
    errorBox.style.display = "block";
    debugBox.style.display = "block";
  }
}

// ✅ แสดงผลตาราง (ปรับปรุงให้ใช้ Bootstrap Class)
function renderTable(filteredData = data) {
  tableBody.innerHTML = filteredData
    .map(
      (e, index) => {
        const statusClass = getStatusBadgeClass(e.status);
        
        return `
          <tr>
            <td class="fw-bold text-primary">${escapeHtml(e.code)}</td>
            <td>${escapeHtml(e.name)}</td>
            <td>${escapeHtml(e.location)}</td>
            <td>
              <span class="badge ${statusClass}">${escapeHtml(e.status)}</span>
            </td>
            <td>
              <button 
                class="btn btn-sm btn-outline-primary" 
                onclick="location.href='detail.html?id=${encodeURIComponent(e.code)}'">
                <i class="bi bi-file-text"></i> ดูประวัติ
              </button>
            </td>
          </tr>
        `;
      }
    )
    .join("");
}

// ✅ escape HTML ป้องกัน XSS (คงเดิม)
function escapeHtml(str) {
  if (typeof str !== "string") return str ?? "";
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ✅ Modal handlers (ลบ Modal handlers เดิมออกเพราะเราใช้ Bootstrap JS)
// Bootstrap จะจัดการการเปิด/ปิด Modal โดยอัตโนมัติผ่าน data-bs-dismiss="modal"

// ✅ Search filter (คงเดิม)
searchInput.addEventListener("input", e => {
  const keyword = e.target.value.trim().toLowerCase();
  const filtered = data.filter(item =>
    (item.code || "").toLowerCase().includes(keyword) ||
    (item.name || "").toLowerCase().includes(keyword) ||
    (item.location || "").toLowerCase().includes(keyword) ||
    (item.status || "").toLowerCase().includes(keyword)
  );
  renderTable(filtered);
});

// ✅ เรียกโหลดข้อมูล
loadEquipment();
