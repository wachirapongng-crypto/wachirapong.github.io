const sheetID = "ใส่ SHEET_ID ของคุณ";
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json`;

fetch(baseURL)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows;

    const tableBody = document.getElementById("equipment-body");
    tableBody.innerHTML = "";

    rows.forEach((r, index) => {
      const cols = r.c.map(c => (c ? c.v : ""));
      const [no, id, name, location, status] = cols;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${no}</td>
        <td>${id}</td>
        <td>${name}</td>
        <td>${location}</td>
        <td>${status}</td>
        <td><a href="detail.html?id=${id}">ดูรายละเอียด</a></td>
      `;
      tableBody.appendChild(tr);
    });
  })
  .catch(err => console.error("Error loading data", err));
