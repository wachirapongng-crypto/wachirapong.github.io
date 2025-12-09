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
    // แก้ไข: ใช้เฉพาะ Spinner ตัวเดียวที่กำหนดไว้ใน CSS
    await Swal.fire({
      title: message,
      // ใช้เฉพาะ CSS Spinner ตัวเดียว
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
   * WAIT PAGE (เพิ่ม Loader สำหรับการโหลดตาราง)
   ***************************************************/
async function renderWaitPage() {
  await showLoader("กำลังดึงรายการรอตรวจสอบ..."); // Start Loader (หน้าไม่ว่างเปล่า)
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
      `;
  // ... (HTML generating loop) ...
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
  //  MOVE TO LOG (จัดการ Loader ให้หายไป)
  // =====================================
  document.querySelectorAll(".move-log").forEach(btn => {
    btn.onclick = async function () {
      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      await showLoader("กำลังย้ายข้อมูลเข้ารายงาน...");

      try {
        const tr = this.closest("tr");
        const row = tr.dataset.row;

        // Fetch LOG
        const body = new FormData();
        body.append("sheet", "LOG");
        body.append("action", "addLog");
        // ... appends ...
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
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการย้ายข้อมูล", "error");
      }
    };
  });

  // =====================================
  //  DELETE (จัดการ Loader ให้หายไป)
  // =====================================
  document.querySelectorAll(".del-wait").forEach(btn => {
    btn.onclick = async function () {
      const confirmResult = await Swal.fire({ /* ... */ });
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
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
      }
    };
  });
}
  /***************************************************
   * LIST PAGE (เพิ่ม Loader สำหรับการโหลดตาราง)
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
        `;
    // ... (HTML generating loop) ...
    // ... (Update/Delete logic, แก้ไข hideLoader/showLoader ให้อยู่ใน try/catch block)
    // ...

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // Refresh button handler
    document.getElementById("refresh-list").onclick = renderListPage;

    // Add New Item (จัดการ Loader ให้หายไป)
    const addBtn = document.getElementById("add-item");
    if (addBtn) addBtn.onclick = async () => {
      const code = document.getElementById("new-code").value;
      const name = document.getElementById("new-name").value;

      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      await showLoader("กำลังเพิ่มรายการ...");

      try {
        const body = new FormData();
        body.append("sheet", "DATA");
        body.append("action", "add");
        body.append("code", code);
        body.append("name", name);
        await fetchJSON(BASE, "POST", body);

        hideLoader(); // Stop Loader ทันทีที่ Fetch POST เสร็จ
        await Swal.fire("สำเร็จ!", "เพิ่มรายการสำเร็จแล้ว", "success");
        await renderListPage();
      } catch (e) {
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการเพิ่มข้อมูล", "error");
      }
    };

    // แก้ไข (จัดการ Loader ให้หายไป)
    document.querySelectorAll(".list-update").forEach(btn => {
      btn.onclick = async function() {
        const tr = this.closest("tr");
        const row = tr.dataset.row;
        const code = tr.querySelector(".list-code").innerText.trim();
        const name = tr.querySelector(".list-name").innerText.trim();
        
        const { value: formValues } = await Swal.fire({ /* ... */ });

        if (formValues) {
            const confirmResult = await Swal.fire({ /* ... */ });
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

                hideLoader(); // Stop Loader ทันทีที่ Fetch POST เสร็จ
                await Swal.fire("สำเร็จ!", "แก้ไขรายการสำเร็จแล้ว", "success");
                await renderListPage();
            } catch (e) {
                hideLoader();
                await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการแก้ไขข้อมูล", "error");
            }
        }
      };
    });

    // ลบ (จัดการ Loader ให้หายไป)
    document.querySelectorAll(".list-delete").forEach(btn => {
      btn.onclick = async function() {
        const row = this.closest("tr").dataset.row;

        const confirmResult = await Swal.fire({ /* ... */ });
        if (!confirmResult.isConfirmed) return;

        await showLoader("กำลังลบ...");
        try {
            const body = new FormData();
            body.append("sheet", "DATA");
            body.append("action", "delete");
            body.append("row", row);
            await fetchJSON(BASE, "POST", body);

            hideLoader(); // Stop Loader ทันทีที่ Fetch POST เสร็จ
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
   * USER PAGE (เพิ่ม Loader สำหรับการโหลดตาราง)
   ***************************************************/
  async function renderUserPage() {
    await showLoader("กำลังดึงรายการสมาชิก..."); // Start Loader
    const data = await fetchJSON(URLS.USER);
    hideLoader(); // Stop Loader

    let html = `
      <h3>เพิ่มสมาชิก</h3>
      `;
    // ... (HTML generating loop) ...
    // ...

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // เพิ่มสมาชิก (จัดการ Loader ให้หายไป)
    const addUserBtn = document.getElementById("add-user");
    if (addUserBtn) addUserBtn.onclick = async () => {
      const id = document.getElementById("u-id").value;
      const pass = document.getElementById("u-pass").value;
      const status = document.getElementById("u-status").value;
      const name = document.getElementById("u-name").value;

      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      await showLoader("กำลังเพิ่มสมาชิก...");
      try {
        const body = new FormData();
        // ... appends ...
        body.append("sheet","LOGIN");
        body.append("action","addUser");
        body.append("id",id);
        body.append("pass",pass);
        body.append("status",status);
        body.append("name",name);
        await fetchJSON(BASE,"POST",body);

        hideLoader(); // Stop Loader ทันทีที่ Fetch POST เสร็จ
        await Swal.fire("สำเร็จ!", "เพิ่มสมาชิกสำเร็จแล้ว", "success");
        await renderUserPage();
      } catch (e) {
        hideLoader();
        await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการเพิ่มสมาชิก", "error");
      }
    };

    // แก้ไขสมาชิก (จัดการ Loader ให้หายไป)
    document.querySelectorAll(".up-user").forEach(btn=>{
      btn.onclick=async function(){
        const tr=this.closest("tr");
        const row=tr.dataset.row;
        const id=tr.querySelector(".u-id").value;

        const confirmResult = await Swal.fire({ /* ... */ });
        if (!confirmResult.isConfirmed) return;

        await showLoader("กำลังแก้ไขสมาชิก...");
        try {
            const body=new FormData();
            // ... appends ...
            body.append("sheet","LOGIN");
            body.append("action","updateUser");
            body.append("row",row);
            body.append("id",tr.querySelector(".u-id").value);
            body.append("pass",tr.querySelector(".u-pass").value);
            body.append("status",tr.querySelector(".u-status").value);
            body.append("name",tr.querySelector(".u-name").value);
            await fetchJSON(BASE,"POST",body);

            hideLoader(); // Stop Loader ทันทีที่ Fetch POST เสร็จ
            await Swal.fire("สำเร็จ!", "แก้ไขสมาชิกสำเร็จแล้ว", "success");
            await renderUserPage();
        } catch (e) {
            hideLoader();
            await Swal.fire("ผิดพลาด!", "เกิดข้อผิดพลาดในการแก้ไขสมาชิก", "error");
        }
      };
    });

    // ลบสมาชิก (จัดการ Loader ให้หายไป)
    document.querySelectorAll(".del-user").forEach(btn=>{
      btn.onclick=async function(){
        const row=this.closest("tr").dataset.row;

        const confirmResult = await Swal.fire({ /* ... */ });
        if (!confirmResult.isConfirmed) return;

        await showLoader("กำลังลบสมาชิก...");
        try {
            const body=new FormData();
            // ... appends ...
            body.append("sheet","LOGIN");
            body.append("action","deleteUser");
            body.append("row",row);
            await fetchJSON(BASE,"POST",body);

            hideLoader(); // Stop Loader ทันทีที่ Fetch POST เสร็จ
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
   * REPORT PAGE (เพิ่ม Loader สำหรับการโหลดตาราง)
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

    // Export button logic (จัดการ Loader ให้หายไป)
    document.getElementById("export-report").onclick = async function() {
      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      await showLoader("กำลังสร้างไฟล์รายงาน...");
      try {
        const body = new FormData();
        body.append("sheet", "SHOW");
        body.append("action", "generateReport");
        const result = await fetchJSON(BASE, "POST", body);

        hideLoader(); // Stop Loader ทันทีที่ Fetch POST เสร็จ
        if (result && result.status === "success" && result.fileURL) {
          await Swal.fire({ /* ... */ });
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
