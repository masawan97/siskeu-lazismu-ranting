const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzcp07TYzkVUYKxlh6Rr14sUeCj8-E1QVlOaTOOc6ThNIOZvAG5uv8he0oB_RMYbyhA/exec";

// ALUR BARU: Validasi PIN Mengandalkan Database Google Sheets
async function checkAuth() {
    const pinInput = document.getElementById("pin-input").value;
    const loginError = document.getElementById("login-error");
    const loginBtn = document.querySelector("#login-screen button");
    
    if (!pinInput) {
        loginError.innerText = "PIN tidak boleh kosong!";
        return;
    }

    loginBtn.innerText = "Memverifikasi PIN...";
    loginBtn.disabled = true;
    loginError.innerText = "";

    try {
        // Tembak pencocokan PIN ke backend Google Apps Script
        let response = await fetch(`${WEB_APP_URL}?action=verifyPin&pin=${pinInput}`);
        if (response.ok) {
            let result = await response.json();
            
            if (result.success === true) {
                // Jika cocok, buka aplikasi
                document.getElementById("login-screen").style.display = "none";
                document.getElementById("app").style.display = "block";
                fetchDashboardData();
            } else {
                loginError.innerText = "PIN Salah! Silakan cek Google Sheets atau hubungi Ketua Ranting.";
            }
        } else {
            throw new Error();
        }
    } catch (error) {
        loginError.innerText = "Gagal terhubung ke database. Periksa sinyal internet.";
    } finally {
        loginBtn.innerText = "Masuk Sistem";
        loginBtn.disabled = false;
    }
}

// ... Sisa fungsi openModal, closeModal, fetchDashboardData, dan submitData tetap sama seperti sebelumnya ...
