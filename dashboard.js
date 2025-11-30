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

  const cache = { WAIT:null, DATA:null, MEMBER:null };

  async function fetchCORS(url, options={}) {
    const opt = { method: options.method||"GET", headers: {...(options.headers||{})}, body: options.body || undefined };
    const res = await fetch(url, opt);
    const text = await res.text();
    try { return JSON.parse(text); } 
    catch { console.warn("GAS returned non-JSON:", text); return {}; }
  }

  function escapeHTML(str){return str?.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}

  function showPopup(msg="สำเร็จ", type="ok", timeout=2500){
    const existing = document.getElementById("dashboard-popup"); if(existing) existing.remove();
    const div=document.createElement("div"); div.id="dashboard-popup"; div.className=`popup ${type}`;
    div.innerHTML=`<div class="popup-msg">${escapeHTML(msg)}</div>`; document.body.appendChild(div);
    setTimeout(()=>div.classList.add("visible"),20);
    setTimeout(()=>div.classList.remove("visible"),timeout);
    setTimeout(()=>div.remove(),timeout+500);
  }

  function formatDate(d){
    if(!d) return "";
    const date = new Date(d);
    if(isNaN(date)) return d;
    const day = String(date.getDate()).padStart(2,"0");
    const month = String(date.getMonth()+1).padStart(2,"0");
    const year = date.getFullYear()+543;
    return `${day}-${month}-${year}`;
  }

  window.loadPage = async function(type){
    closeNav(); pageContent.innerHTML="";
    if(type==="wait"){ pageTitle.textContent="🕓 ครุภัณฑ์ที่รอตรวจสอบ"; await loadData("WAIT"); }
    else if(type==="add"){ pageTitle.textContent="➕ เพิ่มรายการครุภัณฑ์"; renderAddForm(); }
    else if(type==="edit"){ pageTitle.textContent="✏️ แก้ไขรายการครุภัณฑ์"; await renderEditTable(); }
    else if(type==="list"){ pageTitle.textContent="📋 รายการครุภัณฑ์ทั้งหมด"; await renderListTable(); }
    else if(type==="manual"){ pageTitle.textContent="📘 คู่มือการใช้งาน"; renderManual(); }
    else if(type==="user"){ pageTitle.textContent="👥 จัดการสมาชิก"; await renderUserTable(); }
  };

  async function loadData(sheet){
    const url = sheet==="WAIT"?SHEET_URL.WAIT:(sheet==="DATA"?SHEET_URL.DATA:SHEET_URL.MEMBER);
    try{
      if(cache[sheet]){ pageContent.innerHTML = await renderTableGeneric(cache[sheet],sheet); return cache[sheet]; }
      const data = await fetchCORS(url);
      cache[sheet]=data;
      pageContent.innerHTML = await renderTableGeneric(data,sheet);
      return data;
    } catch(err){ console.error(err); pageContent.innerHTML="<p style='color:red;'>โหลดข้อมูลไม่ได้</p>"; return []; }
  }

  async function renderTableGeneric(data,sheet){
    let html=`<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if(!data||data.length===0){ html+="<p>ไม่พบข้อมูล</p>"; return html; }
    html+=`<table class='dash-table'><thead><tr>`;
    const keys=Object.keys(data[0]);
    if(sheet==="WAIT"){ keys.unshift("เลือก"); keys.push("ลบ"); }
    keys.forEach(k=>html+=`<th>${escapeHTML(k)}</th>`);
    html+="</tr></thead><tbody>";
    data.forEach((row,i)=>{
      const rowNumber=i+2;
      html+="<tr>";
      keys.forEach(k=>{
        let val=(row[k]||row[k]===0)?row[k]:"";
        if(k==="วันที่"||k==="เวลา") val=formatDate(val);
        html+=`<td>${renderCellGeneric(k,val,rowNumber)}</td>`;
      });
      html+="</tr>";
    });
    html+="</tbody></table>";
    if(sheet==="WAIT") html+=`<div class="table-actions"><button id="confirm-wait" class="btn primary">✔ ยืนยันรายการที่เลือก</button></div>`;
    return html;
  }

  const QR_COLUMNS=["QR Code","qr_code","qr","QR"];
  function renderCellGeneric(key,val,rowIndex){
    const roomList=["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
    const statusList=["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];
    if(typeof val==="object"&&val!==null){ if(val.v) val=val.v; else return escapeHTML(JSON.stringify(val)); }
    if(QR_COLUMNS.includes(key)) return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(val)}" alt="qr">`;
    if(key==="เลือก") return `<input type="checkbox" class="wait-select" data-row="${rowIndex}">`;
    if(key==="ลบ") return `<button class="delete-btn" data-row="${rowIndex}" style="color:red;">ลบ</button>`;
    if(key==="ที่อยู่") return `<select class="room-select" data-row="${rowIndex}">${roomList.map(r=>`<option value="${r}"${val===r?" selected":""}>${r}</option>`).join("")}</select>`;
    if(key==="สถานะ") return `<select class="status-select" data-row="${rowIndex}">${statusList.map(s=>`<option value="${s}"${val===s?" selected":""}>${s}</option>`).join("")}</select>`;
    return escapeHTML(val);
  }

  function renderAddForm(){
    const html=`<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>
      <form id="add-form" class="dash-form">
        <label>รหัสครุภัณฑ์ (B) <input type="text" name="code" required></label>
        <label>ชื่อครุภัณฑ์ (C) <input type="text" name="name" required></label>
        <div class="form-actions">
          <button type="submit" class="btn primary">เพิ่มรายการ</button>
          <button type="button" id="add-cancel" class="btn">ยกเลิก</button>
        </div>
      </form>`;
    pageContent.innerHTML=html;
    const form=document.getElementById("add-form");
    form.addEventListener("submit",async ev=>{
      ev.preventDefault();
      const formData=new FormData(form);
      const code=formData.get("code").trim();
      const name=formData.get("name").trim();
      if(!code||!name) return showPopup("กรอกให้ครบ","err");
      const data=await fetchCORS(SHEET_URL.DATA);
      const nextIndex=(data&&data.length)?data.length+1:1;
      const post=new FormData();
      post.append("sheet","DATA");
      post.append("action","add");
      post.append("data",JSON.stringify({ลำดับ:nextIndex,รหัส:code,ชื่อ:name}));
      await fetchCORS(BASE,{method:"POST",body:post});
      cache.DATA=null; showPopup("เพิ่มสำเร็จ","ok");
      await renderListTable();
    });
    document.getElementById("add-cancel").addEventListener("click",()=>{ pageContent.innerHTML=""; });
  }

  async function renderEditTable(){
    pageContent.innerHTML="<p>กำลังโหลด...</p>";
    const data=await fetchCORS(SHEET_URL.DATA); cache.DATA=data;
    let html=`<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if(!data||data.length===0){ html+="<p>ไม่พบข้อมูล</p>"; pageContent.innerHTML=html; return; }
    html+=`<table class="dash-table"><thead><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>จัดการ</th></tr></thead><tbody>`;
    data.forEach((row,i)=>{
      const idx=i+1;
      const code=escapeHTML(row["รหัส"]||row["B"]||row["b"]||"");
      const name=escapeHTML(row["ชื่อ"]||row["C"]||row["c"]||"");
      html+=`<tr data-row="${i+2}"><td>${idx}</td><td class="cell-code">${code}</td><td class="cell-name">${name}</td><td><button class="btn edit-item" data-row="${i+2}">แก้ไข</button></td></tr>`;
    });
    html+="</tbody></table>"; pageContent.innerHTML=html;
    pageContent.querySelectorAll(".edit-item").forEach(btn=>{
      btn.addEventListener("click",e=>{
        const row=Number(e.target.dataset.row);
        const tr=e.target.closest("tr");
        const currentCode=tr.querySelector(".cell-code").innerText;
        const currentName=tr.querySelector(".cell-name").innerText;
        openEditModal(row,currentCode,currentName);
      });
    });
  }

  function openEditModal(row,code,name){
    const modal=document.createElement("div"); modal.className="modal";
    modal.innerHTML=`<div class="modal-content"><h3>แก้ไขรายการ (ลำดับ: ${row})</h3>
      <form id="edit-form">
        <label>รหัสครุภัณฑ์: <input name="code" required value="${escapeHTML(code)}"></label>
        <label>ชื่อครุภัณฑ์: <input name="name" required value="${escapeHTML(name)}"></label>
        <div class="form-actions">
          <button type="submit" class="btn primary">ยืนยัน</button>
          <button type="button" id="edit-cancel" class="btn">ยกเลิก</button>
        </div>
      </form></div>`;
    document.body.appendChild(modal);
    modal.querySelector("#edit-cancel").addEventListener("click",()=>modal.remove());
    modal.querySelector("#edit-form").addEventListener("submit",async ev=>{
      ev.preventDefault();
      const fd=new FormData(ev.target);
      const newCode=fd.get("code").trim();
      const newName=fd.get("name").trim();
      if(!newCode||!newName) return showPopup("กรอกให้ครบ","err");
      const post=new FormData();
      post.append("sheet","DATA");
      post.append("action","update");
      post.append("row",String(row));
      post.append("data",JSON.stringify({รหัส:newCode,ชื่อ:newName}));
      await fetchCORS(BASE,{method:"POST",body:post});
      cache.DATA=null;
      showPopup("แก้ไขสำเร็จ","ok");
      modal.remove();
      await renderEditTable();
    });
  }

  async function renderListTable(){
    pageContent.innerHTML="<p>กำลังโหลด...</p>";
    const data=await fetchCORS(SHEET_URL.DATA); cache.DATA=data;
    let html=`<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>`;
    if(!data||data.length===0){ html+="<p>ไม่พบข้อมูล</p>"; pageContent.innerHTML=html; return; }
    html+=`<div class="table-actions"><button id="refresh-list" class="btn">รีเฟรช</button><button id="add-item" class="btn primary">➕ เพิ่ม</button></div>`;
    html+=`<table class="dash-table"><thead><tr><th>ลำดับ</th><th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>BarCode</th><th>QR Code</th><th>แก้ไข</th><th>ลบ</th></tr></thead><tbody>`;
    data.forEach((row,i)=>{
      const idx=i+1;
      const code=encodeURIComponent(row["รหัส"]||row["B"]||"");
      const name=escapeHTML(row["ชื่อ"]||row["C"]||"");
      const barcodeURL=`https://barcode.tec-it.com/barcode.ashx?data=${code}&code=Code128&translate-esc=true`;
      const qrURL=`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${code}`;
      html+=`<tr data-row="${i+2}"><td>${idx}</td><td>${escapeHTML(decodeURIComponent(code))}</td><td>${name}</td><td><img src="${barcodeURL}" alt="barcode" style="height:40px;"></td><td><img src="${qrURL}" alt="qr" style="height:60px;"></td><td><button class="btn edit-item" data-row="${i+2}">แก้ไข</button></td><td><button class="btn del-item" data-row="${i+2}" style="color:red;">ลบ</button></td></tr>`;
    });
    html+="</tbody></table>"; pageContent.innerHTML=html;

    document.getElementById("refresh-list").addEventListener("click",async()=>{ cache.DATA=null; await renderListTable(); });
    document.getElementById("add-item").addEventListener("click",()=>renderAddForm());

    pageContent.querySelectorAll(".edit-item").forEach(btn=>{
      btn.addEventListener("click",e=>{
        const row=Number(e.target.dataset.row);
        const tr=e.target.closest("tr");
        const currentCode=tr.children[1].innerText;
        const currentName=tr.children[2].innerText;
        openEditModal(row,currentCode,currentName);
      });
    });

    pageContent.querySelectorAll(".del-item").forEach(btn=>{
      btn.addEventListener("click",async e=>{
        const row=Number(e.target.dataset.row);
        const form=new FormData();
        form.append("sheet","DATA");
        form.append("action","delete");
        form.append("row",String(row));
        await fetchCORS(BASE,{method:"POST",body:form});
        cache.DATA=null; showPopup("ลบสำเร็จ","ok");
        await renderListTable();
      });
    });
  }

  function renderManual(){
    pageContent.innerHTML=`<div class="note">หมายเหตุ: การดำเนินการอาจใช้เวลา 5–10 วินาที</div>
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
      </section>`;
  }

  // ========= Event listeners =========
  document.addEventListener("change",async(e)=>{
    const el=e.target;
    if(el.matches(".room-select")||el.matches(".status-select")){
      const payload={ row:Number(el.dataset.row), รหัส:el.closest("tr").children[1].innerText, ชื่อ:el.closest("tr").children[2].innerText, ที่อยู่:el.closest("tr").querySelector(".room-select").value, สถานะ:el.closest("tr").querySelector(".status-select").value, วันที่:el.closest("tr").children[5]?.innerText||"", เวลา:el.closest("tr").children[6]?.innerText||"" };
      const form=new FormData(); form.append("sheet","WAIT"); form.append("action","update"); form.append("row",String(payload.row)); form.append("data",JSON.stringify(payload));
      await fetchCORS(BASE,{method:"POST",body:form}); showPopup("แก้ไขสำเร็จ","ok",1500);
    }
  });

  document.addEventListener("click",async(e)=>{
    if(e.target && e.target.id==="confirm-wait"){
      const selected=[...document.querySelectorAll(".wait-select:checked")];
      for(const chk of selected){
        const row=Number(chk.dataset.row);
        const form=new FormData();
        form.append("sheet","WAIT"); form.append("action","moveWait"); form.append("targetSheet","LOG"); form.append("row",String(row));
        await fetchCORS(BASE,{method:"POST",body:form});
      }
      cache.WAIT=null; showPopup("ยืนยันรายการเรียบร้อย","ok");
      await loadData("WAIT");
    }
  });

  // load page default
  loadPage("wait");
});
