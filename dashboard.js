/***************************************************
 * SECTION 0 — CONFIG & HELPERS
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
      const opt = method === "POST"
        ? { method: "POST", body }
        : { method: "GET" };

      const res = await fetch(url, opt);
      const text = await res.text();

      try {
        return JSON.parse(text);
      } catch {
        return [];
      }
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  /* ---------- Loader popup แทน alert ---------- */
  function popup(message="กำลังโหลด...", callback=null) {
    const loader = document.getElementById("loader");
    if (!loader) { if(callback) callback(); return; }

    loader.innerHTML = `<div class="loader-spinner"></div><p style="color:#fff;margin-top:12px;">${message}</p>`;
    loader.style.display = "flex";

    return () => { // callback หลัง loader ปิด
      loader.style.display = "none";
      if (callback) callback();
    };
  }

  function formatDate(d) {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return `${dt.getDate().toString().padStart(2, "0")}-${(dt.getMonth()+1)
      .toString().padStart(2,"0")}-${dt.getFullYear() + 543}`;
  }


/***************************************************
 * SECTION 1 — ROUTER
 ***************************************************/
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

  // โหลดหน้าเริ่มต้นเป็น wait
  loadPage("wait");


/***************************************************
 * SECTION 2 — WAIT PAGE (รอตรวจสอบ)
 ***************************************************/
  async function renderWaitPage() {
    const data = await fetchJSON(URLS.WAIT);

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
            <th>ย้ายเข้ารายงาน</th>
            <th>ลบ</th>
          </tr>
        </thead>
        <tbody>
    `;

    const LOCATIONS = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
    const STATUS = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

    data.forEach((r, i) => {
      const row = i + 2;

      html += `
        <tr data-row="${row}">
          <td>${r["รหัส"]}</td>
          <td>${r["ชื่อ"]}</td>

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

          <td><input class="wait-note" placeholder="รายละเอียดเพิ่มเติม"></td>
          <td><button class="btn move-log">✔</button></td>
          <td><button class="btn del-wait">🗑</button></td>
        </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    document.getElementById("refresh-wait").onclick = renderWaitPage;

    document.querySelectorAll(".move-log").forEach(btn => {
      btn.onclick = async function () {
        const tr = this.closest("tr");
        const row = tr.dataset.row;

        const loc = tr.querySelector(".wait-loc").value;
        const status = tr.querySelector(".wait-status").value;
        const note = tr.querySelector(".wait-note").value;

        const now = new Date();

        // ดึงค่าที่มีอยู่จาก WAIT: รหัส, ชื่อ, วันที่, เวลา
        const code = tr.children[0].innerText;
        const name = tr.children[1].innerText;
        const date = data[row-2]["วันที่"] || formatDate(now);
        const time = data[row-2]["เวลา"] || now.toLocaleTimeString("th-TH");

        const body = new FormData();
        body.append("sheet", "LOG");
        body.append("action", "add");
        body.append("code", code);
        body.append("name", name);
        body.append("loc", loc);
        body.append("status", status);
        body.append("note", note);
        body.append("date", date);
        body.append("time", time);

        const done = popup("กำลังย้ายไป LOG...");
        await fetchJSON(BASE + "?sheet=LOG&action=add", "POST", body);
        done();

        // ลบ WAIT
        const delBody = new FormData();
        delBody.append("sheet", "WAIT");
        delBody.append("action", "delete");
        delBody.append("row", row);
        const delDone = popup("กำลังลบจาก WAIT...");
        await fetchJSON(BASE, "POST", delBody);
        delDone(() => renderWaitPage());
      };
    });

    document.querySelectorAll(".del-wait").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;

        const body = new FormData();
        body.append("sheet", "WAIT");
        body.append("action", "delete");
        body.append("row", row);

        const done = popup("กำลังลบ...");
        await fetchJSON(BASE, "POST", body);
        done(() => renderWaitPage());
      };
    });
  }


