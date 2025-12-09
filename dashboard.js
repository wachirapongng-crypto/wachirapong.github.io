/***************************************************
 * dashboard.js — Full fixed & cleaned (v2.3 Final Loader Fix)
 * - Fixes: Loader duplication, missing table loading loader, persistent loading.
 ***************************************************/
document.addEventListener("DOMContentLoaded", () => {

  const BASE = "https://script.google.com/macros/s/AKfycbzyOwWg00Fp9NgGg6AscrNb3uSNjHAp6d-E9Z3bjG-IalIXgm4wJpc3sFpmkY0iVlNv2w/exec";

  const URLS = {
    DATA: BASE + "?sheet=DATA",
    WAIT: BASE + "?sheet=WAIT",
    LOG: BASE + "?sheet=LOG",
    USER: BASE + "?sheet=LOGIN",
    SHOW: BASE + "?sheet=SHOW"
  };

  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");

  /***************************************************
   * fetchJSON
   ***************************************************/
  async function fetchJSON(url, method = "GET", body = null) {
    try {
      const opt = method === "POST" ? { method: "POST", body } : { method: "GET" };
      const res = await fetch(url, opt);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return [];
      }
    } catch (err) {
      console.error("fetchJSON error:", err);
      return [];
    }
  }

  /***************************************************
   * Loader (SA2) - แก้ไขปัญหา Loader ซ้ำซ้อน
   ***************************************************/
  async function showLoader(message = "กำลังประมวลผล...") {
    await Swal.fire({
      title: message,
      // Fix: กำหนดให้แสดง Spinner ตัวเดียว
      html: '<div class="loader-spinner" style="border-top-color:#3498db; width: 40px; height: 40px; border-width: 4px; animation: spin 1s linear infinite; margin: 10px auto;"></div>',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  function hideLoader() {
    Swal.close();
  }

  /***************************************************
   * Utility
   ***************************************************/
  function formatDateTH(v) {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d)) return v;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  }

  function formatTime(v) {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d)) return v;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm} น.`;
  }

  function computeRowFromData(r, i) {
    return r && (r._row || r.row || r.__row) ? (r._row || r.row || r.__row) : (i + 2);
  }

  /***************************************************
   * ROUTER
   ***************************************************/
  async function loadPageInternal(page) {
    pageContent.innerHTML = "";
    if (page === "wait") {
      pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
      await renderWaitPage();
    }
    else if (page === "list") {
      pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
      await renderListPage();
    }
    else if (page === "user") {
      pageTitle.textContent = "👥 จัดการสมาชิก";
      await renderUserPage();
    }
    else if (page === "report") {
      pageTitle.textContent = "📑 รายงาน LOG / SHOW";
      await renderReportPage();
    }
    else if (page === "manual") {
      pageTitle.textContent = "📘 คู่มือการใช้งาน";
      renderManualPage();
    }
    else {
      pageTitle.textContent = "Dashboard";
      pageContent.innerHTML = "<p>เลือกเมนูด้านซ้าย</p>";
    }
  }

  window.loadPage = function (page) {
    loadPageInternal(page);
  };

  window.loadPage("wait");

  /***************************************************
   * WAIT PAGE (Fix: Loader for initial load)
   ***************************************************/
async function renderWaitPage() {
  await showLoader("กำลังดึงรายการรอตรวจสอบ..."); // Start Loader
  const data = await fetchJSON(URLS.WAIT);
  hideLoader(); // Stop Loader

  const LOCATIONS = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
  const STATUS = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

  let html = `
    <div style="margin-bottom:10px">
      <button id="refresh-wait" class="btn">🔄 รีเฟรช</button>
    </div>

    <table class="dash-table">
      <thead>
        <tr>
          <th>รหัส</th>
          <th>ชื่อ</th>
          <th>ที่อยู่</th>
          <th>สถานะ</th>
          <th>หมายเหตุ</th>
          <th>วันที่</th>
          <th>เวลา</th>
          <th>ย้ายเข้ารายงาน</th>
          <th>ลบ</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach((r, i) => {
    const row = computeRowFromData(r, i);
    html += `
      <tr data-row="${row}">
        <td>${r["รหัส"] || ""}</td>
        <td>${r["ชื่อ"] || ""}</td>

        <td>
          <select class="wait-loc">
            ${LOCATIONS.map(v => `<option value="${v}" ${v === r["ที่อยู่"] ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </td>

        <td>
          <select class="wait-status">
            ${STATUS.map(v => `<option value="${v}" ${v === r["สถานะ"] ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </td>

        <td><input class="wait-note" value="${r["หมายเหตุ"] || ""}" placeholder="รายละเอียดเพิ่มเติม"></td>

        <td>${formatDateTH(r["วันที่"])}</td>
        <td>${formatTime(r["เวลา"])}</td>

        <td><button class="btn move-log">✔</button></td>
        <td><button class="btn del-wait">🗑</button></td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  pageContent.innerHTML = html;

  // ปุ่มรีเฟรช
  document.getElementById("refresh-wait").onclick = renderWaitPage;

  // =====================================
  //  MOVE TO LOG (Fix: Ensure hideLoader is called)
  // =====================================
  document.querySelectorAll(".move-log").forEach(btn => {
    btn.onclick = async function () {
      const confirmResult = await Swal.fire({
        title: "คุณแน่ใจหรือไม่?",
        text: "คุณยืนยันในการเพิ่มรายการนี้เข้ารายงานใช่ไหม?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "ใช่, ยืนยัน!",
        cancelButtonText: "ยกเลิก"
      });

      if (!confirmResult.isConfirmed) return;

      await showLoader("กำลังย้ายข้อมูลเข้ารายงาน...");

      try {
        const tr = this.closest("tr");
        const row = tr.dataset.row;

        // Fetch LOG
        const body = new FormData();
        body.append("sheet", "LOG");
        body.append("action", "addLog");
        body.append("รหัส", tr.children[0].innerText.trim());
        body.append("ชื่อ", tr.children[1].innerText.trim());
        body.append("ที่อยู่", tr.querySelector(".wait-loc").value);
        body.append("สถานะ", tr.querySelector(".wait-status").value);
        body.append("หมายเหตุ", tr.querySelector(".wait-note").value);
        body.append("วันที่", tr.children[5].innerText.trim());
        body.append("เวลา", tr.children[6].innerText.trim());
        await fetchJSON(BASE, "POST", body);

        // Fetch DELETE
        const del = new FormData();
        del.append("sheet", "WAIT");
        del.append("action", "delete");
        del.append("row", row);
        await fetchJSON(BASE, "POST", del);

        hideLoader(); // Stop Loader ทันทีที่ Fetch POSTs เสร็จ
        await Swal.fire("สำเร็จ!", "เพิ่มรายการเข้ารายงานสำเร็จแล้ว", "success");
        await renderWaitPage(); 
      } catch (e) {
        hideLoader(); // Stop Loader เมื่อเกิด Error
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการย้ายข้อมูล", "error");
      }
    };
  });

  // =====================================
  //  DELETE (Fix: Ensure hideLoader is called)
  // =====================================
  document.querySelectorAll(".del-wait").forEach(btn => {
    btn.onclick = async function () {
      const confirmResult = await Swal.fire({
        title: "คุณแน่ใจหรือไม่?",
        text: "ต้องการลบรายการนี้หรือไม่?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "ใช่, ลบทิ้ง!",
        cancelButtonText: "ยกเลิก"
      });
      if (!confirmResult.isConfirmed) return;

      await showLoader("กำลังลบรายการ...");

      try {
        const row = this.closest("tr").dataset.row;
        const body = new FormData();
        body.append("sheet", "WAIT");
        body.append("action", "delete");
        body.append("row", row);
        await fetchJSON(BASE, "POST", body);

        hideLoader(); // Stop Loader ทันทีที่ Fetch POST เสร็จ
        await Swal.fire("สำเร็จ!", "ลบรายการสำเร็จแล้ว", "success");
        await renderWaitPage();
      } catch (e) {
        hideLoader(); // Stop Loader เมื่อเกิด Error
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
      }
    };
  });
}
  /***************************************************
   * LIST PAGE (Fix: Loader for initial load)
   ***************************************************/
  async function renderListPage() {
    await showLoader("กำลังดึงรายการครุภัณฑ์ทั้งหมด..."); // Start Loader
    const data = await fetchJSON(URLS.DATA);
    hideLoader(); // Stop Loader

    const filteredData = data.filter(r => r["รหัสครุภัณฑ์"] && r["รหัสครุภัณฑ์"].toString().trim() !== "");

    let html = `
      <h3>เพิ่มรายการใหม่</h3> 
      <div style="margin-bottom:10px">
        <input id="new-code" placeholder="รหัสครุภัณฑ์">
        <input id="new-name" placeholder="ชื่อครุภัณฑ์">
        <button id="add-item" class="btn">เพิ่ม</button>
        <button id="refresh-list" class="btn">🔄 รีเฟรช</button>
      </div>
      <hr>

      <table class="dash-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>รหัสครุภัณฑ์</th>
            <th>ชื่อ</th>
            <th>Barcode</th>
            <th>QRCode</th>
            <th>แก้ไข</th>
            <th>ลบ</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredData.forEach((r, i) => {
      const row = computeRowFromData(r, i);
      const codeRaw = r["รหัสครุภัณฑ์"] || "";
      const code = encodeURIComponent(codeRaw);
      const name = r["ชื่อครุภัณฑ์"] || "";

      const barcodeURL = `https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128&translate-esc=true`;
      const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${code}`;

      html += `<tr data-row="${row}">
        <td>${r["ลำดับ"] || (i+1)}</td>
        <td class="list-code">${codeRaw}</td>
        <td class="list-name">${name}</td>
        <td><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td>
        <td><img src="${qrURL}" alt="qr" style="height:60px;"></td>
        <td><button class="btn list-update">📝</button></td>
        <td><button class="btn list-delete">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // Refresh button handler
    document.getElementById("refresh-list").onclick = renderListPage;

    // Add New Item (Fix: Ensure hideLoader is called)
    const addBtn = document.getElementById("add-item");
    if (addBtn) addBtn.onclick = async () => {
      const code = document.getElementById("new-code").value;
      const name = document.getElementById("new-name").value;

      const confirmResult = await Swal.fire({
          title: "ยืนยันการเพิ่มรายการ?",
          text: `ต้องการเพิ่ม รหัส: ${code}, ชื่อ: ${name} หรือไม่?`,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "ใช่, เพิ่ม",
          cancelButtonText: "ยกเลิก"
      });
      if (!confirmResult.isConfirmed) return;

      await showLoader("กำลังเพิ่มรายการ...");

      try {
        const body = new FormData();
