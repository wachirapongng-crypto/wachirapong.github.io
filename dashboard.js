/* ============================================================
   dashboard.js — หน้า Dashboard (JS ธรรมดา)
   ============================================================ */

// ======================= CONFIG ===========================
const BASE_URL = "https://script.google.com/macros/s/AKfycbwixv3fvgOqqE1OhJVV0pp7fvqLWXP1clMoMcYvHloVBDm6jBi9LQy4AXf0j8qjxnC6tA/exec"; // ใส่ URL ของ GAS
const roomList = ["501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
const statusList = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];
const userStatusList = ["admin", "employee"];

// ======================= LOADER ===========================
function showLoader() {
  document.getElementById("loader").classList.remove("hide");
}
function hideLoader() {
  document.getElementById("loader").classList.add("hide");
}

// ======================= LOAD PAGE ========================
document.addEventListener("DOMContentLoaded", () => {
  loadPage("wait"); // โหลดหน้า WAIT เป็นค่าเริ่มต้น
});

// ======================= LOAD PAGE FUNCTION =================
async function loadPage(page) {
  showLoader();
  try {
    const res = await fetch(`${BASE_URL}?sheet=${sheetMap(page)}`);
    const data = await res.json();

    switch (page) {
      case "wait": renderWaitPage(data); break;
      case "list": renderListPage(data); break;
      case "manual": renderManualPage(data); break;
      case "report": renderReportPage(data); break;
      case "user": renderUserPage(data); break;
    }
  } catch (err) {
    console.error(err);
    alert(`เกิดข้อผิดพลาดโหลดข้อมูลหน้า ${page}`);
  } finally {
    hideLoader();
  }
}

// ======================= SHEET MAP ========================
function sheetMap(page) {
  switch (page) {
    case "wait": return "WAIT";
    case "list": return "DATA";
    case "manual": return "MANUAL";
    case "report": return "REPORT";
    case "user": return "LOGIN";
    default: return "WAIT";
  }
}

// ======================= WAIT PAGE =========================
function renderWaitPage(data) {
  const tbody = document.getElementById("wait-tbody");
  tbody.innerHTML = "";

  data.forEach((r, idx) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r["รหัส"] || ""}</td>
      <td>${r["ชื่อ"] || ""}</td>
      <td>${selectHTML(roomList, r["ที่อยู่"], "wait-loc")}</td>
      <td>${selectHTML(statusList, r["สถานะ"], "wait-status")}</td>
      <td><input type="text" class="wait-note" placeholder="หมายเหตุ"></td>
      <td>${r["วันที่"] || ""}</td>
      <td>${r["เวลา"] || ""}</td>
    `;

    const btnSave = document.createElement("button");
    btnSave.textContent = "บันทึก";
    btnSave.addEventListener("click", () => saveWaitRow(idx + 2, tr));
    tr.appendChild(btnSave);

    tbody.appendChild(tr);
  });
}

// ======================= LIST PAGE =========================
function renderListPage(data) {
  const tbody = document.getElementById("list-tbody");
  tbody.innerHTML = "";

  data.forEach((r, idx) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r["ลำดับ"] || ""}</td>
      <td>${r["รหัสครุภัณฑ์"] || ""}</td>
      <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
      <td>${r["BarCode"] || ""}</td>
      <td>${r["QR Code"] || ""}</td>
    `;

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "แก้ไข";
    btnEdit.addEventListener("click", () => editListRow(idx + 2, tr));

    const btnDel = document.createElement("button");
    btnDel.textContent = "ลบ";
    btnDel.addEventListener("click", () => deleteRow("DATA", idx + 2, "list"));

    tr.appendChild(btnEdit);
    tr.appendChild(btnDel);

    tbody.appendChild(tr);
  });
}

// ======================= MANUAL PAGE =======================
function renderManualPage(data) {
  // สมมติแค่แสดงข้อมูลแบบ table หรือ input ตามต้องการ
  const tbody = document.getElementById("manual-tbody");
  tbody.innerHTML = JSON.stringify(data, null, 2);
}

