document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("username").textContent = localStorage.getItem("username") || "Admin";

  const SHEET_URL = {
    DATA: "https://script.google.com/macros/s/AKfycbyqlibnTibBwyvU9nPXrCd2MRC6aeeM1W8YTQ-9RJ9IRPTMeyVQDDpIB1SR3gKMYBb8/exec?sheet=DATA",
    WAIT: "https://script.google.com/macros/s/AKfycbyqlibnTibBwyvU9nPXrCd2MRC6aeeM1W8YTQ-9RJ9IRPTMeyVQDDpIB1SR3gKMYBb8/exec?sheet=WAIT",
    SHOW: "https://script.google.com/macros/s/AKfycbyqlibnTibBwyvU9nPXrCd2MRC6aeeM1W8YTQ-9RJ9IRPTMeyVQDDpIB1SR3gKMYBb8/exec?sheet=SHOW",
    LOGIN: "https://script.google.com/macros/s/AKfycbyqlibnTibBwyvU9nPXrCd2MRC6aeeM1W8YTQ-9RJ9IRPTMeyVQDDpIB1SR3gKMYBb8/exec?sheet=LOGIN"
  };

  const formSection = document.getElementById("form-section");
  const formTitle = document.getElementById("form-title");
  const formContent = document.getElementById("form-content");
  const closeBtn = document.querySelector(".close-btn");
  const logoutBtn = document.getElementById("logout-btn");

  closeBtn.addEventListener("click", closeForm);
  formSection.addEventListener("click", e => { if(e.target===formSection) closeForm(); });
  logoutBtn.addEventListener("click", logout);

  // ฟังก์ชันสร้าง QR Code
  function renderQRCode(val) {
    return `<img src="https://chart.googleapis.com/chart?cht=qr&chs=120x120&chl=${encodeURIComponent(val)}" alt="QR Code">`;
  }

  // ฟังก์ชันสร้าง Barcode (Code128)
  function renderBarcode(val) {
    return `<img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(val)}&code=Code128&translate-esc=true" alt="Barcode">`;
  }

  // กำหนดคอลัมน์ที่เป็น QR/Barcode
  const QR_COLUMNS = ["qr_code","QR","Barcode","บาร์โค้ด","QR Code"]; // ปรับชื่อคอลัมน์ให้ตรงกับ Google Sheet
  const BARCODE_COLUMNS = ["barcode","Barcode","รหัสครุภัณฑ์"]; // ปรับตามชื่อคอลัมน์

  function renderCell(key, val){
    if(typeof val === "object" && val !== null){
      if(val.value) return renderQRCode(val.value);
      else return JSON.stringify(val);
    } else if(QR_COLUMNS.includes(key)) {
      return renderQRCode(val);
    } else if(BARCODE_COLUMNS.includes(key)) {
      return renderBarcode(val);
    } else {
      return val;
    }
  }

  window.openForm = async function(type){
    formSection.classList.add("show");
    formContent.innerHTML="";

    switch(type){
      case 'wait':
        formTitle.textContent="🕓 ครุภัณฑ์ที่รอตรวจสอบ";
        await loadData('WAIT');
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
        await loadData('DATA');
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
        await loadData('LOGIN');
        break;
    }
  }

  function closeForm(){ formSection.classList.remove("show"); }
  function logout(){ localStorage.removeItem("username"); window.location.href="login.html"; }

  window.loadData = async function(sheet){
    try {
      const res = await fetch(SHEET_URL[sheet]);
      const data = await res.json();

      if(!Array.isArray(data)||data.length===0){ 
        formContent.innerHTML="<p>ไม่พบข้อมูล</p>"; 
        return; 
      }

      let table="<table><tr>";
      Object.keys(data[0]).forEach(key=>table+=`<th>${key}</th>`);
      table+="</tr>";

      data.forEach(row=>{
        table+="<tr>";
        Object.entries(row).forEach(([key,val])=>{
          table+=`<td>${renderCell(key,val)}</td>`;
        });
        table+="</tr>";
      });

      table+="</table>";
      formContent.innerHTML=table;

    } catch(err){
      console.error(err);
      formContent.innerHTML="<p style='color:red;'>ไม่สามารถโหลดข้อมูล JSON ได้</p>";
    }
  }

  window.loadReport = async function(){
    const month=document.getElementById("month").value;
    if(!month){ alert("กรุณาเลือกเดือน"); return; }
    const reportDiv=document.getElementById("report-result");
    reportDiv.innerHTML="<p>กำลังโหลดรายงาน...</p>";

    try {
      const res = await fetch(SHEET_URL.SHOW+"&month="+month);
      const data = await res.json();
      if(!Array.isArray(data)||data.length===0){ 
        reportDiv.innerHTML="<p>ไม่พบข้อมูลรายงาน</p>"; 
        return; 
      }

      let table="<table><tr>";
      Object.keys(data[0]).forEach(key=>table+=`<th>${key}</th>`);
      table+="</tr>";

      data.forEach(row=>{
        table+="<tr>";
        Object.entries(row).forEach(([key,val])=>{
          table+=`<td>${renderCell(key,val)}</td>`;
        });
        table+="</tr>";
      });

      table+="</table>";
      reportDiv.innerHTML=table;
    } catch(err){
      console.error(err);
      reportDiv.innerHTML="<p style='color:red;'>ไม่สามารถโหลดรายงานได้</p>";
    }
  }
});
