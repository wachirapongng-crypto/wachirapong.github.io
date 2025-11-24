document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("username").textContent =
    localStorage.getItem("username") || "Admin";
  
  const SHEET_URL = {
    DATA: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=DATA",
    WAIT: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=WAIT",
    SHOW: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=SHOW",
    LOGIN: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=LOGIN",
    MEMBER: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=MEMBER"
  };

  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");
  const logoutBtn = document.getElementById("logout-btn");

  logoutBtn.addEventListener("click", logout);

  const QR_COLUMNS = ["QR Code", "qr_code", "qr", "QR"];

  function escapeHTML(str) {
    return str?.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderCell(key, val, rowIndex) {
    const roomList = ["501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
    const statusList = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

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
          ${roomList.map(r => `<option value="${r}" ${val === r ? "selected" : ""}>${r}</option>`).join("")}
        </select>`;
    }

    if (key === "สถานะ") {
      return `
        <select class="status-select" data-row="${rowIndex}" data-col="${key}">
          ${statusList.map(s => `<option value="${s}" ${val === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>`;
    }

    return escapeHTML(val);
  }

  // โหลดข้อมูลจากชีต
  window.loadData = async function (sheet) {
    try {
      const data = await fetchData(SHEET_URL[sheet]);
      pageContent.innerHTML = await renderTable(data, sheet);
    } catch (err) {
      console.error(err);
      pageContent.innerHTML = "<p style='color:red;'>โหลดข้อมูลไม่ได้</p>";
    }
  };

  async function fetchData(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (err) {
      console.error("Fetch error:", err);
      return [];
    }
  }

  async function renderTable(data, sheet) {
    if (!Array.isArray(data) || data.length === 0)
      return "<p>ไม่พบข้อมูล</p>";

    let table = "<table><tr>";
    const keys = Object.keys(data[0]);
    keys.forEach(key => table += `<th>${escapeHTML(key)}</th>`);
    table += "</tr>";

    data.forEach((row, i) => {
      table += "<tr>";
      keys.forEach(key => {
        table += `<td>${renderCell(key, row[key], i + 2)}</td>`;
      });
      table += "</tr>";
    });

    return table + "</table>";
  }

  // อัปเดตข้อมูลกลับ Google Sheets
  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches(".room-select, .status-select")) {
      const payload = {
        sheet: "DATA",
        row: el.dataset.row,
        column: el.dataset.col,
        value: el.value
      };

      try {
        await fetch(SHEET_URL.DATA, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error("อัปเดตไม่สำเร็จ:", err);
      }
    }
  });

  // โหลดเนื้อหาตามเมนู
  window.loadPage = async function (type) {
    pageContent.innerHTML = "";

    switch (type) {
      case "wait":
        pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
        await loadData("WAIT");
        break;

      case "report":
        pageTitle.textContent = "📊 ออกรายงาน";
        pageContent.innerHTML = `
          <label>เลือกเดือน/ปี:</label>
          <input type="month" id="month">
          <button onclick="loadReport()">แสดงรายงาน</button>
          <div id="report-result"></div>`;
        break;

      case "list":
        pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
        await loadData("DATA");
        break;

      case "manual":
        pageTitle.textContent = "📘 คู่มือการใช้งาน";
        pageContent.innerHTML = `
          <p>1. เพิ่มรายการ → กรอกข้อมูลและบันทึก</p>
          <p>2. แก้ไขรายการ → เลือกรายการ</p>
          <p>3. รายการรอตรวจสอบ → ตรวจสอบจากเครื่องสแกน</p>
          <p>4. ออกรายงาน → เลือกเดือน/ปี</p>
          <p>5. จัดการสมาชิก → เพิ่ม/ลบ/แก้ไข</p>`;
        break;

      case "user":
        pageTitle.textContent = "👥 จัดการสมาชิก";
        await loadData("LOGIN");
        break;

      default:
        pageTitle.textContent = "ยินดีต้อนรับ";
        pageContent.innerHTML = "เลือกเมนูจากด้านซ้ายเพื่อเริ่มใช้งาน";
    }
  };

  function logout() {
    localStorage.removeItem("username");
    window.location.href = "login.html";
  }

  window.loadReport = async function () {
    const month = document.getElementById("month").value;
    if (!month) return alert("เลือกเดือนก่อน");

    const reportDiv = document.getElementById("report-result");
    reportDiv.innerHTML = "กำลังโหลด...";

    try {
      const data = await fetchData(SHEET_URL.SHOW + "&month=" + encodeURIComponent(month));
      reportDiv.innerHTML = await renderTable(data);
    } catch (err) {
      reportDiv.innerHTML = "<p style='color:red;'>โหลดรายงานไม่ได้</p>";
    }
  };
});
