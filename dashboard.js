document.addEventListener("DOMContentLoaded", () => {
  // ✅ แสดงชื่อผู้ใช้
  document.getElementById("username").textContent =
    localStorage.getItem("username") || "Admin";

  // ✅ URLs ของแต่ละชีตใน Google Sheets (ใช้ Script ID เดียวกัน)
  const SHEET_URL = {
    DATA: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=DATA",
    WAIT: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=WAIT",
    SHOW: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=SHOW",
    LOGIN: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=LOGIN",
    MEMBER: "https://script.google.com/macros/s/AKfycbyKfmT4sQmqDLm80EihmaQ5-ynSlPA5f3hIABVzIljaYzfWtj1S-nRPQKp8j0PWLTsH/exec?sheet=MEMBER"
  };

  // ✅ อ้างอิงองค์ประกอบในหน้า
  const formSection = document.getElementById("form-section");
  const formTitle = document.getElementById("form-title");
  const formContent = document.getElementById("form-content");
  const closeBtn = document.querySelector(".close-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // ✅ กำหนดการทำงานปุ่มปิดและออกจากระบบ
  closeBtn.addEventListener("click", closeForm);
  formSection.addEventListener("click", (e) => {
    if (e.target === formSection) closeForm();
  });
  logoutBtn.addEventListener("click", logout);

  // ✅ คำหลักที่ระบุว่าคอลัมน์ใดคือ QR Code
  const QR_COLUMNS = ["QR Code", "qr_code", "qr", "QR"];

  // ✅ ฟังก์ชัน escape ป้องกัน HTML injection
  function escapeHTML(str) {
    return str?.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ✅ แปลงค่าแต่ละเซลล์ให้แสดงผลถูกต้อง
  function renderCell(key, val) {
    if (typeof val === "object" && val !== null) {
      if (val.v) val = val.v;
      else return JSON.stringify(val);
    }

    if (QR_COLUMNS.includes(key) && val) {
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        val
      )}" alt="QR Code">`;
    } else {
      return escapeHTML(val);
    }
  }

  // ✅ ฟังก์ชันเปิดฟอร์มและโหลดข้อมูลแต่ละหมวด
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

  // ✅ ปิดฟอร์ม
  function closeForm() {
    formSection.classList.remove("show");
  }

  // ✅ ออกจากระบบ
  function logout() {
    localStorage.removeItem("username");
    window.location.href = "login.html";
  }

  // ✅ ฟังก์ชันดึงข้อมูล (กัน error ได้)
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

  // ✅ สร้างตาราง HTML จากข้อมูล JSON
  async function renderTable(data) {
    if (!Array.isArray(data) || data.length === 0)
      return "<p>ไม่พบข้อมูล</p>";

    let table = "<table><tr>";
    const keys = Object.keys(data[0]);
    keys.forEach((key) => (table += `<th>${escapeHTML(key)}</th>`));
    table += "</tr>";

    data.forEach((row) => {
      table += "<tr>";
      keys.forEach((key) => {
        table += `<td>${renderCell(key, row[key])}</td>`;
      });
      table += "</tr>";
    });

    table += "</table>";
    return table;
  }

  // ✅ โหลดข้อมูลตามชื่อชีต
  window.loadData = async function (sheet) {
    try {
      const data = await fetchData(SHEET_URL[sheet]);
      formContent.innerHTML = await renderTable(data);
    } catch (err) {
      console.error(err);
      formContent.innerHTML =
        "<p style='color:red;'>ไม่สามารถโหลดข้อมูล JSON ได้</p>";
    }
  };

  // ✅ โหลดรายงานตามเดือน
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
