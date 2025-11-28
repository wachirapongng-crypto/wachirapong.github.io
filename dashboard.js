document.addEventListener("DOMContentLoaded", () => {
  const BASE = "https://script.google.com/macros/s/AKfycbwROFYuvsI-L2l8CtMQL4icViO20gqnRQmuxLNpPuPjmwSCFUPTD5v3ESFO-KALzbLjgw/exec";
  const SHEET_URL = { DATA: `${BASE}?sheet=DATA` };
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

  window.loadPage = async function(type) {
    closeNav();
    if(type === "list") {
      pageTitle.textContent = "📋 รายการครุภัณฑ์ทั้งหมด";
      await renderListTable();
    } else if(type === "manual") {
      pageTitle.textContent = "📘 คู่มือการใช้งาน";
      renderManual();
    } else if(type === "user") {
      pageTitle.textContent = "👥 จัดการสมาชิก";
      await renderUserTable();
    }
  };

  // ======= render list table + add/edit modal =======
  async function renderListTable() {
    pageContent.innerHTML = "<p>กำลังโหลด...</p>";
    const data = await fetchCORS(SHEET_URL.DATA);
    cache = data;

    let html = `<div class="table-actions">
      <button id="add-item" class="btn primary">➕ เพิ่มรายการครุภัณฑ์</button>
      <button id="refresh-list" class="btn">รีเฟรช</button>
    </div>`;

    html += `<table class="dash-table"><thead>
      <tr>
        <th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th>
        <th>BarCode</th><th>QR Code</th><th>แก้ไข</th><th>ลบ</th>
      </tr></thead><tbody>`;

    data.forEach((row,i)=>{
      const idx=i+1;
      const code=row["รหัส"]||row["B"]||"";
      const name=row["ชื่อ"]||row["C"]||"";
      const bcURL=`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128`;
      const qrURL=`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(code)}`;
      html += `<tr data-row="${i+2}">
        <td>${idx}</td>
        <td>${escapeHTML(code)}</td>
        <td>${escapeHTML(name)}</td>
        <td><img src="${bcURL}" style="height:40px;"></td>
        <td><img src="${qrURL}" style="height:60px;"></td>
        <td><button class="btn edit-item" data-row="${i+2}">แก้ไข</button></td>
        <td><button class="btn delete-item" data-row="${i+2}">ลบ</button></td>
      </tr>`;
    });
    html += "</tbody></table>";
    pageContent.innerHTML = html;

    document.getElementById("refresh-list").addEventListener("click",()=>renderListTable());
    document.getElementById("add-item").addEventListener("click",()=>openEditModal(0,"",""));

    pageContent.querySelectorAll(".edit-item").forEach(btn=>{
      btn.addEventListener("click",(e)=>{
        const tr=e.target.closest("tr");
        const row=e.target.dataset.row;
        const code=tr.children[1].innerText;
        const name=tr.children[2].innerText;
        openEditModal(row,code,name);
      });
    });

    pageContent.querySelectorAll(".delete-item").forEach(btn=>{
      btn.addEventListener("click",async(e)=>{
        const row=btn.dataset.row;
        const f=new FormData();
        f.append("sheet","DATA");
        f.append("action","delete");
        f.append("row",row);
        await fetchCORS(BASE,{method:"POST",body:f});
        showPopup("ลบสำเร็จ");
        await renderListTable();
      });
    });
  }

  function openEditModal(row,code,name) {
    const modal=document.createElement("div");
    modal.className="modal";
    modal.innerHTML=`<div class="modal-content">
      <h3>${row==0?"เพิ่มรายการ":"แก้ไขรายการ"}</h3>
      <form id="edit-form">
        <label>รหัสครุภัณฑ์: <input name="code" required value="${escapeHTML(code)}"></label>
        <label>ชื่อครุภัณฑ์: <input name="name" required value="${escapeHTML(name)}"></label>
        <div class="form-actions">
          <button class="btn primary" type="submit">ยืนยัน</button>
          <button class="btn" type="button" id="edit-cancel">ยกเลิก</button>
        </div>
      </form>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector("#edit-cancel").addEventListener("click",()=>modal.remove());
    modal.querySelector("#edit-form").addEventListener("submit",async(ev)=>{
      ev.preventDefault();
      const fd=new FormData(ev.target);
      const newCode=fd.get("code").trim();
      const newName=fd.get("name").trim();
      if(!newCode||!newName) return showPopup("กรอกให้ครบ","err");
      const f=new FormData();
      f.append("sheet","DATA");
      f.append("action",row==0?"add":"update");
      if(row>0) f.append("row",row);
      f.append("data",JSON.stringify({รหัส:newCode,ชื่อ:newName}));
      await fetchCORS(BASE,{method:"POST",body:f});
      showPopup(row==0?"เพิ่มสำเร็จ":"แก้ไขสำเร็จ");
      modal.remove();
      await renderListTable();
    });
  }

  function renderManual(){
    pageContent.innerHTML="<p>คู่มือการใช้งาน...</p>";
  }

  (async()=>{await loadPage("list")})();
});
