// =========================================================================
// GANTI URL INI dengan URL Web App hasil "New Deployment" Google Apps Script Anda!
// =========================================================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzcp07TYzkVUYKxlh6Rr14sUeCj8-E1QVlOaTOOc6ThNIOZvAG5uv8he0oB_RMYbyhA/exec";

/**
 * 1. ALUR AUTENTIKASI: Validasi PIN Mengandalkan Database Google Sheets
 */
async function checkAuth() {
    const pinInput = document.getElementById("pin-input").value;
    const loginError = document.getElementById("login-error");
    const loginBtn = document.querySelector("#login-screen button");
    
    if (!pinInput) {
        loginError.innerText = "PIN tidak boleh kosong!";
        return;
    }

    // Berikan efek loading pada tombol masuk
    loginBtn.innerText = "Memverifikasi PIN...";
    loginBtn.disabled = true;
    loginError.innerText = "";

    try {
        // Melakukan verifikasi kecocokan PIN ke backend Google Apps Script
        let response = await fetch(`${WEB_APP_URL}?action=verifyPin&pin=${encodeURIComponent(pinInput)}`);
        
        if (response.ok) {
            let result = await response.json();
            
            if (result.success === true) {
                // Jika PIN valid, hancurkan layar login dan buka dashboard utama
                document.getElementById("login-screen").style.display = "none";
                document.getElementById("app").style.display = "block";
                
                // Panggil data nominal sisa kas brankas
                fetchDashboardData();
            } else {
                loginError.innerText = "PIN Salah! Silakan cek Google Sheets atau hubungi Ketua Ranting.";
            }
        } else {
            throw new Error("Koneksi API bermasalah");
        }
    } catch (error) {
        loginError.innerText = "Gagal terhubung ke database. Periksa sinyal internet.";
        console.error("Auth Error: ", error);
    } finally {
        loginBtn.innerText = "Masuk Sistem";
        loginBtn.disabled = false;
    }
}

/**
 * 2. KONTROL INTERFAK MODAL (Bottom Sheet Form)
 */
function openModal(id) { 
    document.getElementById(id).style.display = "block"; 
}

function closeModal(id) { 
    document.getElementById(id).style.display = "none"; 
}

/**
 * 3. DASHBOARD LOGIC: Mengambil Data Saldo Live dari Perhitungan Excel Backend
 */
async function fetchDashboardData() {
    try {
        let response = await fetch(`${WEB_APP_URL}?action=readDashboard`);
        if (response.ok) {
            let data = await response.json();
            
            // Render nominal ke elemen widget dashboard
            document.getElementById("saldo-zakat").innerText = formatRupiah(data.saldoZakat);
            document.getElementById("saldo-infak").innerText = formatRupiah(data.saldoInfak);
        }
    } catch (error) {
        console.error("Gagal memuat saldo riil dashboard: ", error);
    }
}

/**
 * 4. FORM SUBMISSION: Mengirim Objek Gabungan Dropdown Form ke Sheets via POST
 */
async function submitData(event, type) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // Konversi FormData mentah menjadi Object Plain JavaScript
    const dataObj = {};
    formData.forEach((value, key) => { dataObj[key] = value; });
    
    // Menentukan rute append baris berdasarkan asal modal form
    dataObj.action = `write_${type}`; 

    // Kunci tombol kirim agar amil tidak melakukan double-click (duplikasi data)
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "Memproses Input...";
    btn.disabled = true;

    try {
        let response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(dataObj)
        });
        
        if (response.ok) {
            alert("Data Transaksi Berhasil Direkam ke Google Sheets!");
            form.reset(); // Bersihkan form kembali kosong
            closeModal(form.closest('.modal').id); // Tutup lembar modal otomatis
            
            // Segera hitung ulang saldo kas brankas di widget utama tanpa reload halaman
            fetchDashboardData(); 
        } else {
            throw new Error("Gagal menyimpan ke Sheet");
        }
    } catch (error) {
        alert("Gagal mengirim! Periksa kembali URL API Web App atau sinyal internet HP Anda.");
        console.error("Submit Error: ", error);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

/**
 * 5. UTILITY: Helper Format Lokalisasi Mata Uang Rupiah (Rp)
 */
function formatRupiah(angka) {
    return "Rp " + Number(angka).toLocaleString('id-ID');
}

// Fitur Tambahan: Mengizinkan klik tombol Masuk menggunakan tombol 'Enter' pada Keyboard/HP
document.getElementById("pin-input").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        checkAuth();
    }
});
