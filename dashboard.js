document.addEventListener("DOMContentLoaded", () => {

  const BASE = "https://script.google.com/macros/s/AKfycbwixv3fvgOqqE1OhJVV0pp7fvqLWXP1clMoMcYvHloVBDm6jBi9LQy4AXf0j8qjxnC6tA/exec"; // <== เปลี่ยนเป็น URL จริง
  const URLS = {
    WAIT: BASE + "?sheet=WAIT",
    LOG: BASE + "?sheet=LOG",
    DATA: BASE + "?sheet=DATA",
    USER: BASE + "?sheet=LOGIN"
  };

  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");

  /******** fetchJSON ********/
  async function fetchJSON(url, method="GET", body=null){
    try{
      const opt = method==="POST"?{method:"POST", body}: {method:"GET"};
      const res = await fetch(url,opt);
      const txt = await res.text();
      try{ return JSON.parse(txt); } catch{return [];}
    } catch(err){console.error(err); return [];}
  }

  /******** Utility ********/
  function todayTH(){ 
    const d = new Date();
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()+543}`;
  }
  function timeNow(){ return new Date().toLocaleTimeString("th-TH",{hour12:false}); }
  function computeRow(r,i){ return r.row||r._row||i+2; }

  /******** Router ********/
  async function loadPage(page){
    pageContent.innerHTML="";
    if(page==="wait"){ pageTitle.textContent="🕓 ครุภัณฑ์ที่รอตรวจสอบ"; await renderWaitPage(); }
    else if(page==="list"){ pageTitle.textContent="📋 รายการครุภัณฑ์ทั้งหมด"; await renderListPage(); }
    else if(page==="user"){ pageTitle.textContent="👥 จัดการสมาชิก"; await renderUserPage(); }
    else if(page==="report"){ pageTitle.textContent="📑 รายงาน LOG"; await renderReportPage(); }
    else if(page==="manual"){ pageTitle.textContent="📘 คู่มือการใช้งาน"; renderManualPage(); }
    else { pageTitle.textContent="Dashboard"; pageContent.innerHTML="<p>เลือกเมนู</p>"; }
  }
  window.loadPage = loadPage;
  loadPage("wait");

  /******** WAIT PAGE ********/
  async function renderWaitPage(){
    const data = await fetchJSON(URLS.WAIT);
    const LOC = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
    const STATUS = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];
    let html = `<button id="refresh-wait" class="btn">รีเฟรช</button>
      <table class="dash-table"><thead>
        <tr><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>หมายเหตุ</th>
        <th>วันที่</th><th>เวลา</th><th>ย้ายเข้า LOG</th><th>ลบ</th></tr></thead><tbody>`;
    data.forEach((r,i)=>{
      const row = computeRow(r,i);
      html += `<tr data-row="${row}">
        <td>${r["รหัส"]||""}</td>
        <td>${r["ชื่อ"]||""}</td>
        <td><select class="w-loc">${LOC.map(v=>`<option value="${v}" ${v===r["ที่อยู่"]?"selected":""}>${v}</option>`).join("")}</select></td>
        <td><select class="w-status">${STATUS.map(v=>`<option value="${v}" ${v===r["สถานะ"]?"selected":""}>${v}</option>`).join("")}</select></td>
        <td><input class="w-note" value="${r["หมายเหตุ"]||""}" placeholder="รายละเอียด"></td>
        <td>${r["วันที่"]||""}</td>
        <td>${r["เวลา"]||""}</td>
        <td><button class="move-btn">✔</button></td>
        <td><button class="del-btn">🗑</button></td>
      </tr>`;
    });
    html+="</tbody></table>";
    pageContent.innerHTML=html;
    document.getElementById("refresh-wait").onclick=renderWaitPage;

    // Move → LOG
    document.querySelectorAll(".move-btn").forEach(btn=>{
      btn.onclick = async function(){
        const tr = this.closest("tr");
        const row = tr.dataset.row;
        const item = {
          code: tr.children[0].textContent,
          name: tr.children[1].textContent,
          loc: tr.querySelector(".w-loc").value,
          status: tr.querySelector(".w-status").value,
          note: tr.querySelector(".w-note").value,
          date: todayTH(),
          time: timeNow()
        };
        if(!confirm(`คุณยืนยันการย้ายข้อมูลรหัส ${item.code} ไป LOG ใช่ไหม?`)) return;
        const fd = new FormData();
        fd.append("action","moveLog");
        fd.append("row", row);
        fd.append("code", item.code);
        fd.append("name", item.name);
        fd.append("location", item.loc);
        fd.append("status", item.status);
        fd.append("note", item.note);
        fd.append("date", item.date);
        fd.append("time", item.time);
        await fetchJSON(BASE,"POST",fd);
        alert("เพิ่มรายการลง LOG สำเร็จ");
        renderWaitPage();
      };
    });

    // Delete WAIT
    document.querySelectorAll(".del-btn").forEach(btn=>{
      btn.onclick=async function(){
        const tr=this.closest("tr");
        const row=tr.dataset.row;
        const code=tr.children[0].textContent;
        if(!confirm(`ต้องการลบรายการรหัส ${code} ใช่ไหม?`)) return;
        const fd=new FormData();
        fd.append("action","delWait");
        fd.append("row",row);
        await fetchJSON(BASE,"POST",fd);
        alert("ลบข้อมูลสำเร็จ");
        renderWaitPage();
      };
    });
  }

  /******** LIST PAGE ********/
  async function renderListPage(){
    const data = await fetchJSON(URLS.DATA);
    let html = `<h3>เพิ่มรายการใหม่</h3>
      <input id="new-code" placeholder="รหัส">
      <input id="new-name" placeholder="ชื่อ">
      <button id="add-item">เพิ่ม</button>
      <table class="dash-table"><thead>
      <tr><th>ลำดับ</th><th>รหัส</th><th>ชื่อ</th><th>แก้ไข</th><th>ลบ</th></tr></thead><tbody>`;
    data.forEach((r,i)=>{
      const row = computeRow(r,i);
      html += `<tr data-row="${row}">
        <td>${i+1}</td>
        <td>${r["รหัสครุภัณฑ์"]||""}</td>
        <td>${r["ชื่อครุภัณฑ์"]||""}</td>
        <td><button class="list-update">✔</button></td>
        <td><button class="list-delete">🗑</button></td>
      </tr>`;
    });
    html+="</tbody></table>";
    pageContent.innerHTML=html;

    // Add
    document.getElementById("add-item").onclick=async()=>{
      const code=document.getElementById("new-code").value;
      const name=document.getElementById("new-name").value;
      if(!confirm(`คุณยืนยันเพิ่มรหัส ${code}?`)) return;
      const fd=new FormData();
      fd.append("action","addData");
      fd.append("code",code);
      fd.append("name",name);
      await fetchJSON(BASE,"POST",fd);
      alert("เพิ่มรายการสำเร็จ");
      renderListPage();
    };

    // Update
    document.querySelectorAll(".list-update").forEach(btn=>{
      btn.onclick=async function(){
        const tr=this.closest("tr");
        const row=tr.dataset.row;
        const code=tr.children[1].textContent;
        const name=tr.children[2].textContent;
        if(!confirm(`คุณยืนยันแก้ไขรหัส ${code}?`)) return;
        const fd=new FormData();
        fd.append("action","updateData");
        fd.append("row",row);
        fd.append("code",code);
        fd.append("name",name);
        await fetchJSON(BASE,"POST",fd);
        alert("แก้ไขสำเร็จ");
        renderListPage();
      };
    });

    // Delete
    document.querySelectorAll(".list-delete").forEach(btn=>{
      btn.onclick=async function(){
        const row=this.closest("tr").dataset.row;
        if(!confirm("คุณยืนยันลบรายการนี้ใช่ไหม?")) return;
        const fd=new FormData();
        fd.append("action","delData");
        fd.append("row",row);
        await fetchJSON(BASE,"POST",fd);
        alert("ลบสำเร็จ");
        renderListPage();
      };
    });
  }

  /******** USER PAGE ********/
  async function renderUserPage(){
    const data = await fetchJSON(URLS.USER);
    let html=`<h3>เพิ่มสมาชิก</h3>
      <input id="u-id" placeholder="ID">
      <input id="u-pass" placeholder="Pass">
      <select id="u-status"><option value="admin">admin</option><option value="employee">employee</option></select>
      <input id="u-name" placeholder="ชื่อ">
      <button id="add-user">เพิ่ม</button>
      <table class="dash-table"><thead>
      <tr><th>ID</th><th>Pass</th><th>Status</th><th>Name</th><th>แก้ไข</th><th>ลบ</th></tr></thead><tbody>`;
    data.forEach((u,i)=>{
      const row = computeRow(u,i);
      html += `<tr data-row="${row}">
        <td><input class="u-id" value="${u["ID"]||""}"></td>
        <td><input class="u-pass" value="${u["Pass"]||""}"></td>
        <td><select class="u-status"><option value="admin" ${u["Status"]==="admin"?"selected":""}>admin</option><option value="employee" ${u["Status"]==="employee"?"selected":""}>employee</option></select></td>
        <td><input class="u-name" value="${u["name"]||""}"></td>
        <td><button class="up-user">✔</button></td>
        <td><button class="del-user">🗑</button></td>
      </tr>`;
    });
    html+="</tbody></table>";
    pageContent.innerHTML=html;

    // Add user
    document.getElementById("add-user").onclick=async()=>{
      const id=document.getElementById("u-id").value;
      if(!confirm(`คุณยืนยันเพิ่มสมาชิก ID ${id}?`)) return;
      const fd=new FormData();
      fd.append("action","addUser");
      fd.append("id",id);
      fd.append("pass",document.getElementById("u-pass").value);
      fd.append("status",document.getElementById("u-status").value);
      fd.append("name",document.getElementById("u-name").value);
      await fetchJSON(BASE,"POST",fd);
      alert("เพิ่มสมาชิกสำเร็จ");
      renderUserPage();
    };

    document.querySelectorAll(".up-user").forEach(btn=>{
      btn.onclick=async function(){
        const tr=this.closest("tr");
        const row=tr.dataset.row;
        const id=tr.querySelector(".u-id").value;
        if(!confirm(`คุณยืนยันแก้ไขสมาชิก ID ${id}?`)) return;
        const fd=new FormData();
        fd.append("action","updateUser");
        fd.append("row",row);
        fd.append("id",id);
        fd.append("pass",tr.querySelector(".u-pass").value);
        fd.append("status",tr.querySelector(".u-status").value);
        fd.append("name",tr.querySelector(".u-name").value);
        await fetchJSON(BASE,"POST",fd);
        alert("แก้ไขสมาชิกสำเร็จ");
        renderUserPage();
      };
    });

    document.querySelectorAll(".del-user").forEach(btn=>{
      btn.onclick=async function(){
        const row=this.closest("tr").dataset.row;
        if(!confirm("คุณยืนยันลบสมาชิกนี้ใช่ไหม?")) return;
        const fd=new FormData();
        fd.append("action","deleteUser");
        fd.append("row",row);
        await fetchJSON(BASE,"POST",fd);
        alert("ลบสมาชิกสำเร็จ");
        renderUserPage();
      };
    });
  }

  /******** REPORT PAGE ********/
  async function renderReportPage(){
    const data = await fetchJSON(URLS.LOG);
    let html=`<table class="dash-table"><thead><tr>
      <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ที่เก็บ</th><th>สถานะ</th><th>หมายเหตุ</th><th>วันที่</th><th>เวลา</th>
    </tr></thead><tbody>`;
    data.forEach(r=>{
      html+=`<tr>
        <td>${r["รหัส"]||""}</td>
        <td>${r["ชื่อ"]||""}</td>
        <td>${r["ที่เก็บ"]||""}</td>
        <td>${r["สถานะ"]||""}</td>
        <td>${r["หมายเหตุ"]||""}</td>
        <td>${r["วันที่"]||""}</td>
        <td>${r["เวลา"]||""}</td>
      </tr>`;
    });
    html+="</tbody></table>";
    pageContent.innerHTML=html;
  }

  /******** MANUAL PAGE ********/
  function renderManualPage(){
    pageContent.innerHTML=`<h2>คู่มือการใช้งาน</h2><p>เพิ่มข้อความคู่มือได้ตามต้องการ</p>`;
  }

});
