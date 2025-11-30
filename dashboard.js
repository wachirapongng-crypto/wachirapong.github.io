/* ======= Sidebar ======== */
function openNav() {
  document.getElementById("mySidebar").style.width = "260px";
  document.getElementById("main").style.marginLeft = "260px";
}
function closeNav() {
  document.getElementById("mySidebar").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
}

/* ====== Template Pages ====== */
const pages = {
  add: `
    <div class="content-box">
      <h2>➕ เพิ่มครุภัณฑ์</h2>
      <label>รหัสครุภัณฑ์</label>
      <input id="add-code" type="text">
      <label>ชื่อครุภัณฑ์</label>
      <input id="add-name" type="text">
      <button onclick="submitAdd()">บันทึก</button>
    </div>
  `,

  edit: `
    <div class="content-box">
      <h2>✏️ แก้ไขรายการครุภัณฑ์</h2>
      <p>ฟังก์ชันนี้จะดึงข้อมูลจาก DATA เพื่อนำมาแก้ไข</p>
      <div id="edit-table"></div>
    </div>
  `,

  wait: `
    <div class="content-box">
      <h2>🕓 รายการรอตรวจสอบ (WAIT)</h2>
      <div id="wait-table"></div>
    </div>
  `,

  list: `
    <div class="content-box">
      <h2>📋 รายการครุภัณฑ์ทั้งหมด (DATA)</h2>
      <div id="list-table"></div>
    </div>
  `,

  report: `
    <div class="content-box">
      <h2>📊 ออกรายงาน</h2>
      <p>อยู่ระหว่างพัฒนา</p>
    </div>
  `,

  user: `
    <div class="content-box">
      <h2>👥 จัดการสมาชิก</h2>
      <p>ระบบ USER พร้อมใช้งานผ่านชีต USER</p>
    </div>
  `
};

/* ===== โหลดหน้า ===== */
function loadPage(p) {
  document.getElementById("page-title").innerHTML = "";
  document.getElementById("page-content").innerHTML = pages[p];

  if (p === "edit") loadEditTable();
  if (p === "wait") loadWaitTable();
  if (p === "list") loadListTable();
}

/* ====== ส่งข้อมูลไป Apps Script ====== */
function submitAdd() {
  const code = document.getElementById("add-code").value.trim();
  const name = document.getElementById("add-name").value.trim();

  if (!code || !name) return alert("กรุณากรอกข้อมูลให้ครบ");

  google.script.run.withSuccessHandler(res => {
    alert("เพิ่มข้อมูลสำเร็จ");
    loadPage("list");
  }).addEquipment({ code, name });
}

/* ===== โหลดตาราง EDIT ===== */
function loadEditTable() {
  google.script.run.withSuccessHandler(data => {
    const rows = data.data.map(r => `<tr>
        <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
        <td>
          <button onclick="editItem('${r[1]}')">แก้ไข</button>
        </td>
    </tr>`).join("");

    document.getElementById("edit-table").innerHTML = `
      <table class="dash-table">
        <tr><th>ลำดับ</th><th>รหัส</th><th>ชื่อ</th><th>จัดการ</th></tr>
        ${rows}
      </table>`;
  }).getAllSheets();
}

/* ===== WAIT → LOG ===== */
function loadWaitTable() {
  google.script.run.withSuccessHandler(data => {
    const rows = data.wait.map(r => `<tr>
        <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
        <td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td>
        <td><button onclick="approveWait('${r[0]}')">✔ บันทึก</button></td>
    </tr>`).join("");

    document.getElementById("wait-table").innerHTML = `
      <table class="dash-table">
        <tr>
          <th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th>
          <th>สถานะ</th><th>วันที่</th><th>เวลา</th>
          <th>จัดการ</th>
        </tr>
        ${rows}
      </table>`;
  }).getAllSheets();
}

function approveWait(id) {
  google.script.run.withSuccessHandler(res => {
    alert(res.message);
    loadWaitTable();
  }).moveWaitToLog(id);
}

/* ===== LIST DATA ===== */
function loadListTable() {
  google.script.run.withSuccessHandler(data => {
    const rows = data.data.map(r => `<tr>
        <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
        <td>${r[3]}</td><td>${r[4]}</td>
    </tr>`).join("");

    document.getElementById("list-table").innerHTML = `
      <table class="dash-table">
        <tr>
          <th>ลำดับ</th><th>รหัส</th><th>ชื่อ</th>
          <th>Barcode</th><th>QR</th>
        </tr>
        ${rows}
      </table>`;
  }).getAllSheets();
}
