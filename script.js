const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const baseURL = `https://docs.google.com/spreadsheets/d/1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0/edit?usp=sharing`;

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
