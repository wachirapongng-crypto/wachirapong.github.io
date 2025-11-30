/***************************************************
 * dashboard.js — Updated
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

  async function fetchJSON(url, method = "GET", body = null) {
    try {
      const opt = method === "POST" ? { method: "POST", body } : { method: "GET" };
      const res = await fetch(url, opt);
      const text = await res.text();
      try { return JSON.parse(text); } catch { return []; }
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  /* ---------- Loader ---------- */
  async function showLoader(message="กำลังประมวลผล...") {
    const loader = document.getElementById("loader");
    loader.innerHTML = `<div class="loader-spinner"></div><p>${message}</p>`;
    loader.style.display = "flex";
    await new Promise(resolve => setTimeout(resolve, 200)); // ให้ loader render ก่อน fetch
  }

  function hideLoader() {
    const loader = document.getElementById("loader");
    loader.style.display = "none";
  }

  function formatDate(d) {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return `${dt.getDate().toString().padStart(2,"0")}-${(dt.getMonth()+1).toString().padStart(2,"0")}-${dt.getFullYear()+543}`;
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
  loadPage("wait"); // โหลดหน้า wait เป็น default

  /***************************************************
   * WAIT PAGE
   ***************************************************/
  async function renderWaitPage() {
    const data = await fetchJSON(URLS.WAIT);

    const LOCATIONS = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
    const STATUS = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

    let html = `
      <button id="refresh-wait" class="btn">รีเฟรช</button>
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
        </thead><tbody>
    `;

    data.forEach((r,i)=>{
      const row = i+2;
      html += `
      <tr data-row="${row}">
        <td>${r["รหัส"]}</td>
        <td>${r["ชื่อ"]}</td>
        <td>
          <select class="wait-loc">
            ${LOCATIONS.map(v=>`<option value="${v}" ${v===r["ที่อยู่"]?"selected":""}>${v}</option>`).join("")}
          </select>
        </td>
        <td>
          <select class="wait-status">
            ${STATUS.map(v=>`<option value="${v}" ${v===r["สถานะ"]?"selected":""}>${v}</option>`).join("")}
          </select>
        </td>
        <td><input class="wait-note" value="${r["หมายเหตุ"] || ""}" placeholder="รายละเอียดเพิ่มเติม"></td>
        <td>${r["วันที่"]}</td>
        <td>${r["เวลา"]}</td>
        <td><button class="btn move-log">✔</button></td>
        <td><button class="btn del-wait">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    document.getElementById("refresh-wait").onclick = renderWaitPage;

    document.querySelectorAll(".move-log").forEach(btn=>{
      btn.onclick = async function(){
        const tr = this.closest("tr");
        const row = tr.dataset.row;

        await showLoader("กำลังบันทึกลง LOG...");
        const body = new FormData();
        body.append("sheet","LOG");
        body.append("action","add");
        body.append("code", tr.children[0].innerText);
        body.append("name", tr.children[1].innerText);
        body.append("loc", tr.querySelector(".wait-loc").value);
        body.append("status", tr.querySelector(".wait-status").value);
        body.append("note", tr.querySelector(".wait-note").value);
        body.append("date", tr.children[5].innerText);
        body.append("time", tr.children[6].innerText);

        await fetchJSON(BASE + "?sheet=LOG&action=add","POST",body);

        // ลบ WAIT
        const del = new FormData();
        del.append("sheet","WAIT");
        del.append("action","delete");
        del.append("row",row);
        await fetchJSON(BASE,"POST",del);

        hideLoader();
        await renderWaitPage();
      };
    });

    document.querySelectorAll(".del-wait").forEach(btn=>{
      btn.onclick = async function(){
        const row = this.closest("tr").dataset.row;
        await showLoader("กำลังลบ...");
        const body = new FormData();
        body.append("sheet","WAIT");
        body.append("action","delete");
        body.append("row",row);
        await fetchJSON(BASE,"POST",body);
        hideLoader();
        await renderWaitPage();
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
    <div>
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
    const row = i + 2;
    const codeRaw = r["รหัสครุภัณฑ์"] || "";
    const code = encodeURIComponent(codeRaw);
    const name = r["ชื่อครุภัณฑ์"] || "";

    // ใช้ URL สำหรับ Barcode และ QR Code
    const barcodeURL = `https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128&translate-esc=true`;
    const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${code}`;

    html += `<tr data-row="${row}">
      <td>${r["ลำดับ"]}</td>
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
  document.getElementById("add-item").onclick = async () => {
    const code = document.getElementById("new-code").value;
    const name = document.getElementById("new-name").value;
    await showLoader("กำลังเพิ่ม...");
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
      const code = tr.children[1].innerText; // ใช้ค่าที่แสดง
      const name = tr.children[2].innerText;
      await showLoader("กำลังแก้ไข...");
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

// Loader functions
async function showLoader(message = "กำลังโหลด...") {
  const loader = document.getElementById("loader");
  loader.querySelector(".loader-text").textContent = message;
  loader.style.display = "flex";
}

function hideLoader() {
  const loader = document.getElementById("loader");
  loader.style.display = "none";
}


  /***************************************************
   * USER PAGE
   ***************************************************/
  async function renderUserPage() {
    const data = await fetchJSON(URLS.USER);

    let html = `
      <h3>เพิ่มสมาชิก</h3>
      <div>
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
      const row=i+2;
      html += `<tr data-row="${row}">
        <td><input class="u-id" value="${u["ID"]}"></td>
        <td><input class="u-pass" value="${u["Pass"]}"></td>
        <td>
          <select class="u-status">
            <option value="admin" ${u["Status"]==="admin"?"selected":""}>admin</option>
            <option value="employee" ${u["Status"]==="employee"?"selected":""}>employee</option>
          </select>
        </td>
        <td><input class="u-name" value="${u["name"]}"></td>
        <td><button class="btn up-user">✔</button></td>
        <td><button class="btn del-user">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    document.getElementById("add-user").onclick=async ()=>{
      await showLoader("กำลังเพิ่มสมาชิก...");
      const body=new FormData();
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
        <td>${r["รหัสครุภัณฑ์"]}</td>
        <td>${r["ชื่อครุภัณฑ์"]}</td>
        <td>${r["ที่เก็บ"]}</td>
        <td>${r["สถานะ"]}</td>
        <td>${r["รายละเอียดเพิ่มเติม"]}</td>
        <td>${r["วันที่"]}</td>
        <td>${r["เวลา"]}</td>
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
  loadpage("wait");
});
