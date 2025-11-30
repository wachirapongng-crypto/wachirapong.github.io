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

  // simple cache for each sheet
  const cache = { WAIT: null, DATA: null, MEMBER: null };

  // fetch wrapper: GET or POST (supports FormData POST)
  async function fetchCORS(url, options = {}) {
    try {
      let res;
      if (options.method && options.method.toUpperCase() === "POST") {
        // assume options.body is FormData or similar
        res = await fetch(url, { method: "POST", body: options.body });
      } else {
        // GET
        res = await fetch(url, { method: "GET", headers: options.headers || {} });
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (err) {
        // sometimes GAS returns a CSV-ish or plain text — try to fallback gracefully
        console.warn("GAS returned non-JSON or parse failed:", text);
        // simple attempt: if text looks like array start
        if (text.trim().startsWith("[")) {
          try { return eval(text); } catch(e) { return []; }
        }
        return [];
      }
    } catch (err) {
      console.error("fetchCORS error:", err);
      throw err;
    }
  }

  function escapeHTML(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

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

  function formatDate(d) {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date)) return d;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear() + 543;
    return `${day}-${month}-${year}`;
  }

  // load page router
  window.loadPage = async function (type) {
    closeNav?.(); // if you have closeNav
    pageContent.innerHTML = "";
    if (type === "wait") { pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ"; await loadData("WAIT"); }
    else if (type === "add") { pageTitle.textContent = "➕ เพิ่มรายการครุภัณฑ์"; renderAddForm(); }
    else if (type === "edit") { pageTitle.textContent = "✏️ แก้ไขรายการครุภัณฑ์"; await renderEditTable(); }
    else if (type === "list") { pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด"; await renderListTable(); }
    else if (type === "manual") { pageTitle.textContent = "📘 คู่มือการใช้งาน"; renderManual(); }
    else if (type === "user") { pageTitle.textContent = "👥 จัดการสมาชิก"; await renderUserTable(); }
    else { pageTitle.textContent = "Dashboard"; pageContent.innerHTML = "<p>เลือกเมนูด้านซ้าย</p>"; }
  };

  // loadData for generic sheets
  async function loadData(sheet) {
    const url = sheet === "WAIT" ? SHEET_URL.WAIT : (sheet === "DATA" ? SHEET_URL.DATA : SHEET_URL.MEMBER);
    try {
      if (cache[sheet]) { pageContent.innerHTML = await renderTableGeneric(cache[sheet], sheet); return cache[sheet]; }
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

  // Generic table renderer used for WAIT and others (basic)
  async function renderTableGeneric(data, sheet) {
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if (!data || data.length === 0) { html += "<p>ไม่พบข้อมูล</p>"; return html; }

    html += `<table class='dash-table'><thead><tr>`;
    // keys from first object
    const keys = Object.keys(data[0]);
    // special columns for WAIT
    if (sheet === "WAIT") { keys.unshift("เลือก"); keys.push("ลบ"); }
    keys.forEach(k => html += `<th>${escapeHTML(k)}</th>`);
    html += `</tr></thead><tbody>`;

    data.forEach((row, i) => {
      const rowNumber = i + 2;
      html += `<tr>`;
      keys.forEach(k => {
        let val = (row[k] || row[k] === 0) ? row[k] : "";
        if ((k === "วันที่" || k === "เวลา") && val) val = formatDate(val);
        html += `<td>${renderCellGeneric(k, val, rowNumber, row)}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    if (sheet === "WAIT") html += `<div class="table-actions"><button id="confirm-wait" class="btn primary">✔ ยืนยันรายการที่เลือก</button></div>`;
    return html;
  }

  // QR column detection
  const QR_COLUMNS = ["QR Code", "qr_code", "qr", "QR"];

  function renderCellGeneric(key, val, rowIndex, fullRow = {}) {
    const roomList = ["501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
    const statusList = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];
    if (typeof val === "object" && val !== null) {
      if (val.v) val = val.v;
      else return escapeHTML(JSON.stringify(val));
    }
    if (QR_COLUMNS.includes(key)) {
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(val || "")}" alt="qr">`;
    }
    if (key === "เลือก") return `<input type="checkbox" class="wait-select" data-row="${rowIndex}">`;
    if (key === "ลบ") return `<button class="delete-btn" data-row="${rowIndex}" style="color:red;">ลบ</button>`;
    if (key === "ที่อยู่") {
      return `<select class="room-select" data-row="${rowIndex}">${roomList.map(r => `<option value="${r}"${String(val) === String(r) ? " selected" : ""}>${r}</option>`).join("")}</select>`;
    }
    if (key === "สถานะ") {
      return `<select class="status-select" data-row="${rowIndex}">${statusList.map(s => `<option value="${s}"${String(val) === String(s) ? " selected" : ""}>${s}</option>`).join("")}</select>`;
    }
    return escapeHTML(val);
  }

  // ---------- Add form ----------
  function renderAddForm() {
    const html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>
      <form id="add-form" class="dash-form">
        <label>รหัสครุภัณฑ์ (B) <input type="text" name="code" required></label>
        <label>ชื่อครุภัณฑ์ (C) <input type="text" name="name" required></label>
        <div class="form-actions">
          <button type="submit" class="btn primary">เพิ่มรายการ</button>
          <button type="button" id="add-cancel" class="btn">ยกเลิก</button>
        </div>
      </form>`;
    pageContent.innerHTML = html;

    const form = document.getElementById("add-form");
    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      const formData = new FormData(form);
      const code = formData.get("code").trim();
      const name = formData.get("name").trim();
      if (!code || !name) return showPopup("กรอกให้ครบ", "err");
      const data = await fetchCORS(SHEET_URL.DATA);
      const nextIndex = (data && data.length) ? data.length + 1 : 1;
      const post = new FormData();
      post.append("sheet", "DATA");
      post.append("action", "add");
      // use keys matching sheet: try 'รหัสครุภัณฑ์' and 'ชื่อครุภัณฑ์'
      post.append("data", JSON.stringify({ ลำดับ: nextIndex, "รหัสครุภัณฑ์": code, "ชื่อครุภัณฑ์": name }));
      await fetchCORS(BASE, { method: "POST", body: post });
      cache.DATA = null; showPopup("เพิ่มสำเร็จ", "ok");
      await renderListTable();
    });

    document.getElementById("add-cancel").addEventListener("click", () => { pageContent.innerHTML = ""; });
  }

  // ---------- Edit table (for DATA) ----------
  async function renderEditTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.DATA); cache.DATA = data;
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if (!data || data.length === 0) { html += "<p>ไม่พบข้อมูล</p>"; pageContent.innerHTML = html; return; }
    html += `<table class="dash-table"><thead><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>จัดการ</th></tr></thead><tbody>`;
    data.forEach((row, i) => {
      const idx = i + 1;
      // support multiple possible keys
      const code = escapeHTML(row["รหัสครุภัณฑ์"] || row["รหัส"] || row["B"] || row["b"] || "");
      const name = escapeHTML(row["ชื่อครุภัณฑ์"] || row["ชื่อ"] || row["C"] || row["c"] || "");
      html += `<tr data-row="${i + 2}"><td>${idx}</td><td class="cell-code">${code}</td><td class="cell-name">${name}</td><td><button class="btn edit-item" data-row="${i + 2}">แก้ไข</button></td></tr>`;
    });
    html += `</tbody></table>`;
    pageContent.innerHTML = html;

    pageContent.querySelectorAll(".edit-item").forEach(btn => {
      btn.addEventListener("click", e => {
        const row = Number(e.target.dataset.row);
        const tr = e.target.closest("tr");
        const currentCode = tr.querySelector(".cell-code").innerText;
        const currentName = tr.querySelector(".cell-name").innerText;
        openEditModal(row, currentCode, currentName);
      });
    });
  }

  function openEditModal(row, code, name) {
    const modal = document.createElement("div"); modal.className = "modal";
    modal.innerHTML = `<div class="modal-content"><h3>แก้ไขรายการ (ลำดับ: ${row})</h3>
      <form id="edit-form">
        <label>รหัสครุภัณฑ์: <input name="code" required value="${escapeHTML(code)}"></label>
        <label>ชื่อครุภัณฑ์: <input name="name" required value="${escapeHTML(name)}"></label>
        <div class="form-actions">
          <button type="submit" class="btn primary">ยืนยัน</button>
          <button type="button" id="edit-cancel" class="btn">ยกเลิก</button>
        </div>
      </form></div>`;
    document.body.appendChild(modal);
    modal.querySelector("#edit-cancel").addEventListener("click", () => modal.remove());
    modal.querySelector("#edit-form").addEventListener("submit", async ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const newCode = fd.get("code").trim();
      const newName = fd.get("name").trim();
      if (!newCode || !newName) return showPopup("กรอกให้ครบ", "err");
      const post = new FormData();
      post.append("sheet", "DATA");
      post.append("action", "update");
      post.append("row", String(row));
      // send keys matching sheet
      post.append("data", JSON.stringify({ "รหัสครุภัณฑ์": newCode, "ชื่อครุภัณฑ์": newName }));
      await fetchCORS(BASE, { method: "POST", body: post });
      cache.DATA = null;
      showPopup("แก้ไขสำเร็จ", "ok");
      modal.remove();
      await renderEditTable();
    });
  }

  // ---------- List table (main DATA list) ----------
  async function renderListTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.DATA); cache.DATA = data;
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if (!data || data.length === 0) { html += "<p>ไม่พบข้อมูล</p>"; pageContent.innerHTML = html; return; }
    html += `<div class="table-actions"><button id="refresh-list" class="btn">รีเฟรช</button><button id="add-item" class="btn primary">➕ เพิ่ม</button></div>`;
    html += `<table class="dash-table"><thead><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>BarCode</th><th>QR Code</th><th>แก้ไข</th><th>ลบ</th></tr></thead><tbody>`;

    data.forEach((row, i) => {
      const idx = i + 1;
      const rawCode = row["รหัสครุภัณฑ์"] || row["รหัส"] || row["B"] || "";
      const code = encodeURIComponent(rawCode || "");
      const name = escapeHTML(row["ชื่อครุภัณฑ์"] || row["ชื่อ"] || row["C"] || "");
      const barcodeURL = `https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128&translate-esc=true`;
      const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${code}`;
      html += `<tr data-row="${i + 2}"><td>${idx}</td><td>${escapeHTML(decodeURIComponent(code))}</td><td>${name}</td><td><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td><td><img src="${qrURL}" alt="qr" style="height:60px;"></td><td><button class="btn edit-item" data-row="${i + 2}">แก้ไข</button></td><td><button class="btn del-item" data-row="${i + 2}" style="color:red;">ลบ</button></td></tr>`;
    });

    html += `</tbody></table>`;
    pageContent.innerHTML = html;

    document.getElementById("refresh-list").addEventListener("click", async () => { cache.DATA = null; await renderListTable(); });
    document.getElementById("add-item").addEventListener("click", () => renderAddForm());

    pageContent.querySelectorAll(".edit-item").forEach(btn => {
      btn.addEventListener("click", e => {
        const row = Number(e.target.dataset.row);
        const tr = e.target.closest("tr");
        const currentCode = tr.children[1].innerText;
        const currentName = tr.children[2].innerText;
        openEditModal(row, currentCode, currentName);
      });
    });

    pageContent.querySelectorAll(".del-item").forEach(btn => {
      btn.addEventListener("click", async e => {
        if (!confirm("ต้องการลบรายการนี้จริงหรือไม่?")) return;
        const row = Number(e.target.dataset.row);
        const form = new FormData();
        form.append("sheet", "DATA");
        form.append("action", "delete");
        form.append("row", String(row));
        await fetchCORS(BASE, { method: "POST", body: form });
        cache.DATA = null; showPopup("ลบสำเร็จ", "ok");
        await renderListTable();
      });
    });
  }

  // ---------- Manual ----------
  function renderManual() {
    pageContent.innerHTML = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>
      <section class="manual">
        <h3>คู่มือการใช้งาน (ย่อ)</h3>
        <ol>
          <li>คลิกเมนูทางซ้ายเพื่อเลือกหน้าที่ต้องการ — แถบจะปิดอัตโนมัติ</li>
          <li>หน้าเพิ่ม (เพิ่ม): กรอกรหัสและชื่อ แล้วกด "เพิ่มรายการ"</li>
          <li>หน้าแก้ไข (แก้ไข): เลือกปุ่ม "แก้ไข" ในแถวที่ต้องการ เพื่อปรับข้อมูล และกดยืนยัน</li>
          <li>หน้ารายการทั้งหมด (รายการ): ดู Barcode/QR ของแต่ละรายการ และกดรีเฟรชเมื่อจำเป็น</li>
          <li>หน้า จัดการสมาชิก: เพิ่ม/แก้ไขสมาชิก (ข้อมูลจะถูกบันทึกใน sheet MEMBER)</li>
          <li>หมายเหตุ: การส่งข้อมูลขึ้น Google Sheets อาจใช้เวลาหลายวินาที ขึ้นกับเครือข่ายและการตอบกลับของ GAS</li>
        </ol>
      </section>`;
  }

  // ---------- User/Member management ----------
  async function renderUserTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.MEMBER); cache.MEMBER = data;
    let html = `<div class="note">จัดการสมาชิก — เพิ่ม/แก้ไข/ลบ</div>`;
    if (!data || data.length === 0) { html += `<div><button id="add-member" class="btn primary">➕ เพิ่มสมาชิก</button><p>ไม่พบสมาชิก</p></div>`; pageContent.innerHTML = html; document.getElementById("add-member")?.addEventListener("click", openAddMemberModal); return; }
    html += `<div class="table-actions"><button id="refresh-member" class="btn">รีเฟรช</button><button id="add-member" class="btn primary">➕ เพิ่มสมาชิก</button></div>`;
    html += `<table class="dash-table"><thead><tr><th>#</th><th>ชื่อ</th><th>username</th><th>email</th><th>แก้ไข</th><th>ลบ</th></tr></thead><tbody>`;
    data.forEach((row, i) => {
      const idx = i + 1;
      const name = escapeHTML(row["ชื่อ"] || row["name"] || row["displayName"] || "");
      const username = escapeHTML(row["username"] || row["user"] || row["usern"] || "");
      const email = escapeHTML(row["email"] || row["อีเมล"] || "");
      html += `<tr data-row="${i + 2}"><td>${idx}</td><td class="m-name">${name}</td><td class="m-username">${username}</td><td class="m-email">${email}</td><td><button class="btn edit-member" data-row="${i + 2}">แก้ไข</button></td><td><button class="btn del-member" data-row="${i + 2}" style="color:red;">ลบ</button></td></tr>`;
    });
    html += `</tbody></table>`;
    pageContent.innerHTML = html;

    document.getElementById("refresh-member").addEventListener("click", async () => { cache.MEMBER = null; await renderUserTable(); });
    document.getElementById("add-member").addEventListener("click", openAddMemberModal);

    pageContent.querySelectorAll(".edit-member").forEach(btn => {
      btn.addEventListener("click", e => {
        const row = Number(e.target.dataset.row);
        const tr = e.target.closest("tr");
        const currentName = tr.querySelector(".m-name").innerText;
        const currentUsername = tr.querySelector(".m-username").innerText;
        const currentEmail = tr.querySelector(".m-email").innerText;
        openEditMemberModal(row, currentName, currentUsername, currentEmail);
      });
    });

    pageContent.querySelectorAll(".del-member").forEach(btn => {
      btn.addEventListener("click", async e => {
        if (!confirm("ต้องการลบสมาชิกนี้จริงหรือไม่?")) return;
        const row = Number(e.target.dataset.row);
        const form = new FormData();
        form.append("sheet", "MEMBER");
        form.append("action", "delete");
        form.append("row", String(row));
        await fetchCORS(BASE, { method: "POST", body: form });
        cache.MEMBER = null; showPopup("ลบสมาชิกสำเร็จ", "ok");
        await renderUserTable();
      });
    });
  }

  function openAddMemberModal() {
    const modal = document.createElement("div"); modal.className = "modal";
    modal.innerHTML = `<div class="modal-content"><h3>เพิ่มสมาชิก</h3>
      <form id="member-add-form">
        <label>ชื่อ: <input name="name" required></label>
        <label>username: <input name="username" required></label>
        <label>email: <input name="email" type="email"></label>
        <div class="form-actions">
          <button type="submit" class="btn primary">เพิ่ม</button>
          <button type="button" id="member-add-cancel" class="btn">ยกเลิก</button>
        </div>
      </form></div>`;
    document.body.appendChild(modal);
    modal.querySelector("#member-add-cancel").addEventListener("click", () => modal.remove());
    modal.querySelector("#member-add-form").addEventListener("submit", async ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const name = fd.get("name").trim();
      const user = fd.get("username").trim();
      const email = fd.get("email").trim();
      if (!name || !user) return showPopup("กรอกให้ครบ", "err");
      const post = new FormData();
      post.append("sheet", "MEMBER");
      post.append("action", "add");
      post.append("data", JSON.stringify({ name: name, username: user, email: email }));
      await fetchCORS(BASE, { method: "POST", body: post });
      cache.MEMBER = null; showPopup("เพิ่มสมาชิกสำเร็จ", "ok");
      modal.remove();
      await renderUserTable();
    });
  }

  function openEditMemberModal(row, name, username, email) {
    const modal = document.createElement("div"); modal.className = "modal";
    modal.innerHTML = `<div class="modal-content"><h3>แก้ไขสมาชิก (ลำดับ: ${row})</h3>
      <form id="member-edit-form">
        <label>ชื่อ: <input name="name" required value="${escapeHTML(name)}"></label>
        <label>username: <input name="username" required value="${escapeHTML(username)}"></label>
        <label>email: <input name="email" type="email" value="${escapeHTML(email)}"></label>
        <div class="form-actions">
          <button type="submit" class="btn primary">บันทึก</button>
          <button type="button" id="member-edit-cancel" class="btn">ยกเลิก</button>
        </div>
      </form></div>`;
    document.body.appendChild(modal);
    modal.querySelector("#member-edit-cancel").addEventListener("click", () => modal.remove());
    modal.querySelector("#member-edit-form").addEventListener("submit", async ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const newName = fd.get("name").trim();
      const newUser = fd.get("username").trim();
      const newEmail = fd.get("email").trim();
      if (!newName || !newUser) return showPopup("กรอกให้ครบ", "err");
      const post = new FormData();
      post.append("sheet", "MEMBER");
      post.append("action", "update");
      post.append("row", String(row));
      post.append("data", JSON.stringify({ name: newName, username: newUser, email: newEmail }));
      await fetchCORS(BASE, { method: "POST", body: post });
      cache.MEMBER = null; showPopup("แก้ไขสมาชิกสำเร็จ", "ok");
      modal.remove();
      await renderUserTable();
    });
  }

  // ========= Event listeners =========
  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches(".room-select") || el.matches(".status-select")) {
      // build payload from row cells; careful with indexes — try to map by header names if possible
      const tr = el.closest("tr");
      const payload = {
        row: Number(el.dataset.row),
        รหัส: tr.children[1]?.innerText || "",
        ชื่อ: tr.children[2]?.innerText || "",
        ที่อยู่: tr.querySelector(".room-select")?.value || "",
        สถานะ: tr.querySelector(".status-select")?.value || "",
        วันที่: tr.children[5]?.innerText || "",
        เวลา: tr.children[6]?.innerText || ""
      };
      const form = new FormData(); form.append("sheet", "WAIT"); form.append("action", "update"); form.append("row", String(payload.row)); form.append("data", JSON.stringify(payload));
      await fetchCORS(BASE, { method: "POST", body: form });
      showPopup("แก้ไขสำเร็จ", "ok", 1500);
    }
  });

  document.addEventListener("click", async (e) => {
    // confirm wait
    if (e.target && e.target.id === "confirm-wait") {
      const selected = [...document.querySelectorAll(".wait-select:checked")];
      for (const chk of selected) {
        const row = Number(chk.dataset.row);
        const form = new FormData();
        form.append("sheet", "WAIT"); form.append("action", "moveWait"); form.append("targetSheet", "LOG"); form.append("row", String(row));
        await fetchCORS(BASE, { method: "POST", body: form });
      }
      cache.WAIT = null; showPopup("ยืนยันรายการเรียบร้อย", "ok");
      await loadData("WAIT");
    }

    // delete row in generic table (if you used 'ลบ' button)
    if (e.target && e.target.classList.contains("delete-btn")) {
      if (!confirm("ลบแถวนี้จริงหรือไม่?")) return;
      const row = Number(e.target.dataset.row);
      // assume WAIT sheet if exists in current view; try both
      const form = new FormData();
      form.append("sheet", "WAIT");
      form.append("action", "delete");
      form.append("row", String(row));
      await fetchCORS(BASE, { method: "POST", body: form });
      cache.WAIT = null; showPopup("ลบสำเร็จ", "ok");
      await loadData("WAIT");
    }
  });

  // load default page
  loadPage("wait");
});
