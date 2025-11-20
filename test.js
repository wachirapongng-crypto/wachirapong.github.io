document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("username").textContent =
    localStorage.getItem("username") || "Admin";

  // ================================
  // ⚡ URL Google Sheets
  // ================================
  const SHEET_URL = {
    DATA: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=DATA",
    WAIT: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=WAIT",
    SHOW: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=SHOW",
    LOGIN: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=LOGIN",
    MEMBER: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=MEMBER"
  };

  const formSection = document.getElementById("form-section");
  const formTitle = document.getElementById("form-title");
  const formContent = document.getElementById("form-content");
  const closeBtn = document.querySelector(".close-btn");
  const logoutBtn = document.getElementById("logout-btn");

  closeBtn.addEventListener("click", closeForm);
  formSection.addEventListener("click", (e) => {
    if (e.target === formSection) closeForm();
  });
  logoutBtn.addEventListener("click", logout);

  const QR_COLUMNS = ["QR Code", "qr_code", "qr", "QR"];


  // ================================
  // ⚡ Helper: HTML Escape
  // ================================
  function escapeHTML(str) {
    return str?.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ================================
  // ⚡ Render Cell
  // ================================
  function renderCell(key, val, rowIndex) {
    const roomList = [
      "501", "502", "503",
      "401", "401A", "401B", "401C",
      "402", "403", "404", "405",
      "ห้องพักครู", "301", "302"
    ];
    const statusList = [
      "ใช้งานได้", "ชำรุด", "เสื่อมสภาพ",
      "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"
    ];

    if (typeof val === "object" && val !== null) {
      if (val.v) val = val.v;
      else return JSON.stringify(val);
    }

    if (QR_COLUMNS.includes(key) && val) {
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(val)}">`;
    }

    if (key === "ที่อยู่") {
      return `
        <select class="room-select" data-row="${rowIndex}" data-col="${key}">
          ${roomList.map(r => `<option ${r === val ? "selected" : ""}>${r}</option>`).join("")}
        </select>`;
    }

    if (key === "สถานะ") {
      return `
        <select class="status-select" data-row="${rowIndex}" data-col="${key}">
          ${statusList.map(s => `<option ${s === val ? "selected" : ""}>${s}</option>`).join("")}
        </select>`;
    }

    return escapeHTML(val);
  }

  // ================================
  // ⚡ Load Data
  // ================================
  window.loadData = async function (sheet) {
    try {
      const data = await fetchData(SHEET_URL[sheet]);
      formContent.innerHTML = await renderTable(data, sheet);
    } catch {
      formContent.innerHTML = "<p style='color:red;'>ไม่สามารถโหลดข้อมูล JSON ได้</p>";
    }
  };


  async function fetchData(url) {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch {
      return [];
    }
  }

  // ================================
  // ⚡ Render Table
  // ================================
  async function renderTable(data, sheet) {
    if (!Array.isArray(data) || data.length === 0)
      return "<p>ไม่พบข้อมูล</p>";

    let table = "<table><tr>";
    const keys = Object.keys(data[0]);
    keys.forEach(key => (table += `<th>${escapeHTML(key)}</th>`));
    table += "</tr>";

    data.forEach((row, i) => {
      table += "<tr>";
      keys.forEach((key) => {
        table += `<td>${renderCell(key, row[key], i + 2)}</td>`;
      });
      table += "</tr>";
    });

    table += "</table>";
    return table;
  }

  // ================================
  // ⚡ Update to Google Sheet
  // ================================
  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches(".room-select, .status-select")) {
      const payload = {
        sheet: "DATA",
        row: el.dataset.row,
        column: el.dataset.col,
        value: el.value
      };
      await fetch(SHEET_URL.DATA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
  });

  // ================================
  // ⚡ Close Form
  // ================================
  function closeForm() {
    formSection.classList.remove("show");
    formContent.innerHTML = "";
  }

  function logout() {
    localStorage.clear();
    location.href = "login.html";
  }

  // ================================
  // ⚡ รวมฟังก์ชัน openMenu (A + B)
  // ================================
  window.openMenu = function (menu) {
    formSection.classList.add("show");

    switch (menu) {
      case "add":
        formTitle.textContent = "➕ เพิ่มรายการครุภัณฑ์";
        formContent.innerHTML = `
          <p>ฟอร์มเพิ่มข้อมูล (ยังไม่ได้ทำ)</p>
        `;
        break;

      case "edit":
        formTitle.textContent = "✏️ แก้ไขรายการครุภัณฑ์";
        formContent.innerHTML = `
          <p>ฟอร์มแก้ไขข้อมูล (ยังไม่ได้ทำ)</p>
        `;
        break;

      case "wait":
        formTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
        loadData("WAIT");
        break;

      case "report":
        formTitle.textContent = "📊 ออกรายงานครุภัณฑ์";
        formContent.innerHTML = `
          <label>เลือกเดือน/ปี:</label>
          <input type="month" id="month">
          <button onclick="loadReport()">แสดงรายงาน</button>
          <div id="report-result"></div>`;
        break;

      case "list":
        formTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
        loadData("DATA");
        break;

      case "manual":
        formTitle.textContent = "📘 คู่มือการใช้งาน";
        formContent.innerHTML = `<p>ยังไม่เพิ่มคู่มือ</p>`;
        break;

      case "user":
        formTitle.textContent = "👥 จัดการสมาชิก";
        formContent.innerHTML = `<p>ระบบสมาชิก (ยังไม่ได้ทำ)</p>`;
        break;

      default:
        formTitle.textContent = "เมนูไม่พบ";
        formContent.innerHTML = "<p>ไม่มีเมนูนี้</p>";
        break;
    }
  };

}); // END DOMContentLoaded
