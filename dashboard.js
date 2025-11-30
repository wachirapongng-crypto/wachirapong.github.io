document.addEventListener("DOMContentLoaded", () => {
  const BASE = "https://script.google.com/macros/s/AKfycbwROFYuvsI-L2l8CtMQL4icViO20gqnRQmuxLNpPuPjmwSCFUPTD5v3ESFO-KALzbLjgw/exec";
  const SHEET_URL = { 
    DATA: `${BASE}?sheet=DATA`,
    WAIT: `${BASE}?sheet=WAIT`
  };

  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");
  const usernameEl = document.getElementById("username");

  usernameEl.textContent = localStorage.getItem("username") || "Admin";

  let cache = null;

  function escapeHTML(str) {
    return str?.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  async function fetchCORS(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    try { return JSON.parse(text); } catch { return []; }
  }

  function showPopup(msg="สำเร็จ", type="ok") {
    const div = document.createElement("div");
    div.className = `popup ${type}`;
    div.innerHTML = `<div>${escapeHTML(msg)}</div>`;
    document.body.appendChild(div);
    setTimeout(()=>div.remove(),2500);
  }

  // =============== ตั้งค่าให้โหลดหน้า WAIT ก่อน (ตามข้อ 1) ===============
  window.loadPage = async function(type) {
    closeNav();

    if(type === "wait") {
      pageTitle.textContent = "⌛ รายการรอตรวจสอบ";
      await renderWaitTable();
    }
    else if(type === "list") {
      pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
      await renderListTable();
    } 
    else if(type === "manual") {
      pageTitle.textContent = "📘 คู่มือการใช้งาน";
      renderManual();
    }
    else if(type === "user") {
      pageTitle.textContent = "👥 จัดการสมาชิก";
      await renderUserTable();
    }
  };

  // =============== WAIT TABLE ===============
  async function renderWaitTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.WAIT);

    let html = `<table class="dash-table"><thead>
      <tr>
        <th>ลำดับ</th><th>รายการ</th><th>วันที่</th>
      </tr></thead><tbody>`;

    data.forEach((row,i)=>{
      html += `<tr>
        <td>${i+1}</td>
        <td>${escapeHTML(row["รายการ"] || "")}</td>
        <td>${escapeHTML(row["วันที่"] || "")}</td>
      </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;
  }

  // =============== LIST TABLE (แก้ barcode/qr ให้แสดง) ===============
  async function renderListTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.DATA);
    cache = data;

    let html = `
      <div class="table-actions">
        <button id="add-item" class="btn primary">➕ เพิ่มรายการครุภัณฑ์</button>
        <button id="refresh-list" class="btn">รีเฟรช</button>
      </div>
    `;

    html += `<table class="dash-table"><thead>
      <tr>
        <th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th>
        <th>BarCode</th><th>QR Code</th>
        <th>แก้ไข</th><th>ลบ</th>
      </tr></thead><tbody>`;

    data.forEach((row,i)=>{
      const code = row["รหัส"] || "";
      const name = row["ชื่อ"] || "";

      const barcode = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128`;
      const qrcode = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(code)}`;

      html += `
        <tr data-row="${i+2}">
          <td>${i+1}</td>
          <td>${escapeHTML(code)}</td>
          <td>${escapeHTML(name)}</td>
          <td><img src="${barcode}" style="height:40px;"></td>
          <td><img src="${qrcode}" style="height:60px;"></td>
          <td><button class="btn edit-item" data-row="${i+2}">แก้ไข</button></td>
          <td><button class="btn delete-item" data-row="${i+2}">ลบ</button></td>
        </tr>`;
    });

    html += "</tbody></table>";
    pageContent.innerHTML = html;

    // รีเฟรช
    document.getElementById("refresh-list").addEventListener("click",()=>renderListTable());

    // ปุ่มเพิ่ม
    document.getElementById("add-item").addEventListener("click",()=>openEditModal(0,"",""));

    // ปุ่มแก้ไข
    pageContent.querySelectorAll(".edit-item").forEach(btn=>{
      btn.addEventListener("click",(e)=>{
        const tr = e.target.closest("tr");
        const code = tr.children[1].innerText;
        const name = tr.children[2].innerText;
        const row = btn.dataset.row;
        openEditModal(row, code, name);
      });
    });

    // ปุ่มลบ
    pageContent.querySelectorAll(".delete-item").forEach(btn=>{
      btn.addEventListener("click",async ()=>{
        const row = btn.dataset.row;
        const f = new FormData();
        f.append("sheet","DATA");
        f.append("action","delete");
        f.append("row",row);

        await fetchCORS(BASE,{method:"POST",body:f});
        showPopup("ลบสำเร็จ");
        await renderListTable();
      });
    });
  }

  // =============== ADD / EDIT MODAL ===============
  function openEditModal(row, code, name) {
    const modal = document.createElement("div");
    modal.className="modal";

    modal.innerHTML = `
      <div class="modal-content">
        <h3>${row==0 ? "เพิ่มรายการ" : "แก้ไขรายการ"}</h3>
        <form id="edit-form">
          <label>รหัสครุภัณฑ์:
            <input name="code" required value="${escapeHTML(code)}">
          </label>
          <label>ชื่อครุภัณฑ์:
            <input name="name" required value="${escapeHTML(name)}">
          </label>

          <div class="form-actions">
            <button class="btn primary" type="submit">ยืนยัน</button>
            <button class="btn" type="button" id="edit-cancel">ยกเลิก</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#edit-cancel").addEventListener("click",()=>modal.remove());

    modal.querySelector("#edit-form").addEventListener("submit", async ev=>{
      ev.preventDefault();
      
      const fd = new FormData(ev.target);
      const newCode = fd.get("code").trim();
      const newName = fd.get("name").trim();

      if(!newCode || !newName) return showPopup("กรอกให้ครบ","err");

      const f = new FormData();
      f.append("sheet", "DATA");
      f.append("action", row==0 ? "add" : "update");

      // ✔ ถ้าเพิ่ม ให้ดึงลำดับล่าสุดอัตโนมัติ (ตามข้อ 3)
      if(row == 0){
        const nextIndex = cache.length + 2; // +2 เพราะ header + row start from 2
        f.append("row", nextIndex);
      } 
      else {
        f.append("row", row);
      }

      f.append("data", JSON.stringify({รหัส:newCode, ชื่อ:newName}));

      await fetchCORS(BASE,{method:"POST",body:f});

      showPopup(row==0 ? "เพิ่มสำเร็จ" : "แก้ไขสำเร็จ");
      modal.remove();
      await renderListTable();
    });
  }

  function renderManual(){
    pageContent.innerHTML="<p>คู่มือการใช้งาน...</p>";
  }

  // =============== default load ===============
  (async()=>{ await loadPage("wait") })();
});
