const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const sheetName = "WAIT";
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

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

async function loadDetail() {
  const container = document.getElementById("detail");
  if (!container) return;

  try {
    const res = await fetch(baseURL);
    const text = await res.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
    if (!match) throw new Error("response ผิดรูปแบบ");

    const json = JSON.parse(match[1]);
    const rows = json.table.rows.map(r => (r.c || []).map(c => c ? c.v : ""));

    // สร้างแถวทั้งหมด
    const tableRows = rows.map(r => `
      <tr>
        <td>${escapeHtml(r[0])}</td>
        <td>${escapeHtml(r[1])}</td>
        <td>${escapeHtml(r[2])}</td>
        <td>${escapeHtml(r[3])}</td>
        <td>${formatDateCell(r[4])}</td>
        <td>${formatTimeCell(r[5])}</td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div class="asset-table">
        <h3>ข้อมูลทั้งหมดจาก WAIT</h3>
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th>ที่อยู่</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>เวลา</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="notfound">โหลดข้อมูลล้มเหลว: ${escapeHtml(err.message)}</div>`;
  }
}

loadDetail();
