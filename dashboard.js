// dashboard.js — วางทับไฟล์เดิม
document.addEventListener("DOMContentLoaded", () => {
  // ---------- config ----------
  const BASE = "https://script.google.com/macros/s/AKfycbwixv3fvgOqqE1OhJVV0pp7fvqLWXP1clMoMcYvHloVBDm6jBi9LQy4AXf0j8qjxnC6tA/exec";
  const SHEET_URL = {
    DATA: `${BASE}?sheet=DATA`,
    WAIT: `${BASE}?sheet=WAIT`,
    SHOW: `${BASE}?sheet=SHOW`,
    LOGIN: `${BASE}?sheet=LOGIN`,
    MEMBER: `${BASE}?sheet=MEMBER`
  };

  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");
  const usernameEl = document.getElementById("username");
  usernameEl.textContent = localStorage.getItem("username") || "Admin";

  // small cache to reduce flicker / speed up repeated views
  const cache = {
    WAIT: null,
    DATA: null,
    MEMBER: null
  };

  // ====== utility fetch (ไม่เซ็ต Content-Type ให้เอง) ======
  async function fetchCORS(url, options = {}) {
    const opt = {
      method: options.method || "GET",
      headers: { ...(options.headers || {}) },
      body: options.body || undefined
    };
    const res = await fetch(url, opt);
    const text = await res.text();
    try { return JSON.parse(text); } 
    catch { console.warn("GAS returned non-JSON:", text); return {}; }
  }

  function escapeHTML(str) {
    return str?.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --------- popup notification ----------
  function showPopup(msg = "สำเร็จ", type = "ok", timeout = 2500) {
    const existing = document.getElementById("dashboard-popup");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.id = "dashboard-popup";
    div.className = `popup ${type}`;
    div.innerHTML = `<div class="popup-msg">${escapeHTML(msg)}</div>`;
    document.body.appendChild(div);
    setTimeout(() => div.classList.add("visible"), 20);
    setTimeout(() => div.classList.remove("visible"), timeout);
    setTimeout(() => div.remove(), timeout + 500);
  }

  // --------- helper: close sidebar when menu clicked ----------
  window.loadPage = async function (type) {
    // close sidebar
    closeNav();
    pageContent.innerHTML = "";
    if (type === "wait") {
      pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
      await loadData("WAIT");
    } else if (type === "add") {
      pageTitle.textContent = "➕ เพิ่มรายการครุภัณฑ์";
      renderAddForm();
    } else if (type === "edit") {
      pageTitle.textContent = "✏️ แก้ไขรายการครุภัณฑ์";
      await renderEditTable();
    } else if (type === "list") {
      pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
      await renderListTable();
    } else if (type === "manual") {
      pageTitle.textContent = "📘 คู่มือการใช้งาน";
      renderManual();
    } else if (type === "user") {
      pageTitle.textContent = "👥 จัดการสมาชิก";
      await renderUserTable();
    }
  };

  // =====================================================
  // LOAD DATA (generic)
  // =====================================================
  async function loadData(sheet) {
    const url = sheet === "WAIT" ? SHEET_URL.WAIT : (sheet === "DATA" ? SHEET_URL.DATA : SHEET_URL.MEMBER);
    try {
      // use cache for small speed gain
      if (cache[sheet]) {
        pageContent.innerHTML = await renderTableGeneric(cache[sheet], sheet);
        return cache[sheet];
      }
      const data = await fetchCORS(url);
      cache[sheet] = data;
      pageContent.innerHTML = await renderTableGeneric(data, sheet);
      return data;
    } catch (err) {
      console.error(err);
      pageContent.innerHTML = "<p style='color:red;'>โหลดข้อมูลไม่ได้</p>";
      return [];
    }
  }

  // =====================================================
  // RENDER TABLE GENERIC (ใช้สำหรับ WAIT / DATA / MEMBER แบบยืดหยุ่น)
  // =====================================================
  async function renderTableGeneric(data, sheet) {
    // Note หัวตาราง
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;

    if (!data || data.length === 0) {
      html += "<p>ไม่พบข้อมูล</p>";
      return html;
    }

    html += "<table class='dash-table'><thead><tr>";
    const keys = Object.keys(data[0]);

    // customize WAIT: เพิ่มคอลัมน์เลือก/ลบ เหมือนเดิม
    if (sheet === "WAIT") {
      keys.unshift("เลือก");
      keys.push("ลบ");
    }

    keys.forEach(k => html += `<th>${escapeHTML(k)}</th>`);
    html += "</tr></thead><tbody>";

    data.forEach((row, i) => {
      const rowNumber = i + 2; // compensate header
      html += "<tr>";
      keys.forEach(k => {
        const val = (row[k] || row[k] === 0) ? row[k] : "";
        html += `<td>${renderCellGeneric(k, val, rowNumber)}</td>`;
      });
      html += "</tr>";
    });

    html += "</tbody></table>";

    if (sheet === "WAIT") {
      html += `<div class="table-actions"><button id="confirm-wait" class="btn primary">✔ ยืนยันรายการที่เลือก</button></div>`;
    }
    return html;
  }

  // QR detection columns
  const QR_COLUMNS = ["QR Code", "qr_code", "qr", "QR"];

  function renderCellGeneric(key, val, rowIndex) {
    const roomList = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
    const statusList = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

    if (typeof val === "object" && val !== null) {
      if (val.v) val = val.v;
      else return escapeHTML(JSON.stringify(val));
    }

    if (QR_COLUMNS.includes(key)) {
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(val)}" alt="qr">`;
    }
    if (key === "เลือก") {
      return `<input type="checkbox" class="wait-select" data-row="${rowIndex}">`;
    }
    if (key === "ลบ") {
      return `<button class="delete-btn" data-row="${rowIndex}" style="color:red;">ลบ</button>`;
    }
    if (key === "ที่อยู่") {
      return ` <select class="room-select" data-row="${rowIndex}">
          ${roomList.map(r => `<option value="${r}" ${val === r ? "selected" : ""}>${r}</option>`).join("")}
        </select>`;
    }
    if (key === "สถานะ") {
      return ` <select class="status-select" data-row="${rowIndex}">
          ${statusList.map(s => `<option value="${s}" ${val === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>`;
    }
    return escapeHTML(val);
  }

  // =====================================================
  // RENDER: add form
  // =====================================================
  function renderAddForm() {
    const html = `
      <div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>
      <form id="add-form" class="dash-form">
        <label>รหัสครุภัณฑ์ (B) <input type="text" name="code" required></label>
        <label>ชื่อครุภัณฑ์ (C) <input type="text" name="name" required></label>
        <div class="form-actions">
          <button type="submit" class="btn primary">เพิ่มรายการ</button>
          <button type="button" id="add-cancel" class="btn">ยกเลิก</button>
        </div>
      </form>
    `;
    pageContent.innerHTML = html;
    const form = document.getElementById("add-form");
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const formData = new FormData(form);
      const code = formData.get("code").trim();
      const name = formData.get("name").trim();
      if (!code || !name) return showPopup("กรอกให้ครบ", "err");
      // ต้องสร้างลำดับอัตโนมัติจากคอลัมน์ A: ขอให้ GAS จัดการบนฝั่ง server — ถ้าไม่ได้ให้เราอ่าน DATA แล้วนับแถว
      // เราจะอ่าน sheet DATA เพื่อจับลำดับใหม่:
      const data = await fetchCORS(SHEET_URL.DATA);
      const nextIndex = (data && data.length) ? data.length + 1 : 1;
      // ส่ง FormData ไป GAS
      const post = new FormData();
      post.append("sheet", "DATA");
      post.append("action", "add");
      post.append("data", JSON.stringify({
        ลำดับ: nextIndex,
        รหัส: code,
        ชื่อ: name
      }));
      await fetchCORS(BASE, { method: "POST", body: post });
      cache.DATA = null; // clear cache
      showPopup("เพิ่มสำเร็จ", "ok");
      // หลังเพิ่มให้ไปหน้า list อัตโนมัติ (และรีเฟรช)
      await renderListTable();
    });
    document.getElementById("add-cancel").addEventListener("click", () => {
      pageContent.innerHTML = "";
    });
  }

  // =====================================================
  // RENDER: edit table + edit form in modal
  // =====================================================
  async function renderEditTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.DATA);
    cache.DATA = data;
    // build table: ลำดับ(A)/รหัส(B)/ชื่อ(C)
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if (!data || data.length === 0) {
      html += "<p>ไม่พบข้อมูล</p>";
      pageContent.innerHTML = html;
      return;
    }
    html += `<table class="dash-table"><thead><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>จัดการ</th></tr></thead><tbody>`;
    data.forEach((row, i) => {
      const idx = i + 1;
      const code = escapeHTML(row["รหัส"] || row["B"] || row["b"] || "");
      const name = escapeHTML(row["ชื่อ"] || row["C"] || row["c"] || "");
      html += `<tr data-row="${i+2}">
                <td>${idx}</td>
                <td class="cell-code">${code}</td>
                <td class="cell-name">${name}</td>
                <td><button class="btn edit-item" data-row="${i+2}">แก้ไข</button></td>
              </tr>`;
    });
    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // delegate edit click
    pageContent.querySelectorAll(".edit-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const row = Number(e.target.dataset.row);
        const tr = e.target.closest("tr");
        const currentCode = tr.querySelector(".cell-code").innerText;
        const currentName = tr.querySelector(".cell-name").innerText;
        openEditModal(row, currentCode, currentName);
      });
    });
  }

  function openEditModal(row, code, name) {
    // modal form
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h3>แก้ไขรายการ (ลำดับ: ${row})</h3>
        <form id="edit-form">
          <label>รหัสครุภัณฑ์: <input name="code" required value="${escapeHTML(code)}"></label>
          <label>ชื่อครุภัณฑ์: <input name="name" required value="${escapeHTML(name)}"></label>
          <div class="form-actions">
            <button type="submit" class="btn primary">ยืนยัน</button>
            <button type="button" id="edit-cancel" class="btn">ยกเลิก</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    // handlers
    modal.querySelector("#edit-cancel").addEventListener("click", () => modal.remove());
    modal.querySelector("#edit-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const newCode = fd.get("code").trim();
      const newName = fd.get("name").trim();
      if (!newCode || !newName) return showPopup("กรอกให้ครบ", "err");
      const post = new FormData();
      post.append("sheet", "DATA");
      post.append("action", "update");
      post.append("row", String(row));
      post.append("data", JSON.stringify({ รหัส: newCode, ชื่อ: newName }));
      await fetchCORS(BASE, { method: "POST", body: post });
      cache.DATA = null;
      showPopup("แก้ไขสำเร็จ", "ok");
      modal.remove();
      await renderEditTable();
    });
  }

  // =====================================================
  // RENDER: list table (ลำดับ/รหัส/ชื่อ/BarCode/QR)
  // =====================================================
  async function renderListTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.DATA);
    cache.DATA = data;
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if (!data || data.length === 0) {
      html += "<p>ไม่พบข้อมูล</p>";
      pageContent.innerHTML = html;
      return;
    }
    html += `<div class="table-actions"><button id="refresh-list" class="btn">รีเฟรช</button></div>`;
    html += `<table class="dash-table"><thead><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>BarCode</th><th>QR Code</th></tr></thead><tbody>`;
    data.forEach((row, i) => {
      const idx = i + 1;
      const code = encodeURIComponent(row["รหัส"] || row["B"] || "");
      const name = escapeHTML(row["ชื่อ"] || row["C"] || "");
      // barcode placeholder: use barcode generator URL (เป็นภาพจาก text)
      const barcodeURL = `https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128&translate-esc=true`;
      const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${code}`;
      html += `<tr>
        <td>${idx}</td>
        <td>${escapeHTML(decodeURIComponent(code))}</td>
        <td>${name}</td>
        <td><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td>
        <td><img src="${qrURL}" alt="qr" style="height:60px;"></td>
      </tr>`;
    });
    html += "</tbody></table>";
    pageContent.innerHTML = html;
    document.getElementById("refresh-list").addEventListener("click", async () => {
      cache.DATA = null;
      await renderListTable();
    });
  }

  // =====================================================
  // RENDER: manual
  // =====================================================
  function renderManual() {
    pageContent.innerHTML = `
      <div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>
      <section class="manual">
        <h3>คู่มือการใช้งาน (ย่อ)</h3>
        <ol>
          <li>คลิกเมนูทางซ้ายเพื่อเลือกหน้าที่ต้องการ — แถบจะปิดอัตโนมัติ</li>
          <li>หน้าเพิ่ม (เพิ่ม): กรอกรหัสและชื่อ แล้วกด "เพิ่มรายการ"</li>
          <li>หน้าแก้ไข (แก้ไข): เลือกปุ่ม "แก้ไข" ในแถวที่ต้องการ เพื่อปรับข้อมูล และกดยืนยัน</li>
          <li>หน้ารายการทั้งหมด (รายการ): ดู Barcode/QR ของแต่ละรายการ และกดรีเฟรชเมื่อจำเป็น</li>
          <li>หน้า จัดการสมาชิก: เพิ่ม/แก้ไขสมาชิก (ข้อมูลจะถูกบันทึกใน sheet DATA)</li>
          <li>หมายเหตุ: การส่งข้อมูลขึ้น Google Sheets อาจใช้เวลาหลายวินาที ขึ้นกับเครือข่ายและการตอบกลับของ GAS</li>
        </ol>
      </section>
    `;
  }

  // =====================================================
  // RENDER: user management (ใช้ sheet DATA ตามที่ขอ)
  // =====================================================
  async function renderUserTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    // ตามคำสั่ง ใช้ sheet DATA
    const data = await fetchCORS(SHEET_URL.DATA);
    cache.DATA = data;
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    html += `<div class="table-actions"><button id="add-user" class="btn primary">➕ เพิ่มสมาชิก</button><button id="refresh-user" class="btn">รีเฟรช</button></div>`;
    html += `<table class="dash-table"><thead><tr><th>ID (A)</th><th>Pass (B)</th><th>Status (C)</th><th>Name (D)</th><th>จัดการ</th></tr></thead><tbody>`;
    // assume DATA sheet has columns or rows mapping — we will try to read keys "ID","Pass","Status","Name"
    if (data && data.length) {
      data.forEach((row, i) => {
        const id = escapeHTML(row["ID"] || row["A"] || "");
        const pass = escapeHTML(row["Pass"] || row["B"] || "");
        const status = escapeHTML(row["Status"] || row["C"] || "");
        const name = escapeHTML(row["Name"] || row["D"] || "");
        html += `<tr data-row="${i+2}">
                  <td>${id}</td>
                  <td>${pass}</td>
                  <td>${status}</td>
                  <td>${name}</td>
                  <td><button class="btn del-user" data-row="${i+2}">ลบ</button></td>
                 </tr>`;
      });
    } else {
      html += `<tr><td colspan="5">ไม่พบข้อมูลสมาชิก</td></tr>`;
    }
    html += `</tbody></table>`;
    pageContent.innerHTML = html;

    // handlers
    document.getElementById("add-user").addEventListener("click", () => openUserModal());
    document.getElementById("refresh-user").addEventListener("click", async () => {
      cache.DATA = null;
      await renderUserTable();
    });
    pageContent.querySelectorAll(".del-user").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const row = Number(e.target.dataset.row);
        const form = new FormData();
        form.append("sheet", "DATA");
        form.append("action", "delete");
        form.append("row", String(row));
        await fetchCORS(BASE, { method: "POST", body: form });
        cache.DATA = null;
        showPopup("ลบสมาชิกสำเร็จ", "ok");
        await renderUserTable();
      });
    });
  }

  function openUserModal() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h3>เพิ่มสมาชิก</h3>
        <form id="user-form">
          <label>ID (A): <input name="id" required></label>
          <label>Pass (B): <input name="pass" required></label>
          <label>Status (C): <input name="status" required></label>
          <label>Name (D): <input name="name" required></label>
          <div class="form-actions">
            <button class="btn primary" type="submit">ยืนยัน</button>
            <button class="btn" type="button" id="user-cancel">ยกเลิก</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#user-cancel").addEventListener("click", () => modal.remove());
    modal.querySelector("#user-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const id = fd.get("id").trim();
      const pass = fd.get("pass").trim();
      const status = fd.get("status").trim();
      const name = fd.get("name").trim();
      if (!id || !pass || !status || !name) return showPopup("กรอกให้ครบ", "err");
      // append to DATA sheet as a new row (assuming columns A-D)
      const post = new FormData();
      post.append("sheet", "DATA");
      post.append("action", "add");
      post.append("data", JSON.stringify({ ID: id, Pass: pass, Status: status, Name: name }));
      await fetchCORS(BASE, { method: "POST", body: post });
      cache.DATA = null;
      showPopup("เพิ่มสมาชิกสำเร็จ", "ok");
      modal.remove();
      await renderUserTable();
    });
  }

  // =====================================================
  // Event listeners: generic change/delete/confirm-wait
  // =====================================================
  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches(".room-select") || el.matches(".status-select")) {
      const payload = {
        row: Number(el.dataset.row),
        รหัส: el.closest("tr").children[1].innerText,
        ชื่อ: el.closest("tr").children[2].innerText,
        ที่อยู่: el.closest("tr").querySelector(".room-select").value,
        สถานะ: el.closest("tr").querySelector(".status-select").value,
        วันที่: el.closest("tr").children[5]?.innerText || "",
        เวลา: el.closest("tr").children[6]?.innerText || ""
      };
      const form = new FormData();
      form.append("sheet", "WAIT");
      form.append("action", "update");
      form.append("row", String(payload.row));
      form.append("data", JSON.stringify(payload));
      await fetchCORS(BASE, { method: "POST", body: form });
      showPopup("แก้ไขสำเร็จ", "ok");
    }
  });

  document.addEventListener("click", async (e) => {
    // delete in WAIT
    if (e.target.matches(".delete-btn")) {
      const row = Number(e.target.dataset.row);
      const form = new FormData();
      form.append("sheet", "WAIT");
      form.append("action", "delete");
      form.append("row", String(row));
      await fetchCORS(BASE, { method: "POST", body: form });
      cache.WAIT = null;
      showPopup("ลบสำเร็จ", "ok");
      await loadData("WAIT");
    }

    // confirm wait
    if (e.target && e.target.id === "confirm-wait") {
      const selected = [...document.querySelectorAll(".wait-select:checked")];
      for (const chk of selected) {
        const row = Number(chk.dataset.row);
        const form = new FormData();
        form.append("sheet", "WAIT");
        form.append("action", "moveWait");
        form.append("row", String(row));
        await fetchCORS(BASE, { method: "POST", body: form });
      }
      cache.WAIT = null;
      showPopup("ยืนยันรายการเรียบร้อย", "ok");
      await loadData("WAIT");
    }
  });

  // =====================================================
  // initial load: show wait page in body as requested
  // =====================================================
  (async () => {
    await loadPage("wait");
  })();

  // expose closeNav/openNav so HTML buttons still work
  window.openNav = function() {
    document.getElementById("mySidebar").style.width = "260px";
    document.getElementById("main").style.marginLeft = "260px";
  };
  window.closeNav = function() {
    document.getElementById("mySidebar").style.width = "0";
    document.getElementById("main").style.marginLeft = "0";
  };

  // =====================================================
  // Performance notes (in-code): small things done here:
  // - simple caching (cache.DATA / cache.WAIT) to avoid refetch if user switches back quickly
  // - minimal DOM re-render (only replacing pageContent.innerHTML)
  // Suggestions to speed more: enable gzip on hosting, reduce image sizes, optimize GAS script to return JSON only,
  // lazy-load images, and avoid heavy synchronous loops on the client.
  // =====================================================
});
