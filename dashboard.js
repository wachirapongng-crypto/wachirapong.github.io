/***************************************************
 * dashboard.js — Full fixed & cleaned (v2.8 Final UI/Refresh Fix)
 * - Fixes: Date/Time display in WAIT, removed Date/Time in REPORT, implemented loading message on refresh.
 * - NEW: Wait/List/User structure unified. New Add Item/User modal form.
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
      // ปรับปรุงการส่ง POST: FormData จะถูกส่งไปตามปกติ
      const opt = method === "POST" ? { method: "POST", body, signal } : { method: "GET", signal };

      const res = await fetch(url, opt);
      clearTimeout(timeout);

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        // อาจเป็นข้อความตอบกลับที่ไม่ใช่ JSON หรือ JSON ว่างเปล่า
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
  function formatDateTH(v) {
    if (!v) return "";
    // Fix 1: สร้าง Date object จากค่าที่รับมา
    const d = new Date(v);
    if (isNaN(d)) return v;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  }

  function formatTime(v) {
    if (!v) return "";
    // Fix 1: สร้าง Date object จากค่าที่รับมา
    const d = new Date(v);
    if (isNaN(d)) return v;
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
    // แสดง Loading Message ก่อนรีเฟรช
    showLoadingMessage(loadingMessage);
    // เรียกฟังก์ชันรีเฟรช
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

  // เริ่มต้นที่หน้า "wait"
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
      // Fix 1: ใช้ formatDateTH และ formatTime แสดง วันที่/เวลา
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
    pageContent.innerHTML = html; // แสดงผลตาราง

    // ปุ่มรีเฟรชใช้ handleRefresh
    document.getElementById("refresh-wait").onclick = handleRefresh('wait', "กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ...");

    // =====================================
    // MOVE TO LOG
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
    // DELETE
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
    // Fix 3: ลบข้อมูลที่ฟิลด์รหัสครุภัณฑ์ว่างเปล่า
    const data = await fetchJSON(URLS.DATA);

    const filteredData = data.filter(r => r["รหัสครุภัณฑ์"] && r["รหัสครุภัณฑ์"].toString().trim() !== "");

    let html = `
      <h3>รายการครุภัณฑ์</h3>
      <div style="margin-bottom:10px">
        <button id="add-item" class="btn">➕ เพิ่มรายการใหม่</button>
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

      // Fix 3: แสดงภาพจาก URL ที่สร้างโดยใช้ 'รหัสครุภัณฑ์' เท่านั้น (ไม่ต้องรับค่าจาก GAS)
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

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // ปุ่มรีเฟรชใช้ handleRefresh
    document.getElementById("refresh-list").onclick = handleRefresh('list', "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");

    // =====================================
    // Fix 3: Add New Item - ใช้ Popup Form
    // =====================================
    const addBtn = document.getElementById("add-item");
    if (addBtn) addBtn.onclick = async () => {

      const { value: formValues } = await Swal.fire({
        title: '➕ เพิ่มรายการครุภัณฑ์ใหม่',
        html:
          `<div style="text-align:left; margin:10px auto;">
              <label for="swal-code">รหัสครุภัณฑ์:</label>
              <input id="swal-code" class="swal2-input" placeholder="ระบุรหัสครุภัณฑ์" required>
              <label for="swal-name">ชื่อครุภัณฑ์:</label>
              <input id="swal-name" class="swal2-input" placeholder="ระบุชื่อครุภัณฑ์" required>
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
        // Fix 3: ไม่ส่งค่า Barcode/QR Code ไป (ให้ GAS จัดการหรือปล่อยว่างไว้)
        await fetchJSON(BASE, "POST", body);

        await showSuccessAndRefresh("เพิ่มรายการสำเร็จแล้ว", renderListPage, "กำลังโหลดรายการครุภัณฑ์ทั้งหมด...");
      } catch (e) {
        await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
      }
    };

    // =====================================
    // แก้ไข (Update)
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
            `<div style="text-align:left; margin:10px auto;">
                <label for="swal-code">รหัสครุภัณฑ์:</label>
                <input id="swal-code" class="swal2-input" value="${code}">
                <label for="swal-name">ชื่อครุภัณฑ์:</label>
                <input id="swal-name" class="swal2-input" value="${name}">
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
            return {
              code: newCode,
              name: newName
            };
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
    // ลบ (Delete)
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
    * Fix 4: USER PAGE (ปรับโครงสร้างใหม่)
    ***************************************************/
  async function renderUserPage() {
    const data = await fetchJSON(URLS.USER);

    let html = `
      <h3>จัดการสมาชิก</h3>
      <div style="margin-bottom:10px">
        <button id="add-user" class="btn">➕ เพิ่มสมาชิกใหม่</button>
        <button id="refresh-user" class="btn">🔄 รีเฟรช</button>
      </div><hr>
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

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // ปุ่มรีเฟรชใช้ handleRefresh
    document.getElementById("refresh-user").onclick = handleRefresh('user', "กำลังโหลดรายชื่อสมาชิก...");

    // =====================================
    // Fix 4: เพิ่มสมาชิก - ใช้ Popup Form
    // =====================================
    const addUserBtn = document.getElementById("add-user");
    if (addUserBtn) addUserBtn.onclick = async () => {
      const { value: formValues } = await Swal.fire({
        title: '➕ เพิ่มสมาชิกใหม่',
        html:
          `<div style="text-align:left; margin:10px auto;">
              <label for="swal-id">ID:</label>
              <input id="swal-id" class="swal2-input" placeholder="ID" required>
              <label for="swal-pass">Pass:</label>
              <input id="swal-pass" class="swal2-input" placeholder="Password" required>
              <label for="swal-status">Status:</label>
              <select id="swal-status" class="swal2-select">
                <option value="admin">admin</option>
                <option value="employee">employee</option>
              </select>
              <label for="swal-name">ชื่อ:</label>
              <input id="swal-name" class="swal2-input" placeholder="ชื่อ" required>
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
    // Fix 4: แก้ไขสมาชิก - ใช้ Popup Form
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
            `<div style="text-align:left; margin:10px auto;">
                <label for="swal-id">ID:</label>
                <input id="swal-id" class="swal2-input" value="${id}">
                <label for="swal-pass">Pass:</label>
                <input id="swal-pass" class="swal2-input" value="${pass}">
                <label for="swal-status">Status:</label>
                <select id="swal-status" class="swal2-select">
                  <option value="admin" ${status === "admin" ? "selected" : ""}>admin</option>
                  <option value="employee" ${status === "employee" ? "selected" : ""}>employee</option>
                </select>
                <label for="swal-name">ชื่อ:</label>
                <input id="swal-name" class="swal2-input" value="${name}">
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
    // Fix 4: ลบสมาชิก
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
    * Fix 2: REPORT PAGE (ลบปุ่ม Export และ คอลัมน์ วันที่/เวลา)
    ***************************************************/
  async function renderReportPage() {
    const data = await fetchJSON(URLS.SHOW);

    let html = `
      <p style="color:red;">❌ ฟังก์ชันสร้างรายงาน (Excel) ถูกนำออกแล้วตามคำสั่ง</p>
      <table class="dash-table"><thead><tr>
        <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th>
        <th>รายละเอียดเพิ่มเติม</th>
      </tr></thead><tbody>`; // Fix 2: ลบ <th> วันที่/เวลา </th>

    data.forEach(r => {
      html += `<tr>
        <td>${r["รหัสครุภัณฑ์"] || ""}</td>
        <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
        <td>${r["ที่เก็บ"] || ""}</td>
        <td>${r["สถานะ"] || ""}</td>
        <td>${r["รายละเอียดเพิ่มเติม"] || ""}</td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // Fix 2: ลบส่วน Export button logic ออก
  }

  /***************************************************
    * Fix 5: MANUAL PAGE (คู่มือการใช้งาน)
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
        <li><strong>ลบ (🗑):</strong> ลบรายการครุภัณฑ์นั้นอย่างถาวร</li>
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
        <li>**หมายเหตุ:** ฟังก์ชันสร้างรายงาน (Excel) ถูกนำออกไปแล้วตามคำสั่ง</li>
      </ul>
    `;
  }

});
