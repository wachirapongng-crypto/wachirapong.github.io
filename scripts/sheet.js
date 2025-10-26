<script>
const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json`;

// ดึงข้อมูลจากชีตที่ต้องการ
async function fetchSheetData(sheetName) {
  const url = `${baseURL}&sheet=${sheetName}&t=${Date.now()}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));
  return json.table.rows.map(r => r.c.map(c => c ? c.v : ""));
}
</script>
