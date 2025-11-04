const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const sheetName = "SHOW";
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${sheetName}&t=${Date.now()}`;

const tableBody = document.querySelector("#equipmentTable tbody");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const modalDetails = document.getElementById("modalDetails");
const errorBox = document.getElementById("errorBox");
const debugBox = document.getElementById("debugBox");

let data = [];

// ✅ parse GViz JSON
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
    errorBox.textContent = "";
  } catch (error) {
    console.error("❌ โหลดข้อมูลไม่สำเร็จ:", error);
    tableBody.innerHTML = `<tr><td colspan="5" style="color:red;">โหลดข้อมูลล้มเหลว</td></tr>`;
    errorBox.textContent = "❌ " + error.message;
    debugBox.style.display = "block";
  }
}

// ✅ แสดงผลตาราง
function renderTable(filteredData = data) {
  tableBody.innerHTML = filteredData
    .map(
      (e, index) => `
      <tr>
        <td>${escapeHtml(e.code)}</td>
        <td>${escapeHtml(e.name)}</td>
        <td>${escapeHtml(e.location)}</td>
        <td>${escapeHtml(e.status)}</td>
        <td>
          <button class="detail-btn" onclick="location.href='detail.html?id=${encodeURIComponent(e.code)}'">
            ดูประวัติ
          </button>
        </td>
      </tr>
    `
    )
    .join("");
}

// ✅ escape HTML ป้องกัน XSS
function escapeHtml(str) {
  if (typeof str !== "string") return str ?? "";
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ✅ Modal handlers
closeModal.onclick = () => (modal.style.display = "none");
window.onclick = e => {
  if (e.target === modal) modal.style.display = "none";
};

// ✅ Search filter
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
