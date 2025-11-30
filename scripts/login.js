 // --- ตั้งค่า Google Sheet ---
    const sheetID = "1bkpz-iG4B8qnvZc4ql4qE15Qw8HrIZ1aeX1vZQzMFy0";
    const sheetName = "LOGIN";
    const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${sheetName}&t=${Date.now()}`;

    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("error-message");

    // --- ดึงข้อมูล login ---
    async function getLoginData() {
      try {
        const res = await fetch(baseURL);
        const text = await res.text();

        const json = JSON.parse(text.substring(47).slice(0,-2));

        // แปลงข้อมูล
        const data = json.table.rows.map(r => ({
          ID: r.c[0]?.v?.toString().trim(),           // A = ID
          Pass: r.c[1]?.v?.toString().trim(),         // B = Pass
          Status: r.c[2]?.v?.toString().trim().toLowerCase() // C = Status
        }));

        console.log("Login Data จาก Google Sheet:", data);
        return data;

      } catch (err) {
        console.error("โหลดข้อมูล login ไม่สำเร็จ:", err);
        errorMessage.textContent = "ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่";
        return [];
      }
    }

    // --- ตรวจสอบ login ---
    loginForm.addEventListener("submit", async function(e){
      e.preventDefault();
      errorMessage.textContent = "";

      const usernameInput = document.getElementById("username").value.trim().toLowerCase();
      const passwordInput = document.getElementById("password").value.trim().toLowerCase();

      const loginData = await getLoginData();
      if(loginData.length === 0) return;

      // debug: แสดงทุก user
      loginData.forEach(u => console.log(u.ID, u.Pass, u.Status));

      // หา user
      const user = loginData.find(u => 
        u.ID?.toLowerCase() === usernameInput &&
        u.Pass?.toLowerCase() === passwordInput
      );

      console.log("ตรวจสอบผู้ใช้:", user);

      if(user){
        localStorage.setItem("loginUser", JSON.stringify(user));

        if(user.Status === "admin"){
          window.location.href = "adminDashboard.html";
        } else if(user.Status === "employee"){
          window.location.href = "ีuserDashboard.html";
        } else {
          errorMessage.textContent = "สิทธิ์ผู้ใช้งานไม่ถูกต้อง";
          console.warn("Status ไม่ถูกต้อง:", user.Status);
        }
      } else {
        errorMessage.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      }
    });