// ======================= REPORT PAGE =======================
function renderReportPage(data) {
  const tbody = document.getElementById("report-tbody");
  tbody.innerHTML = JSON.stringify(data, null, 2);
}

// ======================= USER PAGE =========================
function renderUserPage(data) {
  const tbody = document.getElementById("user-tbody");
  tbody.innerHTML = "";

  data.forEach((r, idx) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r["ID"] || ""}</td>
      <td>${r["Pass"] || ""}</td>
      <td>${selectHTML(userStatusList, r["Status"], "user-status")}</td>
      <td>${r["name"] || ""}</td>
    `;

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "แก้ไข";
    btnEdit.addEventListener("click", () => editUserRow(idx + 2, tr));

    const btnDel = document.createElement("button");
    btnDel.textContent = "ลบ";
    btnDel.addEventListener("click", () => deleteRow("LOGIN", idx + 2, "user"));

    tr.appendChild(btnEdit);
    tr.appendChild(btnDel);

    tbody.appendChild(tr);
  });
}

// ======================= HELPER: SELECT HTML ==============
function selectHTML(list, selected, cls) {
  return `<select class="${cls}">${list.map(l => `<option ${l===selected?"selected":""}>${l}</option>`).join("")}</select>`;
}

// ======================= SAVE WAIT ROW =====================
async function saveWaitRow(row, tr) {
  showLoader();
  try {
    const loc = tr.querySelector(".wait-loc").value;
    const status = tr.querySelector(".wait-status").value;
    const note = tr.querySelector(".wait-note").value;
    const code = tr.children[0].textContent;
    const name = tr.children[1].textContent;

    const body = new URLSearchParams();
    body.append("sheet", "LOG");
    body.append("action", "moveWait");
    body.append("row", row);
    body.append("ที่เก็บ", loc);
    body.append("สถานะ", status);
    body.append("รายละเอียดเพิ่มเติม", note);
    body.append("รหัสครุภัณฑ์", code);
    body.append("ชื่อครุภัณฑ์", name);

    await fetch(BASE_URL, { method: "POST", body });
    loadPage("wait");
  } catch (err) {
    console.error(err);
  } finally {
    hideLoader();
  }
}

// ======================= EDIT LIST ROW =====================
async function editListRow(row, tr) {
  showLoader();
  try {
    const code = tr.children[1].textContent;
    const name = tr.children[2].textContent;
    const barcode = tr.children[3].textContent;
    const qrcode = tr.children[4].textContent;

    const body = new URLSearchParams();
    body.append("sheet", "DATA");
    body.append("action", "update");
    body.append("row", row);
    body.append("code", code);
    body.append("name", name);
    body.append("BarCode", barcode);
    body.append("QR Code", qrcode);

    await fetch(BASE_URL, { method: "POST", body });
    loadPage("list");
  } catch (err) { console.error(err); }
  finally { hideLoader(); }
}

// ======================= EDIT USER ROW =====================
async function editUserRow(row, tr) {
  showLoader();
  try {
    const id = tr.children[0].textContent;
    const pass = tr.children[1].textContent;
    const status = tr.querySelector(".user-status").value;
    const name = tr.children[3].textContent;

    const body = new URLSearchParams();
    body.append("sheet", "LOGIN");
    body.append("action", "updateUser");
    body.append("row", row);
    body.append("id", id);
    body.append("pass", pass);
    body.append("status", status);
    body.append("name", name);

    await fetch(BASE_URL, { method: "POST", body });
    loadPage("user");
  } catch (err) { console.error(err); }
  finally { hideLoader(); }
}

// ======================= DELETE ROW ========================
async function deleteRow(sheet, row, page) {
  showLoader();
  try {
    const body = new URLSearchParams();
    body.append("sheet", sheet);
    body.append("action", sheet==="LOGIN"?"deleteUser":"delete");
    body.append("row", row);
    await fetch(BASE_URL, { method: "POST", body });
    loadPage(page);
  } catch (err) { console.error(err); }
  finally { hideLoader(); }
}

// ======================= REFRESH BUTTONS ===================
document.querySelectorAll(".refresh-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    loadPage(page);
  });
});
