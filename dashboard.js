document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("username").textContent = localStorage.getItem("username") || "Admin";

  const SHEET_URL = {
    DATA: "https://script.google.com/macros/s/AKfycbyPhRnn_Pd53MB6rvSxQ8EQIZkih4AB_3xn-tGZkf9RFdZ7Q-B3QPLz47qPt7YHxp8r/exec?sheet=DATA",
    WAIT: "https://script.google.com/macros/s/AKfycbyPhRnn_Pd53MB6rvSxQ8EQIZkih4AB_3xn-tGZkf9RFdZ7Q-B3QPLz47qPt7YHxp8r/exec?sheet=WAIT",
    SHOW: "https://script.google.com/macros/s/AKfycbyPhRnn_Pd53MB6rvSxQ8EQIZkih4AB_3xn-tGZkf9RFdZ7Q-B3QPLz47qPt7YHxp8r/exec?sheet=SHOW",
    LOGIN: "https://script.google.com/macros/s/AKfycbyPhRnn_Pd53MB6rvSxQ8EQIZkih4AB_3xn-tGZkf9RFdZ7Q-B3QPLz47qPt7YHxp8r/exec?sheet=LOGIN"
  };

  const formSection = document.getElementById("form-section");
  const formTitle = document.getElementById("form-title");
  const formContent = document.getElementById("form-content");
  const closeBtn = document.querySelector(".close-btn");
  const logoutBtn = document.getElementById("logout-btn");

  closeBtn.addEventListener("click", closeForm);
  formSection.addEventListener("click", e => { if(e.target===formSection) closeForm(); });
  logoutBtn.addEventListener("click", logout);

  window.openForm = function(type){
    formSection.classList.add("show");
    formContent.innerHTML="";

    switch(type){
      case 'add':
        formTitle.textContent="➕ เพิ่มรายการครุภัณฑ์";
        formContent.innerHTML=`
          <label>รหัสครุภัณฑ์:</label><input type="text" id="code">
          <label>ชื่อครุภัณฑ์:</label><input type="text" id="name">
          <button onclick="saveData()">บันทึก</button>`;
        break;
      case 'edit':
        formTitle.textContent="✏️ แก้ไขรายการครุภัณฑ์";
        loadData('DATA',true);
        break;
      case 'wait':
        formTitle.textContent="🕓 ครุภัณฑ์ที่รอตรวจสอบ";
        loadData('WAIT');
        break;
      case 'report':
        formTitle.textContent="📊 ออกรายงานครุภัณฑ์";
        formContent.innerHTML=`
          <label>เลือกเดือน/ปี:</label>
          <input type="month" id="month">
          <button onclick="loadReport()">แสดงรายงาน</button>
          <div id="report-result"></div>`;
        break;
      case 'list':
        formTitle.textContent="📋 รายการครุภัณฑ์ทั้งหมด";
        loadData('DATA');
        break;
      case 'manual':
        formTitle.textContent="📘 คู่มือการใช้งาน";
        formContent.innerHTML=`
          <p>1. เพิ่มรายการครุภัณฑ์ → กรอกข้อมูลและบันทึก</p>
          <p>2. แก้ไขรายการครุภัณฑ์ → เลือกรายการเพื่อแก้ไข</p>
          <p>3. ครุภัณฑ์ที่รอตรวจสอบ → ดูรายการจากเครื่องสแกน</p>
          <p>4. ออกรายงาน → เลือกเดือน/ปี แสดงตารางรายงาน</p>
          <p>5. จัดการสมาชิก → เพิ่ม/ลบ/แก้ไขผู้ใช้ระบบ</p>`;
        break;
      case 'user':
        formTitle.textContent="👥 จัดการสมาชิก";
        loadData('LOGIN');
        break;
    }
  }

  function closeForm(){ formSection.classList.remove("show"); }
  function logout(){ localStorage.removeItem("username"); window.location.href="login.html"; }

  window.loadData = function(sheet,edit=false){
    fetch(SHEET_URL[sheet])
      .then(res=>res.json())
      .then(data=>{
        if(!Array.isArray(data)||data.length===0){ formContent.innerHTML="<p>ไม่พบข้อมูล</p>"; return; }
        let table="<table><tr>";
        Object.keys(data[0]).forEach(key=>table+=`<th>${key}</th>`);
        if(edit) table+="<th>แก้ไข</th>";
        table+="</tr>";
        data.forEach((row,i)=>{
          table+="<tr>";
          Object.values(row).forEach(val=>table+=`<td>${val}</td>`);
          if(edit) table+=`<td><button onclick="editItem(${i})">แก้ไข</button></td>`;
          table+="</tr>";
        });
        table+="</table>";
