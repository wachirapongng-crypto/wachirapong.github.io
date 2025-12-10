/***************************************************
 * dashboard.js — Full fixed & cleaned (v3.1 Final Date Fix)
 * - Fix 1: Date format D/M/YYYY (e.g., 1/10/2025) fixed again.
 * - Fix 2: Added scroll capability to the main dash-table container.
 * - Fix 3: UI Layout for List/User Add/Edit forms fixed using Grid/Flex.
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
    const controller = new AbortController();
    const signal = controller.signal;
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s Timeout

    try {
      const opt = method === "POST" ? { method: "POST", body, signal } : { method: "GET", signal };

      const res = await fetch(url, opt);
      clearTimeout(timeout);

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn("fetchJSON: Response is not valid JSON, returning []. Text:", text.slice(0, 100));
        return [];
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        console.error("fetchJSON error: Request timed out after 15 seconds.");
      } else {
        console.error("fetchJSON error:", err);
      }
      return [];
    }
  }

  /***************************************************
    * Loader Replacement (UI Only)
    ***************************************************/
  function showLoadingMessage(message = "กำลังโหลดข้อมูลอยู่...") {
    pageContent.innerHTML = `<div style="text-align:center; padding: 50px;">
                                <h3>${message}</h3>
                                <div class="loader-spinner" style="border-top-color:#3498db; width: 40px; height: 40px; border-width: 4px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                            </div>`;
  }

  /***************************************************
    * Utility
    ***************************************************/
  // Fix 1: ปรับปรุง formatDateTH ให้รองรับรูปแบบ D/M/YYYY
  function formatDateTH(v) {
    if (!v) return "";
    let d;
    
    // 1. ลองสร้าง Date จากค่าที่รับมาโดยตรง (รองรับ ISO/Timestamp)
    d = new Date(v);

    // 2. ถ้ายังเป็น Invalid Date และมีรูปแบบ D/M/YYYY (เช่น 1/10/2025)
    // ให้แปลงเป็น YYYY/M/D เพื่อให้ new Date() ทำงานได้
    if (isNaN(d.getTime())) {
      const parts = String(v).split('/');
      if (parts.length === 3) {
        // สร้าง String ในรูปแบบ YYYY/M/D
        const isoLikeString = `${parts[2]}/${parts[1]}/${parts[0]}`;
        d = new Date(isoLikeString);
      }
    }

    // 3. ถ้ายังแปลงไม่สำเร็จ หรือปีที่ได้มาผิดปกติ
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) {
      return v; // คืนค่าเดิม
    }

    // แปลงเป็น พ.ศ. และรูปแบบ วัน/เดือน/ปี
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  }

  function formatTime(v) {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm} น.`;
  }

  function computeRowFromData(r, i) {
    return r && (r._row || r.row || r.__row) ? (r._row || r.row || r.__row) : (i + 2);
  }

  // ฟังก์ชันแสดงผลสำเร็จและรีเฟรชด้วย Loading Message
  async function showSuccessAndRefresh(message, refreshFunc, loadingMessage) {
    await Swal.fire({
      title: "สำเร็จ!",
      text: message,
      icon: "success",
      showConfirmButton: false,
      timer: 1000
    });
    showLoadingMessage(loadingMessage);
    refreshFunc();
  }

  // ฟังก์ชันเรียกรีเฟรชสำหรับปุ่ม
  function handleRefresh(pageName, loadingMessage) {
    return async () => {
      showLoadingMessage(loadingMessage);
      if (pageName === 'wait') await renderWaitPage();
      else if (pageName === 'list') await renderListPage();
      else if (pageName === 'user') await renderUserPage();
      else if (pageName === 'report') await renderReportPage();
    };
  }

  /***************************************************
    * ROUTER
    ***************************************************/
  async function loadPageInternal(page) {
    pageContent.innerHTML = "";
    if (page === "wait") {
      pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
      showLoadingMessage("กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");
      await renderWaitPage();
    }
    else if (page === "list") {
      pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
      showLoadingMessage("กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
      await renderListPage();
    }
    else if (page === "user") {
      pageTitle.textContent = "👥 จัดการสมาชิก";
      showLoadingMessage("กำลังโหลดรายชื่อสมาชิก...");
      await renderUserPage();
    }
    else if (page === "report") {
      pageTitle.textContent = "📑 รายงาน LOG / SHOW";
      showLoadingMessage("กำลังโหลดรายงาน...");
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
    * WAIT PAGE
    ***************************************************/
  async function renderWaitPage() {
    const data = await fetchJSON(URLS.WAIT);

    const LOCATIONS = ["501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
    const STATUS = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];

    let html = `
      <div style="margin-bottom:10px">
        <button id="refresh-wait" class="btn">🔄 รีเฟรช</button>
      </div>
      
      <div style="overflow-x: auto;">
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
      // ใช้ formatDateTH ที่แก้ไขแล้ว
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

    html += "</tbody></table></div>"; // ปิด div สำหรับ scroll
    pageContent.innerHTML = html;

    document.getElementById("refresh-wait").onclick = handleRefresh('wait', "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");

    // =====================================
    // MOVE TO LOG (เหมือนเดิม)
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
          const logResult = await fetchJSON(BASE, "POST", body);

          // Fetch DELETE
          const del = new FormData();
          del.append("sheet", "WAIT");
          del.append("action", "delete");
          del.append("row", row);
          const deleteResult = await fetchJSON(BASE, "POST", del);

          if (logResult && deleteResult) {
            await showSuccessAndRefresh("เพิ่มรายการเข้ารายงานสำเร็จแล้ว", renderWaitPage, "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");
          } else {
            await Swal.fire("ผิดพลาด!", "การดำเนินการไม่สมบูรณ์ หรือ Server ตอบกลับไม่สำเร็จ", "error");
          }
        } catch (e) {
          await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
        }
      };
    });

    // =====================================
    // DELETE (เหมือนเดิม)
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

        try {
          const row = this.closest("tr").dataset.row;
          const body = new FormData();
          body.append("sheet", "WAIT");
          body.append("action", "delete");
          body.append("row", row);
          await fetchJSON(BASE, "POST", body);

          await showSuccessAndRefresh("ลบรายการสำเร็จแล้ว", renderWaitPage, "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");
        } catch (e) {
          await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
        }
      };
    });
  }

  /***************************************************
    * LIST PAGE
    ***************************************************/
  async function renderListPage() {
    const data = await fetchJSON(URLS.DATA);

    const filteredData = data.filter(r => r["รหัสครุภัณฑ์"] && r["รหัสครุภัณฑ์"].toString().trim() !== "");

    let html = `
      <h3>รายการครุภัณฑ์</h3>
      <div style="margin-bottom:10px">
        <button id="add-item" class="btn">➕ เพิ่มรายการใหม่</button>
        <button id="refresh-list" class="btn">🔄 รีเฟรช</button>
      </div>
      <hr>
      
      <div style="overflow-x: auto;"> <table class="dash-table">
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
        <td>${r["ลำดับ"] || (i + 1)}</td>
        <td class="list-code">${codeRaw}</td>
        <td class="list-name">${name}</td>
        <td><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td>
        <td><img src="${qrURL}" alt="qr" style="height:60px;"></td>
        <td><button class="btn list-update">📝</button></td>
        <td><button class="btn list-delete">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table></div>"; // ปิด div สำหรับ scroll
    pageContent.innerHTML = html;

    document.getElementById("refresh-list").onclick = handleRefresh('list', "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");

    // =====================================
    // Fix 3: Add New Item - ปรับปรุง Layout Form
    // =====================================
    const addBtn = document.getElementById("add-item");
    if (addBtn) addBtn.onclick = async () => {

      const { value: formValues } = await Swal.fire({
        title: '➕ เพิ่มรายการครุภัณฑ์ใหม่',
        html:
          // Layout Grid สำหรับฟอร์มเพิ่ม/แก้ไข
          `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; padding: 10px 20px; width: 100%;">
              <div style="grid-column: 1 / 2;">
                  <label for="swal-code" style="font-weight: bold; display: block; margin-bottom: 5px;">รหัสครุภัณฑ์:</label>
                  <input id="swal-code" class="swal2-input" placeholder="ระบุรหัสครุภัณฑ์" style="margin: 0; padding: 10px; width: 100%;">
              </div>
              <div style="grid-column: 2 / 3;">
                  <label for="swal-name" style="font-weight: bold; display: block; margin-bottom: 5px;">ชื่อครุภัณฑ์:</label>
                  <input id="swal-name" class="swal2-input" placeholder="ระบุชื่อครุภัณฑ์" style="margin: 0; padding: 10px; width: 100%;">
              </div>
          </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'เพิ่มรายการ',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
          const code = document.getElementById('swal-code').value.trim();
          const name = document.getElementById('swal-name').value.trim();
          if (!code || !name) {
            Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
            return false;
          }
          return { code, name };
        }
      });

      if (!formValues) return;

      const confirmResult = await Swal.fire({
        title: "ยืนยันการเพิ่มรายการ?",
        text: `รหัส: ${formValues.code}, ชื่อ: ${formValues.name}`,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "ใช่, เพิ่ม",
        cancelButtonText: "ยกเลิก"
      });
      if (!confirmResult.isConfirmed) return;

      try {
        const body = new FormData();
        body.append("sheet", "DATA");
        body.append("action", "add");
        body.append("code", formValues.code);
        body.append("name", formValues.name);
        await fetchJSON(BASE, "POST", body);

        await showSuccessAndRefresh("เพิ่มรายการสำเร็จแล้ว", renderListPage, "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
      } catch (e) {
        await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
      }
    };

    // =====================================
    // Fix 3: แก้ไข (Update) - ปรับปรุง Layout Form
    // =====================================
    document.querySelectorAll(".list-update").forEach(btn => {
      btn.onclick = async function () {
        const tr = this.closest("tr");
        const row = tr.dataset.row;
        const code = tr.querySelector(".list-code").innerText.trim();
        const name = tr.querySelector(".list-name").innerText.trim();

        const { value: formValues } = await Swal.fire({
          title: '📝 แก้ไขข้อมูลครุภัณฑ์',
          html:
            // Layout Grid สำหรับฟอร์มเพิ่ม/แก้ไข
            `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; padding: 10px 20px; width: 100%;">
                <div style="grid-column: 1 / 2;">
                    <label for="swal-code" style="font-weight: bold; display: block; margin-bottom: 5px;">รหัสครุภัณฑ์:</label>
                    <input id="swal-code" class="swal2-input" value="${code}" style="margin: 0; padding: 10px; width: 100%;">
                </div>
                <div style="grid-column: 2 / 3;">
                    <label for="swal-name" style="font-weight: bold; display: block; margin-bottom: 5px;">ชื่อครุภัณฑ์:</label>
                    <input id="swal-name" class="swal2-input" value="${name}" style="margin: 0; padding: 10px; width: 100%;">
                </div>
            </div>`,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'บันทึกการแก้ไข',
          cancelButtonText: 'ยกเลิก',
          preConfirm: () => {
            const newCode = document.getElementById('swal-code').value.trim();
            const newName = document.getElementById('swal-name').value.trim();
            if (!newCode || !newName) {
              Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
              return false;
            }
            return { code: newCode, name: newName };
          }
        });

        if (!formValues) return;

        const confirmResult = await Swal.fire({
          title: "ยืนยันการแก้ไข?",
          text: `รหัส: ${formValues.code}, ชื่อ: ${formValues.name}`,
          icon: "info",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "ใช่, แก้ไข!",
          cancelButtonText: "ยกเลิก"
        });
        if (!confirmResult.isConfirmed) return;

        try {
          const body = new FormData();
          body.append("sheet", "DATA");
          body.append("action", "update");
          body.append("row", row);
          body.append("code", formValues.code);
          body.append("name", formValues.name);
          await fetchJSON(BASE, "POST", body);

          await showSuccessAndRefresh("แก้ไขรายการสำเร็จแล้ว", renderListPage, "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
        } catch (e) {
          await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
        }
      };
    });

    // =====================================
    // ลบ (Delete) (เหมือนเดิม)
    // =====================================
    document.querySelectorAll(".list-delete").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;

        const confirmResult = await Swal.fire({
          title: "คุณแน่ใจหรือไม่?",
          text: "ต้องการลบรายการนี้อย่างถาวรใช่ไหม?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "ใช่, ลบทิ้ง!",
          cancelButtonText: "ยกเลิก"
        });
        if (!confirmResult.isConfirmed) return;

        try {
          const body = new FormData();
          body.append("sheet", "DATA");
          body.append("action", "delete");
          body.append("row", row);
          await fetchJSON(BASE, "POST", body);

          await showSuccessAndRefresh("ลบรายการสำเร็จแล้ว", renderListPage, "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
        } catch (e) {
          await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
        }
      };
    });
  }

  /***************************************************
    * USER PAGE
    ***************************************************/
  async function renderUserPage() {
    const data = await fetchJSON(URLS.USER);

    let html = `
      <h3>จัดการสมาชิก</h3>
      <div style="margin-bottom:10px">
        <button id="add-user" class="btn">➕ เพิ่มสมาชิกใหม่</button>
        <button id="refresh-user" class="btn">🔄 รีเฟรช</button>
      </div><hr>
      <div style="overflow-x: auto;">
      <table class="dash-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Pass</th>
            <th>Status</th>
            <th>Name</th>
            <th>แก้ไข</th>
            <th>ลบ</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach((u, i) => {
      const row = computeRowFromData(u, i);
      html += `<tr data-row="${row}">
        <td class="user-id">${u["ID"] || ""}</td>
        <td class="user-pass">${u["Pass"] || ""}</td>
        <td class="user-status">${u["Status"] || ""}</td>
        <td class="user-name">${u["name"] || ""}</td>
        <td><button class="btn up-user">📝</button></td>
        <td><button class="btn del-user">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table></div>";
    pageContent.innerHTML = html;

    document.getElementById("refresh-user").onclick = handleRefresh('user', "กำลังโหลดรายชื่อสมาชิก...");

    // =====================================
    // Fix 3: เพิ่มสมาชิก - ปรับปรุง Layout Form
    // =====================================
    const addUserBtn = document.getElementById("add-user");
    if (addUserBtn) addUserBtn.onclick = async () => {
      const { value: formValues } = await Swal.fire({
        title: '➕ เพิ่มสมาชิกใหม่',
        html:
          // Layout Grid สำหรับฟอร์มเพิ่ม/แก้ไข
          `<div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 10px 20px; text-align: left; padding: 10px 20px; width: 100%;">
              <label for="swal-id" style="align-self: center; font-weight: bold;">ID:</label>
              <input id="swal-id" class="swal2-input" placeholder="ID" style="margin: 0; padding: 10px;">
              
              <label for="swal-pass" style="align-self: center; font-weight: bold;">Pass:</label>
              <input id="swal-pass" class="swal2-input" placeholder="Password" style="margin: 0; padding: 10px;">
              
              <label for="swal-status" style="align-self: center; font-weight: bold;">Status:</label>
              <select id="swal-status" class="swal2-select" style="margin: 0; padding: 10px; width: 100%; font-size: inherit;">
                <option value="admin">admin</option>
                <option value="employee">employee</option>
              </select>

              <label for="swal-name" style="align-self: center; font-weight: bold;">ชื่อ:</label>
              <input id="swal-name" class="swal2-input" placeholder="ชื่อ" style="margin: 0; padding: 10px;">
          </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'เพิ่มสมาชิก',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
          const id = document.getElementById('swal-id').value.trim();
          const pass = document.getElementById('swal-pass').value.trim();
          const status = document.getElementById('swal-status').value.trim();
          const name = document.getElementById('swal-name').value.trim();
          if (!id || !pass || !status || !name) {
            Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
            return false;
          }
          return { id, pass, status, name };
        }
      });

      if (!formValues) return;

      const confirmResult = await Swal.fire({
        title: "ยืนยันการเพิ่มสมาชิก?",
        text: `ID: ${formValues.id}, ชื่อ: ${formValues.name}`,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "ใช่, เพิ่ม",
        cancelButtonText: "ยกเลิก"
      });
      if (!confirmResult.isConfirmed) return;

      try {
        const body = new FormData();
        body.append("sheet", "LOGIN");
        body.append("action", "addUser");
        body.append("id", formValues.id);
        body.append("pass", formValues.pass);
        body.append("status", formValues.status);
        body.append("name", formValues.name);
        await fetchJSON(BASE, "POST", body);

        await showSuccessAndRefresh("เพิ่มสมาชิกสำเร็จแล้ว", renderUserPage, "กำลังโหลดรายชื่อสมาชิก...");
      } catch (e) {
        await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
      }
    };

    // =====================================
    // Fix 3: แก้ไขสมาชิก - ปรับปรุง Layout Form
    // =====================================
    document.querySelectorAll(".up-user").forEach(btn => {
      btn.onclick = async function () {
        const tr = this.closest("tr");
        const row = tr.dataset.row;
        const id = tr.querySelector(".user-id").innerText.trim();
        const pass = tr.querySelector(".user-pass").innerText.trim();
        const status = tr.querySelector(".user-status").innerText.trim();
        const name = tr.querySelector(".user-name").innerText.trim();


        const { value: formValues } = await Swal.fire({
          title: '📝 แก้ไขสมาชิก',
          html:
            // Layout Grid สำหรับฟอร์มเพิ่ม/แก้ไข
            `<div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 10px 20px; text-align: left; padding: 10px 20px; width: 100%;">
                <label for="swal-id" style="align-self: center; font-weight: bold;">ID:</label>
                <input id="swal-id" class="swal2-input" value="${id}" style="margin: 0; padding: 10px;">
                
                <label for="swal-pass" style="align-self: center; font-weight: bold;">Pass:</label>
                <input id="swal-pass" class="swal2-input" value="${pass}" style="margin: 0; padding: 10px;">
                
                <label for="swal-status" style="align-self: center; font-weight: bold;">Status:</label>
                <select id="swal-status" class="swal2-select" style="margin: 0; padding: 10px; width: 100%; font-size: inherit;">
                  <option value="admin" ${status === "admin" ? "selected" : ""}>admin</option>
                  <option value="employee" ${status === "employee" ? "selected" : ""}>employee</option>
                </select>

                <label for="swal-name" style="align-self: center; font-weight: bold;">ชื่อ:</label>
                <input id="swal-name" class="swal2-input" value="${name}" style="margin: 0; padding: 10px;">
            </div>`,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'บันทึกการแก้ไข',
          cancelButtonText: 'ยกเลิก',
          preConfirm: () => {
            const newId = document.getElementById('swal-id').value.trim();
            const newPass = document.getElementById('swal-pass').value.trim();
            const newStatus = document.getElementById('swal-status').value.trim();
            const newName = document.getElementById('swal-name').value.trim();
            if (!newId || !newPass || !newStatus || !newName) {
              Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
              return false;
            }
            return { id: newId, pass: newPass, status: newStatus, name: newName };
          }
        });

        if (!formValues) return;

        const confirmResult = await Swal.fire({
          title: "ยืนยันการแก้ไขสมาชิก?",
          text: `ID: ${formValues.id}, ชื่อ: ${formValues.name}`,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "ใช่, แก้ไข",
          cancelButtonText: "ยกเลิก"
        });
        if (!confirmResult.isConfirmed) return;

        try {
          const body = new FormData();
          body.append("sheet", "LOGIN");
          body.append("action", "updateUser");
          body.append("row", row);
          body.append("id", formValues.id);
          body.append("pass", formValues.pass);
          body.append("status", formValues.status);
          body.append("name", formValues.name);
          await fetchJSON(BASE, "POST", body);

          await showSuccessAndRefresh("แก้ไขสมาชิกสำเร็จแล้ว", renderUserPage, "กำลังโหลดรายชื่อสมาชิก...");
        } catch (e) {
          await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
        }
      };
    });

    // =====================================
    // ลบสมาชิก (เหมือนเดิม)
    // =====================================
    document.querySelectorAll(".del-user").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;

        const confirmResult = await Swal.fire({
          title: "คุณแน่ใจหรือไม่?",
          text: "ต้องการลบสมาชิกนี้อย่างถาวรใช่ไหม?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "ใช่, ลบทิ้ง!",
          cancelButtonText: "ยกเลิก"
        });
        if (!confirmResult.isConfirmed) return;

        try {
          const body = new FormData();
          body.append("sheet", "LOGIN");
          body.append("action", "deleteUser");
          body.append("row", row);
          await fetchJSON(BASE, "POST", body);

          await showSuccessAndRefresh("ลบสมาชิกสำเร็จแล้ว", renderUserPage, "กำลังโหลดรายชื่อสมาชิก...");
        } catch (e) {
          await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
        }
      };
    });
  }

  /***************************************************
    * REPORT PAGE
    ***************************************************/
  async function renderReportPage() {
    const data = await fetchJSON(URLS.SHOW);

    let html = `
      <div style="margin-bottom:10px">
        <button id="export-report" class="btn">⬇️ สร้างรายงาน (Excel)</button>
      </div>
      <div style="overflow-x: auto;">
      <table class="dash-table"><thead><tr>
        <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th>
        <th>รายละเอียดเพิ่มเติม</th><th>วันที่</th><th>เวลา</th>
      </tr></thead><tbody>`;

    data.forEach(r => {
      html += `<tr>
        <td>${r["รหัสครุภัณฑ์"] || ""}</td>
        <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
        <td>${r["ที่เก็บ"] || ""}</td>
        <td>${r["สถานะ"] || ""}</td>
        <td>${r["รายละเอียดเพิ่มเติม"] || ""}</td>
        <td>${r["วันที่"] || ""}</td> <td>${r["เวลา"] || ""}</td> </tr>`;
    });

    html += "</tbody></table></div>";
    pageContent.innerHTML = html;

    document.getElementById("export-report").onclick = async function () {
      const confirmResult = await Swal.fire({
        title: "ยืนยันการสร้างรายงาน?",
        text: "คุณต้องการให้ระบบสร้างไฟล์ Excel รายงานหรือไม่?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#17a2b8",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "ใช่, สร้างรายงาน",
        cancelButtonText: "ยกเลิก"
      });
      if (!confirmResult.isConfirmed) return;

      try {
        const body = new FormData();
        body.append("sheet", "SHOW");
        body.append("action", "generateReport");
        const result = await fetchJSON(BASE, "POST", body);

        if (result && result.status === "success" && result.fileURL) {
          await Swal.fire({
            title: "สำเร็จ!",
            html: `สร้างรายงานเสร็จสิ้น: <a href="${result.fileURL}" target="_blank">ดาวน์โหลดไฟล์</a>`,
            icon: "success"
          });
        } else {
          await Swal.fire("ผิดพลาด!", "ไม่สามารถสร้างรายงานได้ โปรดตรวจสอบ Backend", "error");
        }
      } catch (e) {
        await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
      }
    };
  }

  /***************************************************
    * MANUAL PAGE (เหมือนเดิม)
    ***************************************************/
  function renderManualPage() {
    pageContent.innerHTML = `
      <h2>📘 คู่มือการใช้งาน</h2>
      
      <hr>

      <h3>1. ครุภัณฑ์ที่รอตรวจสอบ (WAIT)</h3>
      <p>รายการครุภัณฑ์ที่ถูกแจ้งเข้ามาเพื่อรอการตรวจสอบและยืนยันสถานะ</p>
      <ul>
        <li><strong>แก้ไข:</strong> คุณสามารถแก้ไข **ที่อยู่**, **สถานะ**, และ **หมายเหตุ** ได้โดยตรงในตาราง</li>
        <li><strong>ย้ายเข้ารายงาน (✔):</strong> ยืนยันข้อมูลและย้ายรายการนี้ไปบันทึกใน **รายงาน LOG / SHOW** และลบออกจากรายการรอตรวจสอบ</li>
        <li><strong>ลบ (🗑):</strong> ลบรายการนี้ออกจากรายการรอตรวจสอบอย่างถาวร</li>
        <li><strong>รีเฟรช (🔄):</strong> โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์</li>
      </ul>

      <h3>2. รายการครุภัณฑ์ทั้งหมด (LIST)</h3>
      <p>รายการครุภัณฑ์ทั้งหมดที่มีอยู่ในระบบ (ชีท DATA)</p>
      <ul>
        <li><strong>เพิ่มรายการใหม่:</strong> กดปุ่ม **➕ เพิ่มรายการใหม่** จะมีหน้าต่างขึ้นมาให้กรอก **รหัสครุภัณฑ์** และ **ชื่อครุภัณฑ์**</li>
        <li><strong>แก้ไข (📝):</strong> กดปุ่มแก้ไข จะมีหน้าต่างขึ้นมาให้แก้ไข **รหัสครุภัณฑ์** และ **ชื่อครุภัณฑ์**</li>
        <li><strong>ลบ (🗑):** ลบรายการครุภัณฑ์นั้นอย่างถาวร</li>
        <li><strong>Barcode/QRCode:</strong> ภาพ Barcode และ QR Code ถูกสร้างขึ้นจาก **รหัสครุภัณฑ์** ที่อยู่ในตาราง</li>
        <li><strong>รีเฟรช (🔄):</strong> โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์</li>
      </ul>

      <h3>3. จัดการสมาชิก (USER)</h3>
      <p>จัดการบัญชีผู้ใช้งานระบบ</p>
      <ul>
        <li><strong>เพิ่มสมาชิกใหม่:</strong> กดปุ่ม **➕ เพิ่มสมาชิกใหม่** จะมีหน้าต่างขึ้นมาให้กรอก **ID**, **Pass**, **Status** (admin/employee) และ **ชื่อ**</li>
        <li><strong>แก้ไข (📝):</strong> กดปุ่มแก้ไข จะมีหน้าต่างขึ้นมาให้แก้ไขข้อมูลสมาชิกทั้งหมด</li>
        <li><strong>ลบ (🗑):</strong> ลบสมาชิกนั้นออกจากระบบอย่างถาวร</li>
        <li><strong>รีเฟรช (🔄):</strong> โหลดข้อมูลล่าสุดจากเซิร์ฟเวอร์</li>
      </ul>

      <h3>4. รายงาน LOG / SHOW (REPORT)</h3>
      <p>แสดงรายการครุภัณฑ์ทั้งหมดในชีท SHOW</p>
      <ul>
        <li><strong>การแสดงผล:</strong> แสดงเฉพาะรายการที่ถูกย้ายจากหน้า **ครุภัณฑ์ที่รอตรวจสอบ** เข้ามาแล้ว</li>
        <li><strong>สร้างรายงาน (Excel):</strong> ส่งคำขอไปยัง Backend (GAS) เพื่อสร้างไฟล์ Excel รายงาน</li>
      </ul>
    `;
  }

});
