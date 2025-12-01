/***************************************************
 * dashboard.js — Full fixed & cleaned
 * - single loader implementation (works with animations)
 * - consistent fetchJSON usage (GET uses URLS.*, POST uses BASE + FormData)
 * - move-log uses BASE + FormData (no query duplication)
 * - safer row calculation (uses row field if returned by backend)
 ***************************************************/
document.addEventListener("DOMContentLoaded", () => {

  const BASE = "https://script.google.com/macros/s/AKfycbwixv3fvgOqqE1OhJVV0pp7fvqLWXP1clMoMcYvHloVBDm6jBi9LQy4AXf0j8qjxnC6tA/exec";

  const URLS = {
    DATA: BASE + "?sheet=DATA",
    WAIT: BASE + "?sheet=WAIT",
    LOG: BASE + "?sheet=LOG",
    USER: BASE + "?sheet=LOGIN"
  };

  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");
  const loaderEl = document.getElementById("loader");

  /***************************************************
   * fetchJSON
   * - GET: fetch(url)
   * - POST: fetch(url, { method: "POST", body })
   * returns parsed JSON or [] on error
   ***************************************************/
  async function fetchJSON(url, method = "GET", body = null) {
    try {
      const opt = method === "POST" ? { method: "POST", body } : { method: "GET" };
      const res = await fetch(url, opt);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        // ไม่ใช่ JSON หรือเป็นข้อความ — คืนค่า [] เพื่อหลีกเลี่ยง crash
        return [];
      }
    } catch (err) {
      console.error("fetchJSON error:", err);
      return [];
    }
  }

  /***************************************************
   * Loader (single, reliable)
   * - showLoader(message) sets markup, forces a frame via rAF so CSS animations can start
   * - hideLoader() hides
   * HTML expected: <div id="loader" style="display:none"></div>
   ***************************************************/
  async function showLoader(message = "กำลังประมวลผล...") {
    if (!loaderEl) return;
    loaderEl.innerHTML = `
      <div class="loader-spinner" aria-hidden="true"></div>
      <p class="loader-text">${message}</p>
    `;
    loaderEl.style.display = "flex";
    // ให้ browser มีโอกาสวาด (render) loader ก่อนจะเริ่มงานหนัก
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  function hideLoader() {
    if (!loaderEl) return;
    loaderEl.style.display = "none";
  }

  /***************************************************
   * Utility
   ***************************************************/
  function formatDate(d) {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return `${dt.getDate().toString().padStart(2,"0")}-${(dt.getMonth()+1).toString().padStart(2,"0")}-${dt.getFullYear()+543}`;
  }

  // ใช้เมื่อ backend ให้ row id จริงมา (เช่น r._row หรือ r.row)
  function computeRowFromData(r, i) {
    return r && (r._row || r.row || r.__row) ? (r._row || r.row || r.__row) : (i + 2);
  }

  /***************************************************
   * ROUTER
   ***************************************************/
  async function loadPage(page) {
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
      pageTitle.textContent = "📑 รายงาน LOG";
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

  window.loadPage = loadPage; // export globally
  loadPage("wait"); // default

  /***************************************************
   * WAIT PAGE
   ***************************************************/
async function renderWaitPage() {
  const data = await fetchJSON(URLS.WAIT);

  const LOCATIONS = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
  const STATUS = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

  let html = `
    <div style="margin-bottom:10px">
      <button id="refresh-wait" class="btn">รีเฟรช</button>
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
        <td>${r["วันที่"] || ""}</td>
        <td>${r["เวลา"] || ""}</td>
        <td><button class="btn move-log">✔</button></td>
        <td><button class="btn del-wait">🗑</button></td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  pageContent.innerHTML = html;

  // refresh
  document.getElementById("refresh-wait").onclick = renderWaitPage;

  // ==============================
  //   MOVE TO LOG
  // ==============================
  document.querySelectorAll(".move-log").forEach(btn => {
    btn.onclick = async function () {

      const tr = this.closest("tr");
      const row = tr.dataset.row;

      await showLoader("กำลังบันทึกลง LOG...");
      await new Promise(r => requestAnimationFrame(r));

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

      // ลบรายการจาก WAIT
      const del = new FormData();
      del.append("sheet", "WAIT");
      del.append("action", "delete");
      del.append("row", row);
      await fetchJSON(BASE, "POST", del);

      hideLoader();
      renderWaitPage();
    };
  });

  // DELETE from WAIT
  document.querySelectorAll(".del-wait").forEach(btn => {
    btn.onclick = async function () {
      const row = this.closest("tr").dataset.row;
      await showLoader("กำลังลบ...");
      await new Promise(r => requestAnimationFrame(r));

      const body = new FormData();
      body.append("sheet", "WAIT");
      body.append("action", "delete");
      body.append("row", row);
      await fetchJSON(BASE, "POST", body);

      hideLoader();
      renderWaitPage();
    };
  });
}
  /***************************************************
   * LIST PAGE
   ***************************************************/
  async function renderListPage() {
    const data = await fetchJSON(URLS.DATA);

    let html = `
      <h3>เพิ่มรายการใหม่</h3>
      <div style="margin-bottom:10px">
        <input id="new-code" placeholder="รหัสครุภัณฑ์">
        <input id="new-name" placeholder="ชื่อครุภัณฑ์">
        <button id="add-item" class="btn">เพิ่ม</button>
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

    data.forEach((r, i) => {
      const row = computeRowFromData(r, i);
      const codeRaw = r["รหัสครุภัณฑ์"] || "";
      const code = encodeURIComponent(codeRaw);
      const name = r["ชื่อครุภัณฑ์"] || "";

      const barcodeURL = `https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128&translate-esc=true`;
      const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${code}`;

      html += `<tr data-row="${row}">
        <td>${r["ลำดับ"] || (i+1)}</td>
        <td>${codeRaw}</td>
        <td>${name}</td>
        <td><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td>
        <td><img src="${qrURL}" alt="qr" style="height:60px;"></td>
        <td><button class="btn list-update">✔</button></td>
        <td><button class="btn list-delete">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // เพิ่มรายการใหม่
    const addBtn = document.getElementById("add-item");
    if (addBtn) addBtn.onclick = async () => {
      const code = document.getElementById("new-code").value;
      const name = document.getElementById("new-name").value;
      await showLoader("กำลังเพิ่ม...");
      await new Promise(r => requestAnimationFrame(r));
      const body = new FormData();
      body.append("sheet", "DATA");
      body.append("action", "add");
      body.append("code", code);
      body.append("name", name);
      await fetchJSON(BASE, "POST", body);
      hideLoader();
      await renderListPage();
    };

    // แก้ไข
    document.querySelectorAll(".list-update").forEach(btn => {
      btn.onclick = async function() {
        const tr = this.closest("tr");
        const row = tr.dataset.row;
        const code = tr.children[1].innerText.trim();
        const name = tr.children[2].innerText.trim();
        await showLoader("กำลังแก้ไข...");
        await new Promise(r => requestAnimationFrame(r));
        const body = new FormData();
        body.append("sheet", "DATA");
        body.append("action", "update");
        body.append("row", row);
        body.append("code", code);
        body.append("name", name);
        await fetchJSON(BASE, "POST", body);
        hideLoader();
        await renderListPage();
      };
    });

    // ลบ
    document.querySelectorAll(".list-delete").forEach(btn => {
      btn.onclick = async function() {
        const row = this.closest("tr").dataset.row;
        await showLoader("กำลังลบ...");
        await new Promise(r => requestAnimationFrame(r));
        const body = new FormData();
        body.append("sheet", "DATA");
        body.append("action", "delete");
        body.append("row", row);
        await fetchJSON(BASE, "POST", body);
        hideLoader();
        await renderListPage();
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
        <button id="add-user">เพิ่ม</button>
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

    const addUserBtn = document.getElementById("add-user");
    if (addUserBtn) addUserBtn.onclick = async () => {
      await showLoader("กำลังเพิ่มสมาชิก...");
      await new Promise(r => requestAnimationFrame(r));
      const body = new FormData();
      body.append("sheet","LOGIN");
      body.append("action","addUser");
      body.append("id",document.getElementById("u-id").value);
      body.append("pass",document.getElementById("u-pass").value);
      body.append("status",document.getElementById("u-status").value);
      body.append("name",document.getElementById("u-name").value);
      await fetchJSON(BASE,"POST",body);
      hideLoader();
      await renderUserPage();
    };

    document.querySelectorAll(".up-user").forEach(btn=>{
      btn.onclick=async function(){
        const tr=this.closest("tr");
        const row=tr.dataset.row;
        await showLoader("กำลังแก้ไขสมาชิก...");
        await new Promise(r => requestAnimationFrame(r));
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
        await renderUserPage();
      };
    });

    document.querySelectorAll(".del-user").forEach(btn=>{
      btn.onclick=async function(){
        const row=this.closest("tr").dataset.row;
        await showLoader("กำลังลบสมาชิก...");
        await new Promise(r => requestAnimationFrame(r));
        const body=new FormData();
        body.append("sheet","LOGIN");
        body.append("action","deleteUser");
        body.append("row",row);
        await fetchJSON(BASE,"POST",body);
        hideLoader();
        await renderUserPage();
      };
    });
  }

  /***************************************************
   * REPORT PAGE
   ***************************************************/
  async function renderReportPage() {
    const data = await fetchJSON(URLS.LOG);

    let html=`<table class="dash-table"><thead><tr>
      <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th>
      <th>รายละเอียดเพิ่มเติม</th><th>วันที่</th><th>เวลา</th>
    </tr></thead><tbody>`;

    data.forEach(r=>{
      html+=`<tr>
        <td>${r["รหัสครุภัณฑ์"] || ""}</td>
        <td>${r["ชื่อครุภัณฑ์"] || ""}</td>
        <td>${r["ที่เก็บ"] || ""}</td>
        <td>${r["สถานะ"] || ""}</td>
        <td>${r["รายละเอียดเพิ่มเติม"] || ""}</td>
        <td>${r["วันที่"] || ""}</td>
        <td>${r["เวลา"] || ""}</td>
      </tr>`;
    });

    html+="</tbody></table>";
    pageContent.innerHTML=html;
  }

  /***************************************************
   * MANUAL PAGE
   ***************************************************/
  function renderManualPage() {
    pageContent.innerHTML=`<h2>คู่มือการใช้งาน</h2><p>เพิ่มข้อความตามที่คุณต้องการ</p>`;
  }

});