/***************************************************
 * SECTION 3 — LIST PAGE
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
            <th>รหัส</th>
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

      html += `
        <tr data-row="${row}">
          <td>${r["ลำดับ"]}</td>
          <td><input class="list-code" value="${r["รหัสครุภัณฑ์"]}"></td>
          <td><input class="list-name" value="${r["ชื่อครุภัณฑ์"]}"></td>

          <td>${r["barcode"] ? `<img src="${r["barcode"]}" class="code-img">` : "-"}</td>
          <td>${r["qrcode"] ? `<img src="${r["qrcode"]}" class="code-img">` : "-"}</td>

          <td><button class="btn list-update">✔</button></td>
          <td><button class="btn list-delete">🗑</button></td>
        </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    document.getElementById("add-item").onclick = async () => {
      const code = document.getElementById("new-code").value;
      const name = document.getElementById("new-name").value;

      const body = new FormData();
      body.append("sheet", "DATA");
      body.append("action", "add");
      body.append("code", code);
      body.append("name", name);

      const done = popup("กำลังเพิ่ม...");
      await fetchJSON(BASE, "POST", body);
      done(() => renderListPage());
    };

    document.querySelectorAll(".list-update").forEach(btn => {
      btn.onclick = async function () {
        const tr = this.closest("tr");
        const row = tr.dataset.row;

        const code = tr.querySelector(".list-code").value;
        const name = tr.querySelector(".list-name").value;

        const body = new FormData();
        body.append("sheet", "DATA");
        body.append("action", "update");
        body.append("row", row);
        body.append("code", code);
        body.append("name", name);

        const done = popup("กำลังแก้ไข...");
        await fetchJSON(BASE, "POST", body);
        done(() => renderListPage());
      };
    });

    document.querySelectorAll(".list-delete").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;

        const body = new FormData();
        body.append("sheet", "DATA");
        body.append("action", "delete");
        body.append("row", row);

        const done = popup("กำลังลบ...");
        await fetchJSON(BASE, "POST", body);
        done(() => renderListPage());
      };
    });
  }


/***************************************************
 * SECTION 4 — USER PAGE
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
      </div>
      <hr>

      <table class="dash-table">
        <thead>
          <tr><th>ID</th><th>Pass</th><th>Status</th><th>Name</th><th>แก้ไข</th><th>ลบ</th></tr>
        </thead><tbody>
    `;

    data.forEach((u, i) => {
      const row = i + 2;

      html += `
        <tr data-row="${row}">
          <td><input class="u-id" value="${u["ID"]}"></td>
          <td><input class="u-pass" value="${u["Pass"]}"></td>

          <td>
            <select class="u-status">
              <option value="admin" ${u["Status"] === "admin" ? "selected" : ""}>admin</option>
              <option value="employee" ${u["Status"] === "employee" ? "selected" : ""}>employee</option>
            </select>
          </td>

          <td><input class="u-name" value="${u["name"]}"></td>
          <td><button class="btn up-user">✔</button></td>
          <td><button class="btn del-user">🗑</button></td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    document.getElementById("add-user").onclick = async () => {
      const body = new FormData();
      body.append("sheet", "LOGIN");
      body.append("action", "addUser");
      body.append("id", document.getElementById("u-id").value);
      body.append("pass", document.getElementById("u-pass").value);
      body.append("status", document.getElementById("u-status").value);
      body.append("name", document.getElementById("u-name").value);

      const done = popup("กำลังเพิ่มสมาชิก...");
      await fetchJSON(BASE, "POST", body);
      done(() => renderUserPage());
    };

    document.querySelectorAll(".up-user").forEach(btn => {
      btn.onclick = async function () {
        const tr = this.closest("tr");
        const row = tr.dataset.row;

        const body = new FormData();
        body.append("sheet", "LOGIN");
        body.append("action", "updateUser");
        body.append("row", row);
        body.append("id", tr.querySelector(".u-id").value);
        body.append("pass", tr.querySelector(".u-pass").value);
        body.append("status", tr.querySelector(".u-status").value);
        body.append("name", tr.querySelector(".u-name").value);

        const done = popup("กำลังแก้ไขสมาชิก...");
        await fetchJSON(BASE, "POST", body);
        done(() => renderUserPage());
      };
    });

    document.querySelectorAll(".del-user").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;

        const body = new FormData();
        body.append("sheet", "LOGIN");
        body.append("action", "deleteUser");
        body.append("row", row);

        const done = popup("กำลังลบสมาชิก...");
        await fetchJSON(BASE, "POST", body);
        done(() => renderUserPage());
      };
    });
  }


/***************************************************
 * SECTION 5 — REPORT PAGE
 ***************************************************/
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
          <td>${r["รหัสครุภัณฑ์"]}</td>
          <td>${r["ชื่อครุภัณฑ์"]}</td>
          <td>${r["ที่เก็บ"]}</td>
          <td>${r["สถานะ"]}</td>
          <td>${r["รายละเอียดเพิ่มเติม"]}</td>
          <td>${r["วันที่"]}</td>
          <td>${r["เวลา"]}</td>
        </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;
  }


/***************************************************
 * SECTION 6 — MANUAL PAGE
 ***************************************************/
  function renderManualPage() {
    pageContent.innerHTML = `
      <h2>คู่มือการใช้งาน</h2>
      <p>เพิ่มข้อความตามที่คุณต้องการ</p>
    `;
  }
loadpage("wait");
});
