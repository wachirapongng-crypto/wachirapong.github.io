document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("username").textContent =
    localStorage.getItem("username") || "Admin";
  
  const BASE = "https://script.google.com/macros/s/AKfycbyGsw_HOthoi9t-5Qnh9k8_idaInsg562sAa36bq-dvisHU_LMnmiiKRF58OdsAFySERw/exec";
  const SHEET_URL = {
    DATA: `${BASE}?sheet=DATA`,
    WAIT: `${BASE}?sheet=WAIT`,
    SHOW: `${BASE}?sheet=SHOW`,
    LOGIN: `${BASE}?sheet=LOGIN`,
    MEMBER: `${BASE}?sheet=MEMBER`
  };

  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");
  const QR_COLUMNS = ["QR Code", "qr_code", "qr", "QR"];

  // =====================================================
  // SAFE CORS FETCH (เวอร์ชันใหม่ — ไม่ตั้ง Content-Type เอง)
  // =====================================================
  async function fetchCORS(url, options = {}) {
    const opt = {
      method: options.method || "GET",
      // ปล่อย browser จัดการ mode เองก็ได้
      // mode: "cors",
      headers: {
        ...(options.headers || {})
      },
      body: options.body || undefined
    };

    const res = await fetch(url, opt);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.warn("GAS returned non-JSON:", text);
      return {};
    }
  }

  function escapeHTML(str) {
    return str?.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =====================================================
  // RENDER CELL
  // =====================================================
  function renderCell(key, val, rowIndex) {
    const roomList = ["501","502","503","401","401A","401B","401C","402","403","404","405","ห้องพักครู","301","302"];
    const statusList = ["ใช้งานได้","ชำรุด","เสื่อมสภาพ","หมดอายุการใช้งาน","ไม่รองรับการใช้งาน"];

    if (typeof val === "object" && val !== null) {
      if (val.v) val = val.v;
      else return JSON.stringify(val);
    }

    if (QR_COLUMNS.includes(key)) {
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(val)}">`;
    }
    if (key === "เลือก") {
      return `<input type="checkbox" class="wait-select" data-row="${rowIndex}">`;
    }
    if (key === "ลบ") {
      return `<button class="delete-btn" data-row="${rowIndex}" style="color:red;">ลบ</button>`;
    }
    if (key === "ที่อยู่") {
      return `
        <select class="room-select" data-row="${rowIndex}">
          ${roomList.map(r => `<option value="${r}" ${val === r ? "selected" : ""}>${r}</option>`).join("")}
        </select>`;
    }
    if (key === "สถานะ") {
      return `
        <select class="status-select" data-row="${rowIndex}">
          ${statusList.map(s => `<option value="${s}" ${val === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>`;
    }
    return escapeHTML(val);
  }

  // =====================================================
  // LOAD DATA (GET)
  // =====================================================
  window.loadData = async function (sheet) {
    const url = SHEET_URL[sheet];
    try {
      const data = await fetchCORS(url);  // GET ธรรมดา
      pageContent.innerHTML = await renderTable(data, sheet);
    } catch (err) {
      console.error(err);
      pageContent.innerHTML = "<p style='color:red;'>โหลดข้อมูลไม่ได้</p>";
    }
  };

  // =====================================================
  // RENDER TABLE
  // =====================================================
  async function renderTable(data, sheet) {
    if (!data || data.length === 0)
      return "<p>ไม่พบข้อมูล</p>";

    let table = "<table><tr>";
    const keys = Object.keys(data[0]);

    if (sheet === "WAIT") {
      keys.unshift("เลือก");
      keys.push("ลบ");
    }

    keys.forEach(k => table += `<th>${escapeHTML(k)}</th>`);
    table += "</tr>";

    data.forEach((row, i) => {
      const rowNumber = i + 2; // ชดเชย header row ในชีต
      table += "<tr>";
      keys.forEach(k => {
        const val = row[k] || row[k] === 0 ? row[k] : "";
        table += `<td>${renderCell(k, val, rowNumber)}</td>`;
      });
      table += "</tr>";
    });

    if (sheet === "WAIT") {
      table += `
        <tr><td colspan="${keys.length}" style="text-align:right;">
          <button id="confirm-wait" style="padding:10px 20px;background:#3b7cff;color:#fff;border:none;border-radius:6px;cursor:pointer;">
            ✔ ยืนยันรายการที่เลือก
          </button>
        </td></tr>
      `;
    }
    return table + "</table>";
  }

  // =====================================================
  // ON SELECT CHANGE → UPDATE (ใช้ FormData)
  // =====================================================
  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches(".room-select") || el.matches(".status-select")) {
      const payload = {
        row: Number(el.dataset.row),
        รหัส: el.closest("tr").children[1].innerText,
        ชื่อ: el.closest("tr").children[2].innerText,
        ที่อยู่: el.closest("tr").querySelector(".room-select").value,
        สถานะ: el.closest("tr").querySelector(".status-select").value,
        วันที่: el.closest("tr").children[5].innerText,
        เวลา: el.closest("tr").children[6].innerText
      };

      const form = new FormData();
      form.append("sheet", "WAIT");
      form.append("action", "update");
      form.append("row", String(payload.row));
      form.append("data", JSON.stringify(payload));

      await fetchCORS(BASE, {
        method: "POST",
        body: form
      });
    }
  });

  // =====================================================
  // DELETE (ใช้ FormData)
  // =====================================================
  document.addEventListener("click", async (e) => {
    if (e.target.matches(".delete-btn")) {
      const row = Number(e.target.dataset.row);

      const form = new FormData();
      form.append("sheet", "WAIT");
      form.append("action", "delete");
      form.append("row", String(row));

      await fetchCORS(BASE, {
        method: "POST",
        body: form
      });

      loadData("WAIT");
    }
  });

  // =====================================================
  // CONFIRM → MOVE WAIT (ใช้ FormData)
  // =====================================================
  document.addEventListener("click", async (e) => {
    if (e.target.id === "confirm-wait") {
      const selected = [...document.querySelectorAll(".wait-select:checked")];

      for (const chk of selected) {
        const row = Number(chk.dataset.row);

        const form = new FormData();
        form.append("sheet", "WAIT");
        form.append("action", "moveWait");
        form.append("row", String(row));

        await fetchCORS(BASE, {
          method: "POST",
          body: form
        });
      }
      loadData("WAIT");
    }
  });

  // =====================================================
  // NAV
  // =====================================================
  window.loadPage = async function (type) {
    pageContent.innerHTML = "";
    if (type === "wait") {
      pageTitle.textContent = "🕓 ครุภัณฑ์ที่รอตรวจสอบ";
      await loadData("WAIT");
    }
    // ถ้าจะเพิ่มหน้าอื่น (DATA/SHOW) ก็ขยายตรงนี้ได้เลย
  };
});
