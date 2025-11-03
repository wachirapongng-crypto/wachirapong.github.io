document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("username").textContent =
    localStorage.getItem("username") || "Admin";

  // ✅ URLs ของชีต
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

  function escapeHTML(str) {
    return str?.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ✅ renderCell (เพิ่ม dropdown ที่อยู่/สถานะ)
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
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        val
      )}" alt="QR Code">`;
    }

    if (key === "ที่อยู่") {
      let options = roomList
        .map(
          (room) =>
            `<option value="${room}" ${
              val === room ? "selected" : ""
            }>${room}</option>`
        )
        .join("");
      return `<select class="room-select" data-row="${rowIndex}" data-col="${key}">${options}</select>`;
    }

    if (key === "สถานะ") {
      let options = statusList
        .map(
          (s) =>
            `<option value="${s}" ${
              val === s ? "selected" : ""
            }>${s}</option>`
        )
        .join("");
      return `<select class="status-select" data-row="${rowIndex}" data-col="${key}">${options}</select>`;
    }

    return escapeHTML(val);
  }

  // ✅ โหลดข้อมูลแต่ละชีต
  window.loadData = async function (sheet) {
    try {
      const data = await fetchData(SHEET_URL[sheet]);
      formContent.innerHTML = await renderTable(data, sheet);
    } catch (err) {
      console.error(err);
      formContent.innerHTML =
        "<p style='color:red;'>ไม่สามารถโหลดข้อมูล JSON ได้</p>";
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

  // ✅ สร้างตาราง
  async function renderTable(data, sheet) {
    if (!Array.isArray(data) || data.length === 0)
      return "<p>ไม่พบข้อมูล</p>";

    let table = "<table><tr>";
    const keys = Object.keys(data[0]);
    keys.forEach((key) => (table += `<th>${escapeHTML(key)}</th>`));
    table += "</tr>";

    data.forEach((row, i) => {
      table += "<tr>";
      keys.forEach((key) => {
        table += `<td>${renderCell(key, row[key], i + 2)}</td>`; // +2 เพื่อชดเชย header แถว 1
      });
      table += "</tr>";
    });

    table += "</table>";
    return table;
  }

  // ✅ อัปเดตกลับ Google Sheets
  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches(".room-select, .status-select")) {
      const newValue = el.value;
      const row = el.dataset.row;
      const col = el.dataset.col;
      const payload = {
        sheet: "DATA",
        row,
        column: col,
        value: newValue
      };

      try {
        await fetch(SHEET_URL.DATA, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        console.log("อัปเดตสำเร็จ:", payload);
      } catch (err) {
        console.error("อัปเดตไม่สำเร็จ:", err);
      }
    }
  });

  // ✅ ส่วนเปิดฟอร์ม
  window.openForm = async function (type) {
    formSection.classList.add("show");
    formContent.innerHTML = "";

    switch (type) {
      case "wait":
        formTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
        await loadData("WAIT");
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
        await loadData("DATA");
        break;
      case "manual":
        formTitle.textContent = "📘 คู่มือการใช้งาน";
        formContent.innerHTML = `
          <p>1. เพิ่มรายการครุภัณฑ์ → กรอกข้อมูลและบันทึก</p>
          <p>2. แก้ไขรายการครุภัณฑ์ → เลือกรายการเพื่อแก้ไข</p>
          <p>3. ครุภัณฑ์ที่รอตรวจสอบ → ดูรายการจากเครื่องสแกน</p>
          <p>4. ออกรายงาน → เลือกเดือน/ปี แสดงตารางรายงาน</p>
          <p>5. จัดการสมาชิก → เพิ่ม/ลบ/แก้ไขผู้ใช้ระบบ</p>`;
        break;
      case "user":
        formTitle.textContent = "👥 จัดการสมาชิก";
        await loadData("LOGIN");
        break;
      case "member":
        formTitle.textContent = "📇 รายชื่อสมาชิก";
        await loadData("MEMBER");
        break;
    }
  };

  function closeForm() {
    formSection.classList.remove("show");
  }

  function logout() {
    localStorage.removeItem("username");
    window.location.href = "login.html";
  }

  window.loadReport = async function () {
    const month = document.getElementById("month").value;
    if (!month) {
      alert("กรุณาเลือกเดือน");
      return;
    }
    const reportDiv = document.getElementById("report-result");
    reportDiv.innerHTML = "<p>กำลังโหลดรายงาน...</p>";

    try {
      const url = SHEET_URL.SHOW + "&month=" + encodeURIComponent(month);
      const data = await fetchData(url);
      reportDiv.innerHTML = await renderTable(data);
    } catch (err) {
      console.error(err);
      reportDiv.innerHTML =
        "<p style='color:red;'>ไม่สามารถโหลดรายงานได้</p>";
    }
  };
});
