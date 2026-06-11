const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzP8zaqke9c1DVWyxlAhuS0adnDRCs0O87z6vVPYb8lXvgQhPnMamuT3CzrGHE2bMY_/exec";

// Menyimpan data mentah jurnal untuk keperluan ekspor client-side
let rawPenerimaan = [];
let rawPenyaluran = [];

/**
 * 1. MULTI-PIN AUTHENTICATION (Amil, Pimpinan, Admin)
 */
async function checkAuth() {
    const pinInput = document.getElementById("pin-input").value;
    const loginError = document.getElementById("login-error");
    const loginBtn = document.querySelector("#login-screen button");
    
    if (!pinInput) {
        loginError.innerText = "PIN wajib diisi!";
        return;
    }

    loginBtn.innerText = "Memverifikasi Otoritas...";
    loginBtn.disabled = true;
    loginError.innerText = "";

    try {
        let response = await fetch(`${WEB_APP_URL}?action=verifyPin&pin=${encodeURIComponent(pinInput)}`);
        if (response.ok) {
            let result = await response.json();
            
            if (result.success === true) {
                document.getElementById("login-screen").style.display = "none";
                document.getElementById("app").style.display = "block";
                
                // Atur Hak Akses View Berdasarkan Role dari Spreadsheet
                configureRoleDashboard(result.role);
                fetchDashboardData();
                fetchWargaData();
            } else {
                loginError.innerText = "PIN Salah / Tidak Terdaftar di Sistem Ranting.";
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

function configureRoleDashboard(role) {
    const amilActionSection = document.getElementById("amil-actions");
    const tabBtnAdmin = document.getElementById("tab-btn-admin");
    const headerTitle = document.getElementById("user-welcome");

    if (role === "Pimpinan") {
        headerTitle.innerText = "Mekanisme Kontrol Pimpinan";
        amilActionSection.style.display = "none"; // Pimpinan hanya bisa memantau, tidak menginput data lapangan
        tabBtnAdmin.style.display = "none";
    } else if (role === "Admin") {
        headerTitle.innerText = "Panel Administrasi Utama";
        amilActionSection.style.display = "block";
        tabBtnAdmin.style.display = "inline-block"; // Tampilkan tab ekspor laporan keuangan
    } else {
        headerTitle.innerText = "KL Lazismu Ranting (Amil)";
        amilActionSection.style.display = "block";
        tabBtnAdmin.style.display = "none";
    }
}

/**
 * 2. NAVIGASI ANTAR TAB DASBOR
 */
function switchTab(tabId) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    contents.forEach(content => content.style.display = 'none');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).style.display = 'block';
    event.currentTarget.classList.add('active');
}

/**
 * 3. LOAD DATA RINGKASAN KAS & STATISTIK PIMPINAN
 */
async function fetchDashboardData() {
    try {
        let response = await fetch(`${WEB_APP_URL}?action=readDashboard`);
        if (response.ok) {
            let data = await response.json();
            document.getElementById("saldo-zakat").innerText = formatRupiah(data.saldoZakat);
            document.getElementById("saldo-infak").innerText = formatRupiah(data.saldoInfak);
            document.getElementById("total-donatur-aktif").innerText = data.totalDonaturAktif + " Orang";
            document.getElementById("total-ops-ranting").innerText = formatRupiah(data.totalOps);
            
            // Simpan cache data mentah untuk fungsi ekspor admin
            rawPenerimaan = data.rawPenerimaan;
            rawPenyaluran = data.rawPenyaluran;
        }
    } catch (error) {
        console.error("Gagal memuat saldo", error);
    }
}

/**
 * 4. LOAD DAN LIVE FILTER SELURUH WARGA MUHAMMADIYAH
 */
async function fetchWargaData() {
    try {
        let response = await fetch(`${WEB_APP_URL}?action=readWarga`);
        if (response.ok) {
            let wargaList = await response.json();
            let rowsHtml = "";
            wargaList.forEach(w => {
                rowsHtml += `<tr>
                    <td><strong>${w.id}</strong></td>
                    <td>${w.nama}</td>
                    <td><a href="https://wa.me/${w.wa}" target="_blank" style="color:#2e7d32; font-weight:600;">${w.wa}</a></td>
                    <td><span class="badge-status" style="background-color:#718096">${w.status}</span></td>
                    <td>${w.alamat}</td>
                </tr>`;
            });
            document.getElementById("warga-rows").innerHTML = rowsHtml;
        }
    } catch (error) {
        console.error("Gagal menarik data warga", error);
    }
}

function filterWargaTable() {
    let input = document.getElementById("search-warga").value.toLowerCase();
    let table = document.getElementById("table-warga-muhammadiyah");
    let tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        let tdNama = tr[i].getElementsByTagName("td")[1];
        if (tdNama) {
            let textValue = tdNama.textContent || tdNama.innerText;
            tr[i].style.display = textValue.toLowerCase().indexOf(input) > -1 ? "" : "none";
        }
    }
}

/**
 * 5. MENU WAJIB ADMIN: AUTOMATED EXPORT FORMAT SIM KEUANGAN PUSAT
 */
function exportDataKeuangan(type) {
    let dataToExport = [];
    let filename = "";

    if (type === 'penerimaan') {
        filename = "SIM_Lazismu_Import_Penerimaan_Ranting.xlsx";
        // Format susunan kolom disesuaikan persis template SIM pusat
        dataToExport = rawPenerimaan.map(item => ({
            "No_Kwitansi": item[0],
            "Tanggal_Trx": item[1],
            "ID_Donatur": item[2],
            "Asal_Kantong_Dana": item[3],
            "Nominal_Jumlah": item[4],
            "Metode_Bayar": item[5],
            "Uraian_Keterangan": item[6],
            "Petugas_Amil": item[7],
            "Status_Sinkron_Pusat": item[8]
        }));
    } else {
        filename = "SIM_Lazismu_Import_Pentasharufan_Ranting.xlsx";
        dataToExport = rawPenyaluran.map(item => ({
            "No_Penyaluran": item[0],
            "Tanggal_Trx": item[1],
            "ID_Mustahik": item[2],
            "Sumber_Dana": item[3],
            "Pilar_Program": item[4],
            "Nominal_Penyaluran": item[5],
            "Detail_Keterangan": item[6],
            "Petugas_Lapangan": item[7],
            "Status_Sinkron_Pusat": item[8]
        }));
    }

    if(dataToExport.length === 0) {
        alert("Tidak ada baris data transaksi untuk diekspor saat ini.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jurnal_SIM_Pusat");
    XLSX.writeFile(workbook, filename);
}

// Kontrol Pengiriman Input Form & Utility Format
async function submitData(event, type) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const dataObj = {};
    formData.forEach((value, key) => { dataObj[key] = value; });
    dataObj.action = `write_${type}`; 

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "Memproses..."; btn.disabled = true;

    try {
        let response = await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(dataObj) });
        if (response.ok) {
            alert("Berhasil dimasukkan!");
            form.reset();
            closeModal(form.closest('.modal').id);
            fetchDashboardData(); 
        }
    } catch (e) { alert("Error koneksi database."); } 
    finally { btn.innerText = originalText; btn.disabled = false; }
}

function openModal(id) { document.getElementById(id).style.display = "block"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
function formatRupiah(angka) { return "Rp " + Number(angka).toLocaleString('id-ID'); }
