const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const waitSheet = "WAIT";
const logSheet = "LOG";
const GAS_URL = "https://script.google.com/macros/s/AKfycby9v3P1tIUUZa6pe8xdIrpmoH81AEVghK1X7vybjYq4_bf9cprg-5uExPMCup-wYiaX/exec"; // ใส่ Web App URL ของคุณ

const addressOptions = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
const statusOptions = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

function pad(n){return String(n).padStart(2,'0');}
function formatDateCell(val){ /* ใช้ฟังก์ชันเดิม */ return val; }
function formatTimeCell(val){ /* ใช้ฟังก์ชันเดิม */ return val; }
function escapeHtml(str){ return str==null?"":String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'", "&#39;"); }

let WAIT_ROWS = [];

function drawTable(json){
    const data = JSON.parse(json.substring(47,json.length-2)).table.rows;
    WAIT_ROWS = data.map(r => (r.c||[]).map(c => c?c.v:""));
    const tableRows = WAIT_ROWS.map((r,i)=>`
        <tr data-index="${i}">
            <td>${escapeHtml(r[0])}</td>
            <td>${escapeHtml(r[1])}</td>
            <td>
              <select>${addressOptions.map(a=>`<option value="${a}" ${r[2]==a?'selected':''}>${a}</option>`)}</select>
            </td>
            <td>
              <select>${statusOptions.map(s=>`<option value="${s}" ${r[3]==s?'selected':''}>${s}</option>`)}</select>
            </td>
            <td>${formatDateCell(r[4])}</td>
            <td>${formatTimeCell(r[5])}</td>
            <td><button class="deleteBtn">ลบ</button></td>
        </tr>
    `).join("");
    document.getElementById("detail").innerHTML = `
        <table>
            <thead>
                <tr><th>รหัส</th><th>ชื่อ</th><th>ที่อยู่</th><th>สถานะ</th><th>วันที่</th><th>เวลา</th><th>จัดการ</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
        <button id="updateBtn">อัปเดตข้อมูลไป LOG</button>
    `;
    attachEvents();
}

function attachEvents(){
    document.querySelectorAll(".deleteBtn").forEach(btn=>{
        btn.onclick = e=>{
            const tr = e.target.closest("tr");
            const index = tr.dataset.index;
            deleteRow(index);
        }
    });
    document.getElementById("updateBtn").onclick = updateRows;
}

function loadDetail(){
    const script = document.createElement("script");
    script.src = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${waitSheet}&callback=drawTable`;
    document.body.appendChild(script);
}

function deleteRow(index){
    const row = WAIT_ROWS[index];
    fetch(GAS_URL,{
        method:"POST",
        body:JSON.stringify({action:"delete",sheet:waitSheet,ID:row[0]}),
        headers:{"Content-Type":"application/json"}
    }).then(()=>loadDetail());
}

function updateRows(){
    const rows = Array.from(document.querySelectorAll("#detail tbody tr")).map(tr=>{
        const i = tr.dataset.index;
        const r = WAIT_ROWS[i];
        const addr = tr.querySelector("td:nth-child(3) select").value;
        const stat = tr.querySelector("td:nth-child(4) select").value;
        return {ID:r[0],Name:r[1],Address:addr,Status:stat,Date:r[4],Time:r[5]};
    });
    // เพิ่มข้อมูลไป LOG และลบ WAIT
    rows.forEach(r=>{
        fetch(GAS_URL,{
            method:"POST",
            body:JSON.stringify({action:"add",sheet:logSheet,ID:r.ID,Name:r.Name,Address:r.Address,Status:r.Status,Date:r.Date,Time:r.Time}),
            headers:{"Content-Type":"application/json"}
        }).then(()=>fetch(GAS_URL,{
            method:"POST",
            body:JSON.stringify({action:"delete",sheet:waitSheet,ID:r.ID}),
            headers:{"Content-Type":"application/json"}
        }).then(()=>loadDetail()));
    });
}

document.getElementById("refreshBtn").onclick = loadDetail;
loadDetail();
