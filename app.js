// Gantilah string URL di bawah ini dengan Web App URL dari Deployment Google Apps Script Anda!
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzcp07TYzkVUYKxlh6Rr14sUeCj8-E1QVlOaTOOc6ThNIOZvAG5uv8he0oB_RMYbyhA/exec";

// Login Autentikasi Internal Ranting (Ganti PIN 191212 sesuai selera)
function checkAuth() {
    const pin = document.getElementById("pin-input").value;
    if (pin === "191212") { 
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("app").style.display = "block";
        fetchDashboardData();
    } else {
        document.getElementById("login-error").innerText = "PIN Keliru! Silakan periksa kembali.";
    }
}

function openModal(id) { document.getElementById(id).style.display = "block"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

// Mengambil Data Saldo Ringkasan secara Live dari Rumus Excel Backend
async function fetchDashboardData() {
    try {
        let response = await fetch(`${WEB_APP_URL}?action=readDashboard`);
        if (response.ok) {
            let data = await response.json();
            document.getElementById("saldo-zakat").innerText = formatRupiah(data.saldoZakat);
            document.getElementById("saldo-infak").innerText = formatRupiah(data.saldoInfak);
        }
    } catch (error) {
        console.error("Koneksi gagal atau database sibuk.", error);
    }
}

// Mengirimkan Objek Data Gabungan Dropdown & Input ke Sheet
async function submitData(event, type) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const dataObj = {};
    formData.forEach((value, key) => { dataObj[key] = value; });
    dataObj.action = `write_${type}`; 

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
            form.reset();
            closeModal(form.closest('.modal').id);
            fetchDashboardData(); // Update widget angka kantong dana seketika
        } else {
            throw new Error("Respon API bermasalah.");
        }
    } catch (error) {
        alert("Gagal mengirim! Periksa jaringan internet HP Anda.");
        console.error(error);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function formatRupiah(angka) {
    return "Rp " + Number(angka).toLocaleString('id-ID');
}
