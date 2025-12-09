/***************************************************
 * dashboard.js — Full fixed & cleaned (v2.4 Final Menu Fix)
 * - Fixes: Restoring correct menu call structure.
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
   * Loader (SA2)
   ***************************************************/
  async function showLoader(message = "กำลังประมวลผล...") {
    await Swal.fire({
      title: message,
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
   * ROUTER (Fix: Menu call structure)
   ***************************************************/
  // ฟังก์ชันหลักที่ทำงานแบบ Async (สำหรับเรียกจาก loadPage)
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

  // Fix: ใช้ฟังก์ชันนี้ในการ Export เพื่อรองรับการเรียกจาก HTML (onclick)
  window.loadPage = function (page) {
    // เรียกใช้ฟังก์ชันหลักแบบไม่รอ (Non-blocking)
    loadPageInternal(page);
  };

  // เรียกใช้หน้าเริ่มต้น
  window.loadPage("wait");

  /***************************************************
   * WAIT PAGE
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
  //  MOVE TO LOG
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

        hideLoader();
        await Swal.fire("สำเร็จ!", "เพิ่มรายการเข้ารายงานสำเร็จแล้ว", "success");
        await renderWaitPage(); 
      } catch (e) {
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการย้ายข้อมูล", "error");
      }
    };
  });

  // =====================================
  //  DELETE
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

        hideLoader();
        await Swal.fire("สำเร็จ!", "ลบรายการสำเร็จแล้ว", "success");
        await renderWaitPage();
      } catch (e) {
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
      }
    };
  });
}
  /***************************************************
   * LIST PAGE
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

    // Add New Item
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
        body.append("sheet", "DATA");
        body.append("action", "add");
        body.append("code", code);
        body.append("name", name);
        await fetchJSON(BASE, "POST", body);

        hideLoader();
        await Swal.fire("สำเร็จ!", "เพิ่มรายการสำเร็จแล้ว", "success");
        await renderListPage();
      } catch (e) {
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการเพิ่มข้อมูล", "error");
      }
    };

    // แก้ไข
    document.querySelectorAll(".list-update").forEach(btn => {
      btn.onclick = async function() {
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
            return {
                code: document.getElementById('swal-code').value.trim(),
                name: document.getElementById('swal-name').value.trim()
            };
          }
        });

        if (formValues) {
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

            await showLoader("กำลังแก้ไข...");
            try {
                const body = new FormData();
                body.append("sheet", "DATA");
                body.append("action", "update");
                body.append("row", row);
                body.append("code", formValues.code);
                body.append("name", formValues.name);
                await fetchJSON(BASE, "POST", body);

                hideLoader();
                await Swal.fire("สำเร็จ!", "แก้ไขรายการสำเร็จแล้ว", "success");
                await renderListPage();
            } catch (e) {
                hideLoader();
                await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการแก้ไขข้อมูล", "error");
            }
        }
      };
    });

    // ลบ
    document.querySelectorAll(".list-delete").forEach(btn => {
      btn.onclick = async function() {
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

        await showLoader("กำลังลบ...");
        try {
            const body = new FormData();
            body.append("sheet", "DATA");
            body.append("action", "delete");
            body.append("row", row);
            await fetchJSON(BASE, "POST", body);

            hideLoader();
            await Swal.fire("สำเร็จ!", "ลบรายการสำเร็จแล้ว", "success");
            await renderListPage();
        } catch (e) {
            hideLoader();
            await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
        }
      };
    });
  }

  /***************************************************
   * USER PAGE
   ***************************************************/
  async function renderUserPage() {
    await showLoader("กำลังดึงรายการสมาชิก..."); // Start Loader
    const data = await fetchJSON(URLS.USER);
    hideLoader(); // Stop Loader

    let html = `
      <h3>เพิ่มสมาชิก</h3>
      <div style="margin-bottom:10px">
        <input id="u-id" placeholder="ID">
        <input id="u-pass" placeholder="Pass">
        <select id="u-status">
          <option value="admin">admin</option>
          <option value="employee">employee</option>
        </select>
        <input id="u-name" placeholder="ชื่อ">
        <button id="add-user" class="btn">เพิ่ม</button>
      </div><hr>
      <table class="dash-table">
        <thead><tr><th>ID</th><th>Pass</th><th>Status</th><th>Name</th><th>แก้ไข</th><th>ลบ</th></tr></thead><tbody>
    `;

    data.forEach((u,i)=>{
      const row = computeRowFromData(u, i);
      html += `<tr data-row="${row}">
        <td><input class="u-id" value="${u["ID"] || ""}"></td>
        <td><input class="u-pass" value="${u["Pass"] || ""}"></td>
        <td>
          <select class="u-status">
            <option value="admin" ${u["Status"]==="admin"?"selected":""}>admin</option>
            <option value="employee" ${u["Status"]==="employee"?"selected":""}>employee</option>
          </select>
        </td>
        <td><input class="u-name" value="${u["name"] || ""}"></td>
        <td><button class="btn up-user">✔</button></td>
        <td><button class="btn del-user">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // เพิ่มสมาชิก
    const addUserBtn = document.getElementById("add-user");
    if (addUserBtn) addUserBtn.onclick = async () => {
      const id = document.getElementById("u-id").value;
      const pass = document.getElementById("u-pass").value;
      const status = document.getElementById("u-status").value;
      const name = document.getElementById("u-name").value;

      const confirmResult = await Swal.fire({
        title: "ยืนยันการเพิ่มสมาชิก?",
        text: `คุณต้องการเพิ่มสมาชิก ID: ${id} นี้หรือไม่?`,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "ใช่, เพิ่ม",
        cancelButtonText: "ยกเลิก"
      });
      if (!confirmResult.isConfirmed) return;

      await showLoader("กำลังเพิ่มสมาชิก...");
      try {
        const body = new FormData();
        body.append("sheet","LOGIN");
        body.append("action","addUser");
        body.append("id",id);
        body.append("pass",pass);
        body.append("status",status);
        body.append("name",name);
        await fetchJSON(BASE,"POST",body);

        hideLoader();
        await Swal.fire("สำเร็จ!", "เพิ่มสมาชิกสำเร็จแล้ว", "success");
        await renderUserPage();
      } catch (e) {
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการเพิ่มสมาชิก", "error");
      }
    };

    // แก้ไขสมาชิก
    document.querySelectorAll(".up-user").forEach(btn=>{
      btn.onclick=async function(){
        const tr=this.closest("tr");
        const row=tr.dataset.row;
        const id=tr.querySelector(".u-id").value;

        const confirmResult = await Swal.fire({
          title: "ยืนยันการแก้ไขสมาชิก?",
          text: `คุณต้องการแก้ไขข้อมูลสมาชิก ID: ${id} นี้หรือไม่?`,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "ใช่, แก้ไข",
          cancelButtonText: "ยกเลิก"
        });
        if (!confirmResult.isConfirmed) return;

        await showLoader("กำลังแก้ไขสมาชิก...");
        try {
            const body=new FormData();
            body.append("sheet","LOGIN");
            body.append("action","updateUser");
            body.append("row",row);
            body.append("id",tr.querySelector(".u-id").value);
            body.append("pass",tr.querySelector(".u-pass").value);
            body.append("status",tr.querySelector(".u-status").value);
            body.append("name",tr.querySelector(".u-name").value);
            await fetchJSON(BASE,"POST",body);

            hideLoader();
            await Swal.fire("สำเร็จ!", "แก้ไขสมาชิกสำเร็จแล้ว", "success");
            await renderUserPage();
        } catch (e) {
            hideLoader();
            await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการแก้ไขสมาชิก", "error");
        }
      };
    });

    // ลบสมาชิก
    document.querySelectorAll(".del-user").forEach(btn=>{
      btn.onclick=async function(){
        const row=this.closest("tr").dataset.row;

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

        await showLoader("กำลังลบสมาชิก...");
        try {
            const body=new FormData();
            body.append("sheet","LOGIN");
            body.append("action","deleteUser");
            body.append("row",row);
            await fetchJSON(BASE,"POST",body);

            hideLoader();
            await Swal.fire("สำเร็จ!", "ลบสมาชิกสำเร็จแล้ว", "success");
            await renderUserPage();
        } catch (e) {
            hideLoader();
            await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการลบสมาชิก", "error");
        }
      };
    });
  }

  /***************************************************
   * REPORT PAGE
   ***************************************************/
  async function renderReportPage() {
    await showLoader("กำลังดึงรายการรายงาน..."); // Start Loader
    const data = await fetchJSON(URLS.SHOW);
    hideLoader(); // Stop Loader

    let html=`
      <div style="margin-bottom:10px">
        <button id="export-report" class="btn">⬇️ สร้างรายงาน (Excel)</button>
      </div>
      <table class="dash-table"><thead><tr>
        <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th>
        <th>รายละเอียดเพิ่มเติม</th>
      </tr></thead><tbody>`;

    data.forEach(r=>{
      html+=`<tr>
        <td>${r["รหัสครุภัณฑ์"] || ""}</td>
        <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
        <td>${r["ที่เก็บ"] || ""}</td>
        <td>${r["สถานะ"] || ""}</td>
        <td>${r["รายละเอียดเพิ่มเติม"] || ""}</td>
      </tr>`;
    });

    html+="</tbody></table>";
    pageContent.innerHTML=html;

    // Export button logic
    document.getElementById("export-report").onclick = async function() {
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

      await showLoader("กำลังสร้างไฟล์รายงาน...");
      try {
        const body = new FormData();
        body.append("sheet", "SHOW");
        body.append("action", "generateReport");
        const result = await fetchJSON(BASE, "POST", body);

        hideLoader();
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
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการสร้างรายงาน", "error");
      }
    };
  }

  /***************************************************
   * MANUAL PAGE
   ***************************************************/
  function renderManualPage() {
    pageContent.innerHTML=`<h2>คู่มือการใช้งาน</h2><p>เพิ่มข้อความตามที่คุณต้องการ</p>`;
  }

});
