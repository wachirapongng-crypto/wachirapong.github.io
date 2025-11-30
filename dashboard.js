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

  const cache = { WAIT: null, DATA: null, USER: null };

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

  function popup(msg, type = "ok") {
    alert(msg); /* เอาแบบง่าย ใช้ alert แทน popup */
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


/***************************************************
 * SECTION 2 — WAIT PAGE (ตรวจสอบของที่รอ)
 * ฟีเจอร์:
 * - แก้ไขที่อยู่ / สถานะ / หมายเหตุ
 * - ย้ายลง LOG
 * - ลบ WAIT
 * - ปุ่มรีเฟรช
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

    data.forEach((r, i) => {
      const row = i + 2;

      html += `
        <tr data-row="${row}">
          <td>${r["รหัส"]}</td>
          <td>${r["ชื่อ"]}</td>
          <td><input class="wait-loc" value="${r["ที่อยู่"] || ""}"></td>
          <td><input class="wait-status" value="${r["สถานะ"] || ""}"></td>
          <td><input class="wait-note" placeholder="รายละเอียดเพิ่มเติม"></td>
          <td><button class="btn move-log">✔</button></td>
          <td><button class="btn del-wait">🗑</button></td>
        </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    document.getElementById("refresh-wait").onclick = renderWaitPage;

    // กดปุ่มย้ายเข้า LOG
    document.querySelectorAll(".move-log").forEach(btn => {
      btn.onclick = async function () {
        const tr = this.closest("tr");
        const row = tr.dataset.row;

        const loc = tr.querySelector(".wait-loc").value;
        const status = tr.querySelector(".wait-status").value;
        const note = tr.querySelector(".wait-note").value;

        const now = new Date();
        const body = new FormData();
        body.append("sheet", "LOG");
        body.append("action", "add");
        body.append("code", tr.children[0].innerText);
        body.append("name", tr.children[1].innerText);
        body.append("loc", loc);
        body.append("status", status);
        body.append("note", note);
        body.append("date", formatDate(now));
        body.append("time", now.toLocaleTimeString("th-TH"));

        await fetchJSON(BASE + "?sheet=LOG&action=add", "POST", body);

        // ลบของใน WAIT
        const del = new FormData();
        del.append("sheet", "WAIT");
        del.append("action", "delete");
        del.append("row", row);
        await fetchJSON(BASE, "POST", del);

        popup("บันทึกลง LOG แล้ว");
        renderWaitPage();
      };
    });

    // ลบแถว WAIT
    document.querySelectorAll(".del-wait").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;

        const body = new FormData();
        body.append("sheet", "WAIT");
        body.append("action", "delete");
        body.append("row", row);
        await fetchJSON(BASE, "POST", body);

        popup("ลบสำเร็จ");
        renderWaitPage();
      };
    });
  }


/***************************************************
 * SECTION 3 — LIST PAGE (ข้อมูลครุภัณฑ์ทั้งหมด)
 * ฟีเจอร์:
 * - เพิ่มรายการใหม่
 * - แก้ไขรหัส/ชื่อ
 * - ลบได้
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
          <td><button class="btn list-update">✔</button></td>
          <td><button class="btn list-delete">🗑</button></td>
        </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // เพิ่มข้อมูลใหม่
    document.getElementById("add-item").onclick = async () => {
      const code = document.getElementById("new-code").value;
      const name = document.getElementById("new-name").value;

      const body = new FormData();
      body.append("sheet", "DATA");
      body.append("action", "add");
      body.append("code", code);
      body.append("name", name);

      await fetchJSON(BASE, "POST", body);
      popup("เพิ่มสำเร็จ");
      renderListPage();
    };

    // แก้ไข
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

        await fetchJSON(BASE, "POST", body);
        popup("แก้ไขสำเร็จ");
      };
    });

    // ลบ
    document.querySelectorAll(".list-delete").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;

        const body = new FormData();
        body.append("sheet", "DATA");
        body.append("action", "delete");
        body.append("row", row);

        await fetchJSON(BASE, "POST", body);
        popup("ลบแล้ว");
        renderListPage();
      };
    });
  }


/***************************************************
 * SECTION 4 — USER PAGE (จัดการสมาชิก)
 * ฟีเจอร์: เพิ่ม / แก้ไข / ลบ
 ***************************************************/
  async function renderUserPage() {
    const data = await fetchJSON(URLS.USER);

    let html = `
      <h3>เพิ่มสมาชิก</h3>
      <div>
        <input id="u-id" placeholder="ID">
        <input id="u-pass" placeholder="Pass">
        <input id="u-status" placeholder="Status">
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
          <td><input class="u-status" value="${u["Status"]}"></td>
          <td><input class="u-name" value="${u["name"]}"></td>
          <td><button class="btn up-user">✔</button></td>
          <td><button class="btn del-user">🗑</button></td>
        </tr>
      `;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // เพิ่มสมาชิก
    document.getElementById("add-user").onclick = async () => {
      const body = new FormData();
      body.append("sheet", "LOGIN");
      body.append("action", "addUser");
      body.append("id", document.getElementById("u-id").value);
      body.append("pass", document.getElementById("u-pass").value);
      body.append("status", document.getElementById("u-status").value);
      body.append("name", document.getElementById("u-name").value);
      await fetchJSON(BASE, "POST", body);
      popup("เพิ่มสมาชิกสำเร็จ");
      renderUserPage();
    };

    // อัปเดตสมาชิก
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

        await fetchJSON(BASE, "POST", body);
        popup("แก้ไขสำเร็จ");
      };
    });

    // ลบสมาชิก
    document.querySelectorAll(".del-user").forEach(btn => {
      btn.onclick = async function () {
        const row = this.closest("tr").dataset.row;

        const body = new FormData();
        body.append("sheet", "LOGIN");
        body.append("action", "deleteUser");
        body.append("row", row);

        await fetchJSON(BASE, "POST", body);
        popup("ลบสมาชิกแล้ว");
        renderUserPage();
      };
    });
  }


/***************************************************
 * SECTION 5 — REPORT PAGE (อ่าน LOG)
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

});
