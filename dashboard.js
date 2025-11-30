// dashboard.js (แก้ไข)
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

  const cache = { WAIT: null, DATA: null, MEMBER: null };

  async function fetchCORS(url, options = {}) {
    try {
      let res;
      if (options.method && options.method.toUpperCase() === "POST") {
        res = await fetch(url, { method: "POST", body: options.body });
      } else {
        res = await fetch(url, { method: "GET", headers: options.headers || {} });
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (err) {
        console.warn("GAS returned non-JSON or parse failed:", text);
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

  // router
  window.loadPage = async function (type) {
    closeNav?.();
    pageContent.innerHTML = "";
    if (type === "wait") { pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ"; await loadData("WAIT"); }
    else if (type === "add") { pageTitle.textContent = "➕ เพิ่มรายการครุภัณฑ์"; renderAddForm(); }
    else if (type === "edit") { pageTitle.textContent = "✏️ แก้ไขรายการครุภัณฑ์"; await renderEditTable(); }
    else if (type === "list") { pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด"; await renderListTable(); }
    else if (type === "manual") { pageTitle.textContent = "📘 คู่มือการใช้งาน"; renderManual(); }
    else if (type === "user") { pageTitle.textContent = "👥 จัดการสมาชิก"; await renderUserTable(); }
    else { pageTitle.textContent = "Dashboard"; pageContent.innerHTML = "<p>เลือกเมนูด้านซ้าย</p>"; }
  };

  // loadData
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

  // Generic renderer (keeps sheetRow correct -> i+2)
  async function renderTableGeneric(data, sheet) {
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if (!data || data.length === 0) { html += "<p>ไม่พบข้อมูล</p>"; return html; }

    const keysFromSheet = Object.keys(data[0]);
    const headers = [...keysFromSheet];
    if (sheet === "WAIT") {
      headers.unshift("เลือก");
      headers.push("ลบ");
    }

    html += `<table class='dash-table'><thead><tr>`;
    headers.forEach(k => html += `<th>${escapeHTML(k)}</th>`);
    html += `</tr></thead><tbody>`;

    data.forEach((row, i) => {
      const sheetRow = i + 2; // important: actual Google Sheet row
      html += `<tr data-row="${sheetRow}">`;
      headers.forEach(k => {
        let val = (row[k] || row[k] === 0) ? row[k] : "";
        if ((k === "วันที่" || k === "เวลา") && val) val = formatDate(val);
        html += `<td>${renderCellGeneric(k, val, sheetRow, row)}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    if (sheet === "WAIT") html += `<div class="table-actions"><button id="confirm-wait" class="btn primary">✔ ยืนยันรายการที่เลือก</button></div>`;
    return html;
  }

  const QR_COLUMNS = ["QR Code", "qr_code", "qr", "QR"];

  function renderCellGeneric(key, val, sheetRow, fullRow = {}) {
    const roomList = ["501", "502", "503", "401", "401A", "401B", "401C", "402", "403", "404", "405", "ห้องพักครู", "301", "302"];
    const statusList = ["ใช้งานได้", "ชำรุด", "เสื่อมสภาพ", "หมดอายุการใช้งาน", "ไม่รองรับการใช้งาน"];
    if (typeof val === "object" && val !== null) {
      if (val.v) val = val.v;
      else return escapeHTML(JSON.stringify(val));
    }
    if (QR_COLUMNS.includes(key)) {
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(val || "")}" alt="qr">`;
    }
    if (key === "เลือก") return `<input type="checkbox" class="wait-select" data-row="${sheetRow}">`;
    if (key === "ลบ") return `<button class="delete-btn" data-row="${sheetRow}" style="color:red;">ลบ</button>`;
    if (key === "ที่อยู่") {
      return `<select class="room-select" data-row="${sheetRow}">${roomList.map(r => `<option value="${r}"${String(val) === String(r) ? " selected" : ""}>${r}</option>`).join("")}</select>`;
    }
    if (key === "สถานะ") {
      return `<select class="status-select" data-row="${sheetRow}">${statusList.map(s => `<option value="${s}"${String(val) === String(s) ? " selected" : ""}>${s}</option>`).join("")}</select>`;
    }
    return escapeHTML(val);
  }

  // ---------- Add ----------
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

      // IMPORTANT: send keys that exactly match your sheet headers
      const post = new FormData();
      post.append("sheet", "DATA");
      post.append("action", "add");
      post.append("data", JSON.stringify({ "รหัสครุภัณฑ์": code, "ชื่อครุภัณฑ์": name }));

      try {
        await fetchCORS(BASE, { method: "POST", body: post });
        cache.DATA = null; showPopup("เพิ่มสำเร็จ", "ok");
        await renderListTable();
      } catch (err) {
        console.error(err); showPopup("เพิ่มไม่สำเร็จ", "err");
      }
    });

    document.getElementById("add-cancel").addEventListener("click", () => { pageContent.innerHTML = ""; });
  }

  // ---------- Edit table ----------
  async function renderEditTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.DATA); cache.DATA = data;
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if (!data || data.length === 0) { html += "<p>ไม่พบข้อมูล</p>"; pageContent.innerHTML = html; return; }
    html += `<table class="dash-table"><thead><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>จัดการ</th></tr></thead><tbody>`;
    data.forEach((row, i) => {
      const sheetRow = i + 2;
      const idx = i + 1;
      const code = escapeHTML(row["รหัสครุภัณฑ์"] || row["รหัส"] || row["B"] || row["b"] || "");
      const name = escapeHTML(row["ชื่อครุภัณฑ์"] || row["ชื่อ"] || row["C"] || row["c"] || "");
      html += `<tr data-row="${sheetRow}"><td>${idx}</td><td class="cell-code">${code}</td><td class="cell-name">${name}</td><td><button class="btn edit-item" data-row="${sheetRow}">แก้ไข</button></td></tr>`;
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
      post.append("row", String(row)); // <-- important: send real sheet row
      post.append("data", JSON.stringify({ "รหัสครุภัณฑ์": newCode, "ชื่อครุภัณฑ์": newName }));
      try {
        await fetchCORS(BASE, { method: "POST", body: post });
        cache.DATA = null;
        showPopup("แก้ไขสำเร็จ", "ok");
        modal.remove();
        await renderEditTable();
      } catch (err) {
        console.error(err); showPopup("แก้ไขไม่สำเร็จ", "err");
      }
    });
  }

  // ---------- List table ----------
  async function renderListTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.DATA); cache.DATA = data;
    let html = `<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if (!data || data.length === 0) { html += "<p>ไม่พบข้อมูล</p>"; pageContent.innerHTML = html; return; }
    html += `<div class="table-actions"><button id="refresh-list" class="btn">รีเฟรช</button><button id="add-item" class="btn primary">➕ เพิ่ม</button></div>`;
    html += `<table class="dash-table"><thead><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>BarCode</th><th>QR Code</th><th>แก้ไข</th><th>ลบ</th></tr></thead><tbody>`;

    data.forEach((row, i) => {
      const sheetRow = i + 2;
      const idx = i + 1;
      const rawCode = row["รหัสครุภัณฑ์"] || row["รหัส"] || row["B"] || "";
      const codeForImage = encodeURIComponent(rawCode || "");
      const name = escapeHTML(row["ชื่อครุภัณฑ์"] || row["ชื่อ"] || row["C"] || "");
      const barcodeURL = `https://barcode.tec-it.com/barcode.ashx?data=${codeForImage}&code=Code128&translate-esc=true`;
      const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${codeForImage}`;
      html += `<tr data-row="${sheetRow}"><td>${idx}</td><td>${escapeHTML(rawCode)}</td><td>${name}</td><td><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td><td><img src="${qrURL}" alt="qr" style="height:60px;"></td><td><button class="btn edit-item" data-row="${sheetRow}">แก้ไข</button></td><td><button class="btn del-item" data-row="${sheetRow}" style="color:red;">ลบ</button></td></tr>`;
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
        try {
          await fetchCORS(BASE, { method: "POST", body: form });
          cache.DATA = null; showPopup("ลบสำเร็จ", "ok");
          await renderListTable();
        } catch (err) {
          console.error(err); showPopup("ลบไม่สำเร็จ", "err");
        }
      });
    });
  }

  // ---------- Manual (same) ----------
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

  // ======================================================
// ========== ระบบจัดการสมาชิก (LOGIN SHEET) ===========
// ======================================================

// โหลดตารางสมาชิก
async function renderUserTable() {
  pageContent.innerHTML = "<p>กำลังโหลด...</p>";

  const data = await fetchCORS(SHEET_URL.LOGIN);
  cache.MEMBER = data;

  let html = `
    <div class="table-actions">
      <button id="add-user-btn" class="btn primary">➕ เพิ่มสมาชิก</button>
    </div>
    <table class="dash-table">
      <thead>
        <tr>
          <th>ลำดับ</th>
          <th>ID</th>
          <th>Pass</th>
          <th>Status</th>
          <th>name</th>
          <th>แก้ไข</th>
          <th>ลบ</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach((row, i) => {
    const sheetRow = i + 2;
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHTML(row.ID)}</td>
        <td>${escapeHTML(row.Pass)}</td>
        <td>${escapeHTML(row.Status)}</td>
        <td>${escapeHTML(row.name)}</td>
        <td><button class="btn edit-user" data-row="${sheetRow}">แก้ไข</button></td>
        <td><button class="btn del-user" data-row="${sheetRow}" style="color:red;">ลบ</button></td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  pageContent.innerHTML = html;

  // ปุ่มเปิดฟอร์มเพิ่ม
  document.getElementById("add-user-btn").addEventListener("click", () => openAddUserModal());

  // ปุ่มแก้ไข
  pageContent.querySelectorAll(".edit-user").forEach(btn => {
    btn.addEventListener("click", e => {
      const row = Number(e.target.dataset.row);
      const record = data[row - 2];
      openEditUserModal(row, record);
    });
  });

  // ปุ่มลบ
  pageContent.querySelectorAll(".del-user").forEach(btn => {
    btn.addEventListener("click", async e => {
      if (!confirm("ต้องการลบสมาชิกนี้จริงหรือไม่?")) return;
      const row = Number(e.target.dataset.row);

      const form = new FormData();
      form.append("sheet", "LOGIN");
      form.append("action", "delete");
      form.append("row", String(row));

      await fetchCORS(BASE, { method: "POST", body: form });
      showPopup("ลบสำเร็จ", "ok");
      renderUserTable();
    });
  });
}



// =================================================================
// ======================== Modal ฟอร์มเพิ่ม ========================
// =================================================================

function openAddUserModal() {
  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content">
      <h3>➕ เพิ่มสมาชิก</h3>
      <form id="add-user-form">
        <label>ID: <input type="text" name="ID" required></label>
        <label>Pass: <input type="text" name="Pass" required></label>

        <label>Status:
          <select name="Status" required>
            <option value="admin">admin</option>
            <option value="employee">employee</option>
          </select>
        </label>

        <label>name: <input type="text" name="name" required></label>

        <div class="form-actions">
          <button type="submit" class="btn primary">บันทึก</button>
          <button type="button" class="btn" id="cancel-add-user">ยกเลิก</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#cancel-add-user").addEventListener("click", () => modal.remove());

  modal.querySelector("#add-user-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);

    const payload = {
      ID: fd.get("ID").trim(),
      Pass: fd.get("Pass").trim(),
      Status: fd.get("Status").trim(),
      name: fd.get("name").trim()
    };

    const post = new FormData();
    post.append("sheet", "LOGIN");
    post.append("action", "add");
    post.append("data", JSON.stringify(payload));

    await fetchCORS(BASE, { method: "POST", body: post });

    showPopup("เพิ่มสมาชิกสำเร็จ", "ok");
    modal.remove();
    renderUserTable();
  });
}



// =================================================================
// ======================== Modal ฟอร์มแก้ไข ========================
// =================================================================

function openEditUserModal(row, rec) {
  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content">
      <h3>✏️ แก้ไขสมาชิก</h3>
      <form id="edit-user-form">
        <label>ID: <input type="text" name="ID" required value="${escapeHTML(rec.ID)}"></label>
        <label>Pass: <input type="text" name="Pass" required value="${escapeHTML(rec.Pass)}"></label>

        <label>Status:
          <select name="Status" required>
            <option value="admin" ${rec.Status === "admin" ? "selected" : ""}>admin</option>
            <option value="employee" ${rec.Status === "employee" ? "selected" : ""}>employee</option>
          </select>
        </label>

        <label>name: <input type="text" name="name" required value="${escapeHTML(rec.name)}"></label>

        <div class="form-actions">
          <button type="submit" class="btn primary">บันทึก</button>
          <button type="button" class="btn" id="cancel-edit-user">ยกเลิก</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#cancel-edit-user").addEventListener("click", () => modal.remove());

  modal.querySelector("#edit-user-form").addEventListener("submit", async ev => {
    ev.preventDefault();

    const fd = new FormData(ev.target);

    const payload = {
      ID: fd.get("ID").trim(),
      Pass: fd.get("Pass").trim(),
      Status: fd.get("Status").trim(),
      name: fd.get("name").trim()
    };

    const post = new FormData();
    post.append("sheet", "LOGIN");
    post.append("action", "update");
    post.append("row", String(row));
    post.append("data", JSON.stringify(payload));

    await fetchCORS(BASE, { method: "POST", body: post });

    showPopup("แก้ไขสำเร็จ", "ok");
    modal.remove();
    renderUserTable();
  });
}
  // initial
  loadPage("wait");
});
