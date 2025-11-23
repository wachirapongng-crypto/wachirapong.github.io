const API_URL = "https://script.google.com/macros/s/AKfycbxI8jIFzs3kmAywUhjeQbSslBZRZdeXl-LI-iqDU-CKV5sUyTLWxgYbhXoWsJpEqXNg/exec"; // ใส่ URL ของ Web App ที่ Deploy
const addresses = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
const statuses = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

async function loadDetail() {
  const container = document.getElementById("detail");
  try {
    const res = await fetch(`${API_URL}?sheet=WAIT`);
    const rows = await res.json();

    if (!rows.length) {
      container.innerHTML = "ไม่มีข้อมูล";
      return;
    }

    const tableRows = rows.map(r => `
      <tr>
        <td>${r["รหัส"]}</td>
        <td>${r["ชื่อ"]}</td>
        <td>
          <select id="addr-${r["รหัส"]}">
            ${addresses.map(a => `<option value="${a}" ${r["ที่อยู่"]===a?"selected":""}>${a}</option>`).join("")}
          </select>
        </td>
        <td>
          <select id="status-${r["รหัส"]}">
            ${statuses.map(s => `<option value="${s}" ${r["สถานะ"]===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </td>
        <td>${r["วันที่"] || "-"}</td>
        <td>${r["เวลา"] || "-"}</td>
        <td>
          <button onclick="updateRow('${r["รหัส"]}')">อัปเดต</button>
          <button onclick="deleteRow('${r["รหัส"]}')">ลบ</button>
        </td>
      </tr>
    `).join("");

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>รหัส</th>
            <th>ชื่อ</th>
            <th>ที่อยู่</th>
            <th>สถานะ</th>
            <th>วันที่</th>
            <th>เวลา</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = "โหลดข้อมูลล้มเหลว: " + err.message;
  }
}

async function updateRow(id) {
  const address = document.getElementById(`addr-${id}`).value;
  const status  = document.getElementById(`status-${id}`).value;

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "updateToLog", ID: id, address, status })
  });

  refreshData();
}

async function deleteRow(id) {
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "deleteFromWait", ID: id })
  });

  refreshData();
}

function refreshData() {
  loadDetail();
}

loadDetail();

