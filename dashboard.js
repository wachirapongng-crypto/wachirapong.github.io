/***************************************************
 * dashboard.js (full)
 * - loader auto-create ถ้าไม่มี
 * - popup(callback) รองรับ callback หลัง loader ปิด
 * - loadPage("wait") เป็นหน้าเริ่มต้น
 * - ส่งค่าไป LOG ด้วยชื่อคอลัมน์ตามชีทไทย
 ***************************************************/
document.addEventListener("DOMContentLoaded", () => {

  const BASE = "https://script.google.com/macros/s/AKfycbwixv3fvgOqqE1OhJVV0pp7fvqLWXP1clMoMcYvHloVBDm6jBi9LQy4AXf0j8qjxnC6tA/exec";

  const URLS = {
    DATA: BASE + "?sheet=DATA",
    WAIT: BASE + "?sheet=WAIT",
    LOG:  BASE + "?sheet=LOG",
    USER: BASE + "?sheet=LOGIN"
  };

  const pageTitle   = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");

  /* -------------------- ensure loader exists (auto-create) -------------------- */
  (function ensureLoader() {
    if (document.getElementById("loader")) return;

    const loader = document.createElement("div");
    loader.id = "loader";
    loader.style.position = "fixed";
    loader.style.top = "0";
    loader.style.left = "0";
    loader.style.width = "100%";
    loader.style.height = "100%";
    loader.style.background = "rgba(0,0,0,0.4)";
    loader.style.display = "none";
    loader.style.justifyContent = "center";
    loader.style.alignItems = "center";
    loader.style.zIndex = "9999";

    const spinner = document.createElement("div");
    spinner.className = "loader-spinner";
    // spinner styles
    spinner.style.width = "70px";
    spinner.style.height = "70px";
    spinner.style.border = "8px solid #ddd";
    spinner.style.borderTop = "8px solid #4CAF50";
    spinner.style.borderRadius = "50%";
    spinner.style.animation = "spin 0.9s linear infinite";

    // add keyframes style if not exists
    const styleId = "loader-keyframes-style";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
      .code-img{ width:100px; height:auto; max-height:120px; object-fit:contain; }`;
      document.head.appendChild(s);
    }

    loader.appendChild(spinner);
    document.body.appendChild(loader);
  })();

  /* -------------------- helpers -------------------- */
  async function fetchJSON(url, method = "GET", body = null) {
    try {
      const opt = method === "POST" ? { method: "POST", body } : { method: "GET" };
      const res = await fetch(url, opt);
      const text = await res.text();
      try { return JSON.parse(text); } catch { return []; }
    } catch (err) {
      console.error("fetchJSON error:", err);
      return [];
    }
  }

  /**
   * popup(after)
   * - แสดง loader แบบสั้น แล้วเรียก callback (after) เมื่อปิด
   * - ถ้า after เป็น null จะไม่เรียกอะไร
   */
  function popup(after = null) {
    const loader = document.getElementById("loader");
    if (!loader) {
      if (typeof after === "function") after();
      return;
    }
    loader.style.display = "flex";
    // ปรับเวลาตามต้องการ (ตอนนี้ 1.2 วินาที)
    setTimeout(() => {
      loader.style.display = "none";
      try { if (typeof after === "function") after(); } catch (e) { console.error(e); }
    }, 1200);
  }

  function formatDate(d) {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return `${dt.getDate().toString().padStart(2,"0")}-${(dt.getMonth()+1).toString().padStart(2,"0")}-${dt.getFullYear()+543}`;
  }

  /* -------------------- router -------------------- */
  window.loadPage = async function (page) {
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
  };

  /* ==================== SECTION: WAIT ==================== */
  async function renderWaitPage() {
    const data = await fetchJSON(URLS.WAIT);

    const LOC = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
    const STS = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

    let html = `
      <button id="refresh-wait" class="btn">รีเฟรช</button>
      <table class="dash-table">
        <thead>
          <tr>
            <th>รหัส</th><th>ชื่อ</th>
            <th>ที่อยู่</th><th>สถานะ</th>
            <th>หมายเหตุ</th><th>ย้ายเข้ารายงาน</th><th>ลบ</th>
          </tr>
        </thead><tbody>
    `;

    data.forEach((r, i) => {
      const row = i + 2;
      html += `
        <tr data-row="${row}">
          <td>${r["รหัส"]||""}</td>
          <td>${r["ชื่อ"]||""}</td>

          <td>
            <select class="wait-loc">
              ${LOC.map(v => `<option value="${v}" ${v===r["ที่อยู่"]?"selected":""}>${v}</option>`).join("")}
            </select>
          </td>

          <td>
            <select class="wait-status">
              ${STS.map(v => `<option value="${v}" ${v===r["สถานะ"]?"selected":""}>${v}</option>`).join("")}
            </select>
          </td>

          <td><input class="wait-note" placeholder="รายละเอียดเพิ่มเติม"></td>
          <td><button class="btn move-log">✔</button></td>
          <td><button class="btn del-wait">🗑</button></td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    document.getElementById("refresh-wait").onclick = renderWaitPage;

    /* move to LOG */
    document.querySelectorAll(".move-log").forEach(btn => {
      btn.onclick = async function () {
        const tr    = this.closest("tr");
        const row   = tr.dataset.row;

        const code   = tr.children[0].innerText || "";
        const name   = tr.children[1].innerText || "";
        const loc    = tr.querySelector(".wait-loc").value || "";
        const status = tr.querySelector(".wait-status").value || "";
        const note   = tr.querySelector(".wait-note").value || "";

        const now = new Date();
        const body = new FormData();

        // ส่งชื่อคีย์ตรงกับคอลัมน์ใน LOG sheet
        body.append("รหัสครุภัณฑ์", code);
        body.append("ชื่อครุภัณฑ์", name);
        body.append("ที่เก็บ", loc);
        body.append("สถานะ", status);
        body.append("รายละเอียดเพิ่มเติม", note);
        body.append("วันที่", formatDate(now));
        body.append("เวลา", now.toLocaleTimeString("th-TH"));

        await fetchJSON(BASE + "?sheet=LOG&action=add", "POST", body);

        // ลบ WAIT (โดยส่ง row)
        const del = new FormData();
        del.append("row", row);
        await fetchJSON(BASE + "?sheet=WAIT&action=delete", "POST", del);

        popup(() => renderWaitPage());
      };
    });

    /* delete WAIT */
    document.querySelectorAll(".del-wait").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;
        const del = new FormData();
        del.append("row", row);
        await fetchJSON(BASE + "?sheet=WAIT&action=delete", "POST", del);
        popup(() => renderWaitPage());
      };
    });
  }

  /* ==================== SECTION: LIST ==================== */
  async function renderListPage() {
    const data = await fetchJSON(URLS.DATA);

    let html = `
      <h3>เพิ่มรายการใหม่</h3>
      <div>
        <input id="new-code" placeholder="รหัส">
        <input id="new-name" placeholder="ชื่อ">
        <button id="add-item" class="btn">เพิ่ม</button>
      </div><hr>

      <table class="dash-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>รหัส</th>
            <th>ชื่อ</th>
            <th>Barcode</th>
            <th>QRCode</th>
            <th>แก้ไข</th>
            <th>ลบ</th>
          </tr>
        </thead><tbody>
    `;

    data.forEach((r, i) => {
      const row = i + 2;
      html += `
      <tr data-row="${row}">
        <td>${r["ลำดับ"]||""}</td>
        <td><input class="list-code" value="${r["รหัสครุภัณฑ์"]||""}"></td>
        <td><input class="list-name" value="${r["ชื่อครุภัณฑ์"]||""}"></td>

        <td>${r["barcode"] ? `<img src="${r["barcode"]}" class="code-img" alt="barcode">` : "-"}</td>
        <td>${r["qrcode"]  ? `<img src="${r["qrcode"]}" class="code-img" alt="qrcode">` : "-"}</td>

        <td><button class="btn list-update">✔</button></td>
        <td><button class="btn list-delete">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    /* add item */
    document.getElementById("add-item").onclick = async () => {
      const body = new FormData();
      body.append("code", document.getElementById("new-code").value || "");
      body.append("name", document.getElementById("new-name").value || "");

      await fetchJSON(BASE + "?sheet=DATA&action=add", "POST", body);
      popup(() => renderListPage());
    };

    /* update item */
    document.querySelectorAll(".list-update").forEach(btn => {
      btn.onclick = async function () {
        const tr  = this.closest("tr");
        const row = tr.dataset.row;

        const body = new FormData();
        body.append("row", row);
        body.append("code", tr.querySelector(".list-code").value || "");
        body.append("name", tr.querySelector(".list-name").value || "");

        await fetchJSON(BASE + "?sheet=DATA&action=update", "POST", body);
        popup(() => renderListPage());
      };
    });

    /* delete item */
    document.querySelectorAll(".list-delete").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;
        const body = new FormData();
        body.append("row", row);
        await fetchJSON(BASE + "?sheet=DATA&action=delete", "POST", body);
        popup(() => renderListPage());
      };
    });
  }

  /* ==================== SECTION: USER ==================== */
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
        <thead>
          <tr><th>ID</th><th>Pass</th><th>Status</th><th>Name</th><th>แก้ไข</th><th>ลบ</th></tr>
        </thead><tbody>
    `;

    data.forEach((u, i) => {
      const row = i + 2;
      html += `
      <tr data-row="${row}">
        <td><input class="u-id" value="${u["ID"]||""}"></td>
        <td><input class="u-pass" value="${u["Pass"]||""}"></td>
        <td>
          <select class="u-status">
            <option value="admin" ${u["Status"]==="admin"?"selected":""}>admin</option>
            <option value="employee" ${u["Status"]==="employee"?"selected":""}>employee</option>
          </select>
        </td>
        <td><input class="u-name" value="${u["name"]||""}"></td>

        <td><button class="btn up-user">✔</button></td>
        <td><button class="btn del-user">🗑</button></td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    /* add user */
    document.getElementById("add-user").onclick = async () => {
      const body = new FormData();
      body.append("id", document.getElementById("u-id").value || "");
      body.append("pass", document.getElementById("u-pass").value || "");
      body.append("status", document.getElementById("u-status").value || "");
      body.append("name", document.getElementById("u-name").value || "");

      await fetchJSON(BASE + "?sheet=LOGIN&action=addUser", "POST", body);
      popup(() => renderUserPage());
    };

    /* update user */
    document.querySelectorAll(".up-user").forEach(btn => {
      btn.onclick = async function () {
        const tr  = this.closest("tr");
        const row = tr.dataset.row;

        const body = new FormData();
        body.append("row", row);
        body.append("id", tr.querySelector(".u-id").value || "");
        body.append("pass", tr.querySelector(".u-pass").value || "");
        body.append("status", tr.querySelector(".u-status").value || "");
        body.append("name", tr.querySelector(".u-name").value || "");

        await fetchJSON(BASE + "?sheet=LOGIN&action=updateUser", "POST", body);
        popup(() => renderUserPage());
      };
    });

    /* delete user */
    document.querySelectorAll(".del-user").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;
        const body = new FormData();
        body.append("row", row);
        await fetchJSON(BASE + "?sheet=LOGIN&action=deleteUser", "POST", body);
        popup(() => renderUserPage());
      };
    });
  }

  /* ==================== SECTION: REPORT ==================== */
  async function renderReportPage() {
    const data = await fetchJSON(URLS.LOG);

    let html = `
      <table class="dash-table">
        <thead>
          <tr>
            <th>รหัสครุภัณฑ์</th>
            <th>ชื่อครุภัณฑ์</th>
            <th>ที่เก็บ</th>
            <th>สถานะ</th>
            <th>รายละเอียดเพิ่มเติม</th>
            <th>วันที่</th>
            <th>เวลา</th>
          </tr>
        </thead><tbody>
    `;

    data.forEach(r => {
      html += `
        <tr>
          <td>${r["รหัสครุภัณฑ์"]||""}</td>
          <td>${r["ชื่อครุภัณฑ์"]||""}</td>
          <td>${r["ที่เก็บ"]||""}</td>
          <td>${r["สถานะ"]||""}</td>
          <td>${r["รายละเอียดเพิ่มเติม"]||""}</td>
          <td>${r["วันที่"]||""}</td>
          <td>${r["เวลา"]||""}</td>
        </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;
  }

  /* ==================== SECTION: MANUAL ==================== */
  function renderManualPage() {
    pageContent.innerHTML = `
      <h2>คู่มือการใช้งาน</h2>
      <p>เพิ่มข้อความตามต้องการ</p>
    `;
  }

  // โหลดหน้าเริ่มต้นเป็น WAIT
  loadPage("wait");

});
