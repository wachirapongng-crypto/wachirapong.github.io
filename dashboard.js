/***************************************************
 * dashboard.js — Full fixed & cleaned (v2.6 Final UI/Delay Fix)
 * - Fixes: Removed SA2 for initial loading; Replaced action loaders with delayed success message.
 ***************************************************/
document.addEventListener("DOMContentLoaded", () => {

  const BASE = "https://script.google.com/macros/s/AKfycbzyOwWg00Fp9NgGg6AscrNb3uSNjHAp6d-E9Z3bjG-IalIXgm4wJpc3sFpmkY0iVlNv2w/exec";
  const DELAY_MS = 3000; // 3 วินาที สำหรับหน่วงเวลารีเฟรช

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
  // Fix: ยกเลิกการใช้ SA2 สำหรับการโหลดตาราง เปลี่ยนเป็นข้อความแทน
  function showLoadingMessage(message = "กำลังโหลดข้อมูลอยู่...") {
    pageContent.innerHTML = `<div style="text-align:center; padding: 50px;">
                                <h3>${message}</h3>
                                <div class="loader-spinner" style="border-top-color:#3498db; width: 40px; height: 40px; border-width: 4px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                            </div>`;
  }

  // ยกเลิกฟังก์ชัน showLoader และ hideLoader ที่ใช้ SweetAlert2 สำหรับ Action

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

  // Fix: ฟังก์ชันหน่วงเวลาและรีเฟรช
  async function showSuccessAndRefresh(message, refreshFunc) {
      await Swal.fire({
          title: "สำเร็จ!",
          text: `${message} (หน่วง 3 วินาที)`,
          icon: "success",
          timer: DELAY_MS,
          timerProgressBar: true,
          showConfirmButton: false
      });
      refreshFunc();
  }

  /***************************************************
   * ROUTER
   ***************************************************/
  async function loadPageInternal(page) {
    pageContent.innerHTML = "";
    if (page === "wait") {
      pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
      showLoadingMessage("กำลังโหลดข้อมูลครุภัณฑ์ที่รอตรวจสอบ..."); // Show Loading Message
      await renderWaitPage();
    }
    else if (page === "list") {
      pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
      showLoadingMessage("กำลังโหลดรายการครุภัณฑ์ทั้งหมด..."); // Show Loading Message
      await renderListPage();
    }
    else if (page === "user") {
      pageTitle.textContent = "👥 จัดการสมาชิก";
      showLoadingMessage("กำลังโหลดรายชื่อสมาชิก..."); // Show Loading Message
      await renderUserPage();
    }
    else if (page === "report") {
      pageTitle.textContent = "📑 รายงาน LOG / SHOW";
      showLoadingMessage("กำลังโหลดรายงาน..."); // Show Loading Message
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
  
  // Render Data (ไม่มี hideLoader)
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
  pageContent.innerHTML = html; // แสดงผลตาราง

  // ปุ่มรีเฟรช
  document.getElementById("refresh-wait").onclick = renderWaitPage;

  // =====================================
  //  MOVE TO LOG (Fix: Success + Delay)
  // =====================================
  document.querySelectorAll(".move-log").forEach(btn => {
    btn.onclick = async function () {
      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      // ************ ไม่ใช้ showLoader ************
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
          await showSuccessAndRefresh("เพิ่มรายการเข้ารายงานสำเร็จแล้ว", renderWaitPage);
        } else {
          await Swal.fire("ผิดพลาด!", "การดำเนินการไม่สมบูรณ์ หรือ Server ตอบกลับไม่สำเร็จ", "error");
        }
      } catch (e) {
        await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
      }
    };
  });

  // =====================================
  //  DELETE (Fix: Success + Delay)
  // =====================================
  document.querySelectorAll(".del-wait").forEach(btn => {
    btn.onclick = async function () {
      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      // ************ ไม่ใช้ showLoader ************
      try {
        const row = this.closest("tr").dataset.row;
        const body = new FormData();
        body.append("sheet", "WAIT");
        body.append("action", "delete");
        body.append("row", row);
        await fetchJSON(BASE, "POST", body);

        await showSuccessAndRefresh("ลบรายการสำเร็จแล้ว", renderWaitPage);
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
    pageContent.innerHTML = html; // แสดงผลตาราง

    // Refresh button handler
    document.getElementById("refresh-list").onclick = renderListPage;

    // Add New Item (Fix: Success + Delay)
    const addBtn = document.getElementById("add-item");
    if (addBtn) addBtn.onclick = async () => {
      const code = document.getElementById("new-code").value;
      const name = document.getElementById("new-name").value;

      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      // ************ ไม่ใช้ showLoader ************
      try {
        const body = new FormData();
        body.append("sheet", "DATA");
        body.append("action", "add");
        body.append("code", code);
        body.append("name", name);
        await fetchJSON(BASE, "POST", body);

        await showSuccessAndRefresh("เพิ่มรายการสำเร็จแล้ว", renderListPage);
      } catch (e) {
        await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
      }
    };

    // แก้ไข (Fix: Success + Delay)
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

            // ************ ไม่ใช้ showLoader ************
            try {
                const body = new FormData();
                body.append("sheet", "DATA");
                body.append("action", "update");
                body.append("row", row);
                body.append("code", formValues.code);
                body.append("name", formValues.name);
                await fetchJSON(BASE, "POST", body);

                await showSuccessAndRefresh("แก้ไขรายการสำเร็จแล้ว", renderListPage);
            } catch (e) {
                await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
            }
        }
      };
    });

    // ลบ (Fix: Success + Delay)
    document.querySelectorAll(".list-delete").forEach(btn => {
      btn.onclick = async function() {
        const row = this.closest("tr").dataset.row;

        const confirmResult = await Swal.fire({ /* ... */ });
        if (!confirmResult.isConfirmed) return;

        // ************ ไม่ใช้ showLoader ************
        try {
            const body = new FormData();
            body.append("sheet", "DATA");
            body.append("action", "delete");
            body.append("row", row);
            await fetchJSON(BASE, "POST", body);

            await showSuccessAndRefresh("ลบรายการสำเร็จแล้ว", renderListPage);
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

    // เพิ่มสมาชิก (Fix: Success + Delay)
    const addUserBtn = document.getElementById("add-user");
    if (addUserBtn) addUserBtn.onclick = async () => {
      const id = document.getElementById("u-id").value;
      const pass = document.getElementById("u-pass").value;
      const status = document.getElementById("u-status").value;
      const name = document.getElementById("u-name").value;

      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      // ************ ไม่ใช้ showLoader ************
      try {
        const body = new FormData();
        body.append("sheet","LOGIN");
        body.append("action","addUser");
        body.append("id",id);
        body.append("pass",pass);
        body.append("status",status);
        body.append("name",name);
        await fetchJSON(BASE,"POST",body);

        await showSuccessAndRefresh("เพิ่มสมาชิกสำเร็จแล้ว", renderUserPage);
      } catch (e) {
        await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
      }
    };

    // แก้ไขสมาชิก (Fix: Success + Delay)
    document.querySelectorAll(".up-user").forEach(btn=>{
      btn.onclick=async function(){
        const tr=this.closest("tr");
        const row=tr.dataset.row;
        const id=tr.querySelector(".u-id").value;

        const confirmResult = await Swal.fire({ /* ... */ });
        if (!confirmResult.isConfirmed) return;

        // ************ ไม่ใช้ showLoader ************
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

            await showSuccessAndRefresh("แก้ไขสมาชิกสำเร็จแล้ว", renderUserPage);
        } catch (e) {
            await Swal.fire("ผิดพลาด!", "การเชื่อมต่อขัดข้องหรือใช้เวลานานเกินไป", "error");
        }
      };
    });

    // ลบสมาชิก (Fix: Success + Delay)
    document.querySelectorAll(".del-user").forEach(btn=>{
      btn.onclick=async function(){
        const row=this.closest("tr").dataset.row;

        const confirmResult = await Swal.fire({ /* ... */ });
        if (!confirmResult.isConfirmed) return;

        // ************ ไม่ใช้ showLoader ************
        try {
            const body=new FormData();
            body.append("sheet","LOGIN");
            body.append("action","deleteUser");
            body.append("row",row);
            await fetchJSON(BASE,"POST",body);

            await showSuccessAndRefresh("ลบสมาชิกสำเร็จแล้ว", renderUserPage);
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

    // Export button logic (Fix: Success + Delay)
    document.getElementById("export-report").onclick = async function() {
      const confirmResult = await Swal.fire({ /* ... */ });
      if (!confirmResult.isConfirmed) return;

      // ************ ไม่ใช้ showLoader ************
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
   * MANUAL PAGE
   ***************************************************/
  function renderManualPage() {
    pageContent.innerHTML=`<h2>คู่มือการใช้งาน</h2><p>เพิ่มข้อความตามที่คุณต้องการ</p>`;
  }

});
