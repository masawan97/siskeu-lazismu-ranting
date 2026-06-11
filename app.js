const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzP8zaqke9c1DVWyxlAhuS0adnDRCs0O87z6vVPYb8lXvgQhPnMamuT3CzrGHE2bMY_/exec";

// Cache data mentah dari server
let rawPenerimaan = [];
let rawPenyaluran = [];
let rawOperasional = [];

// Data yang sudah difilter (default = semua data)
let filteredPenerimaan = [];
let filteredPenyaluran = [];
let filteredOperasional = [];

// =========================================================================
// 1. MULTI-PIN AUTHENTICATION
// =========================================================================
async function checkAuth() {
    const pinInput = document.getElementById("pin-input").value;
    const loginError = document.getElementById("login-error");
    const loginBtn = document.querySelector("#login-screen button");

    if (!pinInput) { loginError.innerText = "PIN wajib diisi!"; return; }

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
                configureRoleDashboard(result.role);
                fetchDashboardData();
                fetchWargaData();
            } else {
                loginError.innerText = "PIN Salah / Tidak Terdaftar di Sistem Ranting.";
            }
        } else { throw new Error(); }
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
        amilActionSection.style.display = "none";
        tabBtnAdmin.style.display = "none";
    } else if (role === "Admin") {
        headerTitle.innerText = "Panel Administrasi Utama";
        amilActionSection.style.display = "block";
        tabBtnAdmin.style.display = "inline-block";
    } else {
        headerTitle.innerText = "KL Lazismu Ranting (Amil)";
        amilActionSection.style.display = "block";
        tabBtnAdmin.style.display = "none";
    }
}

// =========================================================================
// 2. NAVIGASI TAB
// =========================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    event.currentTarget.classList.add('active');
}

// =========================================================================
// 3. FETCH DATA DASHBOARD (termasuk operasional)
// =========================================================================
async function fetchDashboardData() {
    try {
        let response = await fetch(`${WEB_APP_URL}?action=readDashboard`);
        if (response.ok) {
            let data = await response.json();
            document.getElementById("saldo-zakat").innerText = formatRupiah(data.saldoZakat);
            document.getElementById("saldo-infak").innerText = formatRupiah(data.saldoInfak);
            document.getElementById("total-donatur-aktif").innerText = data.totalDonaturAktif + " Orang";
            document.getElementById("total-ops-ranting").innerText = formatRupiah(data.totalOps);

            rawPenerimaan = data.rawPenerimaan || [];
            rawPenyaluran = data.rawPenyaluran || [];
            rawOperasional = data.rawOperasional || [];

            // Default: filtered = semua data
            filteredPenerimaan = [...rawPenerimaan];
            filteredPenyaluran = [...rawPenyaluran];
            filteredOperasional = [...rawOperasional];

            // Set default filter tanggal ke bulan ini
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            document.getElementById("filter-tgl-awal").value = `${y}-${m}-01`;
            document.getElementById("filter-tgl-akhir").value = `${y}-${m}-${String(new Date(y, now.getMonth()+1, 0).getDate()).padStart(2,"0")}`;
        }
    } catch (error) { console.error("Gagal memuat saldo", error); }
}

// =========================================================================
// 4. DATA WARGA
// =========================================================================
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
                    <td><a href="https://wa.me/${w.wa}" target="_blank" style="color:#E8820C;font-weight:600;">${w.wa}</a></td>
                    <td><span class="badge-status" style="background-color:#718096">${w.status}</span></td>
                    <td>${w.alamat}</td>
                </tr>`;
            });
            document.getElementById("warga-rows").innerHTML = rowsHtml;
        }
    } catch (error) { console.error("Gagal menarik data warga", error); }
}

function filterWargaTable() {
    let input = document.getElementById("search-warga").value.toLowerCase();
    let tr = document.getElementById("table-warga-muhammadiyah").getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
        let tdNama = tr[i].getElementsByTagName("td")[1];
        if (tdNama) {
            tr[i].style.display = (tdNama.textContent || tdNama.innerText).toLowerCase().includes(input) ? "" : "none";
        }
    }
}

// =========================================================================
// 5. FILTER PERIODE
// =========================================================================
function applyFilterPeriode() {
    const tglAwal = document.getElementById("filter-tgl-awal").value;
    const tglAkhir = document.getElementById("filter-tgl-akhir").value;

    if (!tglAwal || !tglAkhir) { alert("Isi kedua tanggal terlebih dahulu."); return; }
    if (tglAwal > tglAkhir) { alert("Tanggal awal tidak boleh lebih besar dari tanggal akhir."); return; }

    filteredPenerimaan = rawPenerimaan.filter(r => r[1] >= tglAwal && r[1] <= tglAkhir);
    filteredPenyaluran = rawPenyaluran.filter(r => r[1] >= tglAwal && r[1] <= tglAkhir);
    filteredOperasional = rawOperasional.filter(r => r[1] >= tglAwal && r[1] <= tglAkhir);

    tampilkanRingkasanPeriode(tglAwal, tglAkhir);
}

function resetFilterPeriode() {
    filteredPenerimaan = [...rawPenerimaan];
    filteredPenyaluran = [...rawPenyaluran];
    filteredOperasional = [...rawOperasional];
    document.getElementById("card-ringkasan-periode").style.display = "none";
    alert("Filter direset. Semua data akan diekspor.");
}

function tampilkanRingkasanPeriode(tglAwal, tglAkhir) {
    let totalTerima = 0, totalSalur = 0, totalOps = 0;
    let zakatTerima = 0, infakTerima = 0;
    let zakatSalur = 0, infakSalur = 0;

    filteredPenerimaan.forEach(r => {
        const n = Number(r[4]) || 0;
        totalTerima += n;
        if (r[3] && r[3].includes("Zakat")) zakatTerima += n; else infakTerima += n;
    });
    filteredPenyaluran.forEach(r => {
        const n = Number(r[5]) || 0;
        totalSalur += n;
        if (r[3] && r[3].includes("Zakat")) zakatSalur += n; else infakSalur += n;
    });
    filteredOperasional.forEach(r => { totalOps += (Number(r[3]) || 0); });

    const saldoBersih = totalTerima - totalSalur - totalOps;

    const formatTgl = (t) => {
        const [y, m, d] = t.split("-");
        const bln = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
        return `${d} ${bln[parseInt(m)-1]} ${y}`;
    };

    const rows = [
        { label: "Periode", val: `${formatTgl(tglAwal)} — ${formatTgl(tglAkhir)}`, color: "#4a5568" },
        { label: "Total Penerimaan ZIS", val: formatRupiah(totalTerima), color: "#276749" },
        { label: "  ↳ Zakat", val: formatRupiah(zakatTerima), color: "#718096" },
        { label: "  ↳ Infak/Sedekah", val: formatRupiah(infakTerima), color: "#718096" },
        { label: "Total Penyaluran", val: formatRupiah(totalSalur), color: "#c53030" },
        { label: "  ↳ Dari Zakat", val: formatRupiah(zakatSalur), color: "#718096" },
        { label: "  ↳ Dari Infak", val: formatRupiah(infakSalur), color: "#718096" },
        { label: "Total Operasional", val: formatRupiah(totalOps), color: "#c05621" },
        { label: "Saldo Bersih Periode", val: formatRupiah(saldoBersih), color: saldoBersih >= 0 ? "#276749" : "#c53030", bold: true },
    ];

    let html = rows.map(r =>
        `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;">
            <span style="color:#718096;font-size:0.85rem;">${r.label}</span>
            <span style="color:${r.color};font-weight:${r.bold ? "700" : "600"};font-size:0.9rem;">${r.val}</span>
        </div>`
    ).join("");

    const card = document.getElementById("card-ringkasan-periode");
    document.getElementById("ringkasan-periode-content").innerHTML = html;
    card.style.display = "block";
}

// =========================================================================
// 6. EXPORT EXCEL (SEMUA TIPE)
// =========================================================================
function exportDataKeuangan(type) {
    const tglAwal = document.getElementById("filter-tgl-awal").value || "Semua";
    const tglAkhir = document.getElementById("filter-tgl-akhir").value || "Semua";
    const periodeLabel = tglAwal !== "Semua" ? `${tglAwal}_sd_${tglAkhir}` : "Semua_Periode";

    if (type === "lengkap") {
        exportLengkap(periodeLabel);
        return;
    }

    let dataToExport = [], filename = "", sheetName = "";

    if (type === "penerimaan") {
        if (filteredPenerimaan.length === 0) { alert("Tidak ada data penerimaan untuk periode ini."); return; }
        filename = `Jurnal_Penerimaan_ZIS_${periodeLabel}.xlsx`;
        sheetName = "Penerimaan ZIS";
        dataToExport = filteredPenerimaan.map(item => ({
            "No Kwitansi": item[0], "Tanggal": item[1], "Nama Donatur": item[2],
            "Jenis Dana": item[3], "Nominal (Rp)": Number(item[4]) || 0,
            "Metode Bayar": item[5], "Keterangan": item[6],
            "Petugas Amil": item[7], "Status Sinkron": item[8]
        }));
    } else if (type === "penyaluran") {
        if (filteredPenyaluran.length === 0) { alert("Tidak ada data penyaluran untuk periode ini."); return; }
        filename = `Jurnal_Pentasharufan_${periodeLabel}.xlsx`;
        sheetName = "Pentasharufan";
        dataToExport = filteredPenyaluran.map(item => ({
            "No Penyaluran": item[0], "Tanggal": item[1], "Nama Mustahik": item[2],
            "Sumber Dana": item[3], "Pilar Program": item[4],
            "Nominal (Rp)": Number(item[5]) || 0, "Keterangan": item[6],
            "Petugas Lapangan": item[7], "Status Sinkron": item[8]
        }));
    } else if (type === "operasional") {
        if (filteredOperasional.length === 0) { alert("Tidak ada data operasional untuk periode ini."); return; }
        filename = `Jurnal_Operasional_${periodeLabel}.xlsx`;
        sheetName = "Operasional Amil";
        dataToExport = filteredOperasional.map(item => ({
            "No Transaksi": item[0], "Tanggal": item[1],
            "Jenis Pengeluaran": item[2], "Nominal (Rp)": Number(item[3]) || 0,
            "Keterangan": item[4]
        }));
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    styleWorksheet(ws, dataToExport.length);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
}

function exportLengkap(periodeLabel) {
    if (filteredPenerimaan.length === 0 && filteredPenyaluran.length === 0 && filteredOperasional.length === 0) {
        alert("Tidak ada data untuk diekspor."); return;
    }
    const wb = XLSX.utils.book_new();

    // Sheet 1: Penerimaan
    if (filteredPenerimaan.length > 0) {
        const data = filteredPenerimaan.map(item => ({
            "No Kwitansi": item[0], "Tanggal": item[1], "Nama Donatur": item[2],
            "Jenis Dana": item[3], "Nominal (Rp)": Number(item[4]) || 0,
            "Metode Bayar": item[5], "Keterangan": item[6], "Petugas Amil": item[7]
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        styleWorksheet(ws, data.length);
        XLSX.utils.book_append_sheet(wb, ws, "Penerimaan ZIS");
    }

    // Sheet 2: Penyaluran
    if (filteredPenyaluran.length > 0) {
        const data = filteredPenyaluran.map(item => ({
            "No Penyaluran": item[0], "Tanggal": item[1], "Nama Mustahik": item[2],
            "Sumber Dana": item[3], "Pilar Program": item[4],
            "Nominal (Rp)": Number(item[5]) || 0, "Keterangan": item[6], "Petugas": item[7]
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        styleWorksheet(ws, data.length);
        XLSX.utils.book_append_sheet(wb, ws, "Pentasharufan");
    }

    // Sheet 3: Operasional
    if (filteredOperasional.length > 0) {
        const data = filteredOperasional.map(item => ({
            "No Transaksi": item[0], "Tanggal": item[1],
            "Jenis Pengeluaran": item[2], "Nominal (Rp)": Number(item[3]) || 0, "Keterangan": item[4]
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        styleWorksheet(ws, data.length);
        XLSX.utils.book_append_sheet(wb, ws, "Operasional Amil");
    }

    // Sheet 4: Ringkasan
    let totTerima = 0, totSalur = 0, totOps = 0;
    filteredPenerimaan.forEach(r => totTerima += (Number(r[4]) || 0));
    filteredPenyaluran.forEach(r => totSalur += (Number(r[5]) || 0));
    filteredOperasional.forEach(r => totOps += (Number(r[3]) || 0));

    const ringkasanData = [
        { "Keterangan": "LAPORAN KEUANGAN LAZISMU RANTING", "Jumlah (Rp)": "" },
        { "Keterangan": `Periode: ${periodeLabel.replace(/_/g, " ")}`, "Jumlah (Rp)": "" },
        { "Keterangan": "", "Jumlah (Rp)": "" },
        { "Keterangan": "Total Penerimaan ZIS/Wakaf", "Jumlah (Rp)": totTerima },
        { "Keterangan": "Total Penyaluran / Pentasharufan", "Jumlah (Rp)": -totSalur },
        { "Keterangan": "Total Operasional Amil", "Jumlah (Rp)": -totOps },
        { "Keterangan": "SALDO BERSIH PERIODE", "Jumlah (Rp)": totTerima - totSalur - totOps },
        { "Keterangan": "", "Jumlah (Rp)": "" },
        { "Keterangan": "Total Transaksi Penerimaan", "Jumlah (Rp)": filteredPenerimaan.length + " transaksi" },
        { "Keterangan": "Total Transaksi Penyaluran", "Jumlah (Rp)": filteredPenyaluran.length + " transaksi" },
        { "Keterangan": "Total Transaksi Operasional", "Jumlah (Rp)": filteredOperasional.length + " transaksi" },
    ];
    const wsRingkasan = XLSX.utils.json_to_sheet(ringkasanData);
    XLSX.utils.book_append_sheet(wb, wsRingkasan, "Ringkasan");

    XLSX.writeFile(wb, `Laporan_Keuangan_Lazismu_${periodeLabel}.xlsx`);
}

// Helper: style kolom lebar dan header
function styleWorksheet(ws, rowCount) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    ws["!cols"] = Array.from({ length: range.e.c + 1 }, () => ({ wch: 22 }));
}

// =========================================================================
// 7. EXPORT PDF LAPORAN RINGKASAN
// =========================================================================
function exportLaporanPDF() {
    const tglAwal = document.getElementById("filter-tgl-awal").value;
    const tglAkhir = document.getElementById("filter-tgl-akhir").value;

    let totTerima = 0, totSalur = 0, totOps = 0;
    let zakatTerima = 0, infakTerima = 0, zakatSalur = 0, infakSalur = 0;

    filteredPenerimaan.forEach(r => {
        const n = Number(r[4]) || 0; totTerima += n;
        if (r[3] && r[3].includes("Zakat")) zakatTerima += n; else infakTerima += n;
    });
    filteredPenyaluran.forEach(r => {
        const n = Number(r[5]) || 0; totSalur += n;
        if (r[3] && r[3].includes("Zakat")) zakatSalur += n; else infakSalur += n;
    });
    filteredOperasional.forEach(r => { totOps += (Number(r[3]) || 0); });

    const saldoBersih = totTerima - totSalur - totOps;
    const periodeText = tglAwal && tglAkhir ? `${formatTglIndo(tglAwal)} s.d. ${formatTglIndo(tglAkhir)}` : "Semua Periode";
    const cetakTgl = formatTglIndo(new Date().toISOString().split("T")[0]);

    // Buat detail tabel penerimaan (maks 30 baris)
    const penerimaanRows = filteredPenerimaan.slice(0, 30).map((r, i) =>
        `<tr>
            <td>${i+1}</td><td>${r[1]}</td><td>${r[2]}</td>
            <td>${r[3]}</td><td style="text-align:right">${formatRupiah(r[4])}</td>
            <td>${r[5]}</td>
        </tr>`
    ).join("");

    const penyaluranRows = filteredPenyaluran.slice(0, 30).map((r, i) =>
        `<tr>
            <td>${i+1}</td><td>${r[1]}</td><td>${r[2]}</td>
            <td>${r[4]}</td><td style="text-align:right">${formatRupiah(r[5])}</td>
        </tr>`
    ).join("");

    const opsRows = filteredOperasional.slice(0, 20).map((r, i) =>
        `<tr>
            <td>${i+1}</td><td>${r[1]}</td><td>${r[2]}</td>
            <td style="text-align:right">${formatRupiah(r[3])}</td>
            <td>${r[4]}</td>
        </tr>`
    ).join("");

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Keuangan Lazismu Ranting</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
  body { padding: 30px; color: #1a202c; font-size: 12px; }
  .header { display: flex; align-items: center; border-bottom: 3px solid #E8820C; padding-bottom: 16px; margin-bottom: 20px; }
  .header-text { flex: 1; }
  .header-text h1 { font-size: 18px; color: #E8820C; font-weight: 700; }
  .header-text p { color: #718096; font-size: 11px; margin-top: 2px; }
  .badge-periode { background: #FFF3E0; border: 1px solid #E8820C; color: #c05621; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 8px; display: inline-block; }
  h2 { font-size: 13px; color: #4a5568; border-left: 4px solid #E8820C; padding-left: 8px; margin: 20px 0 10px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
  .summary-card .label { font-size: 10px; color: #718096; text-transform: uppercase; }
  .summary-card .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
  .card-terima .value { color: #276749; }
  .card-salur .value { color: #c53030; }
  .card-ops .value { color: #c05621; }
  .card-saldo .value { color: ${saldoBersih >= 0 ? "#276749" : "#c53030"}; }
  .card-saldo { border-color: #E8820C; background: #FFF8F0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
  th { background: #E8820C; color: white; padding: 8px; text-align: left; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; color: #718096; font-size: 10px; }
  .ttd { text-align: center; }
  .ttd p { font-size: 10px; color: #4a5568; }
  .ttd .garis { border-bottom: 1px solid #4a5568; margin: 40px 0 4px; width: 150px; margin-left: auto; margin-right: auto; }
  @media print { body { padding: 15px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="header-text">
      <h1>Laporan Keuangan Lazismu Ranting</h1>
      <p>Sistem Ekosistem Keuangan (Siskeu) — Lazismu Ranting Muhammadiyah</p>
      <span class="badge-periode">Periode: ${periodeText}</span>
    </div>
  </div>

  <h2>Ringkasan Keuangan</h2>
  <div class="summary-grid">
    <div class="summary-card card-terima">
      <div class="label">Total Penerimaan ZIS/Wakaf</div>
      <div class="value">${formatRupiah(totTerima)}</div>
      <div style="font-size:10px;color:#718096;margin-top:4px;">Zakat: ${formatRupiah(zakatTerima)} | Infak: ${formatRupiah(infakTerima)}</div>
    </div>
    <div class="summary-card card-salur">
      <div class="label">Total Penyaluran (Pentasharufan)</div>
      <div class="value">${formatRupiah(totSalur)}</div>
      <div style="font-size:10px;color:#718096;margin-top:4px;">Dari Zakat: ${formatRupiah(zakatSalur)} | Infak: ${formatRupiah(infakSalur)}</div>
    </div>
    <div class="summary-card card-ops">
      <div class="label">Total Operasional Amil</div>
      <div class="value">${formatRupiah(totOps)}</div>
      <div style="font-size:10px;color:#718096;margin-top:4px;">${filteredOperasional.length} transaksi operasional</div>
    </div>
    <div class="summary-card card-saldo">
      <div class="label">Saldo Bersih Periode</div>
      <div class="value">${formatRupiah(saldoBersih)}</div>
      <div style="font-size:10px;color:#718096;margin-top:4px;">${filteredPenerimaan.length} penerimaan, ${filteredPenyaluran.length} penyaluran</div>
    </div>
  </div>

  <h2>Rincian Penerimaan ZIS</h2>
  ${filteredPenerimaan.length > 0 ? `
  <table>
    <thead><tr><th>#</th><th>Tanggal</th><th>Donatur</th><th>Jenis Dana</th><th>Nominal</th><th>Metode</th></tr></thead>
    <tbody>${penerimaanRows}</tbody>
  </table>
  ${filteredPenerimaan.length > 30 ? `<p style="font-size:10px;color:#718096;">* Menampilkan 30 dari ${filteredPenerimaan.length} transaksi. Gunakan ekspor Excel untuk data lengkap.</p>` : ""}
  ` : `<p style="color:#718096;font-size:11px;margin-bottom:16px;">Tidak ada data penerimaan pada periode ini.</p>`}

  <h2>Rincian Penyaluran (Pentasharufan)</h2>
  ${filteredPenyaluran.length > 0 ? `
  <table>
    <thead><tr><th>#</th><th>Tanggal</th><th>Mustahik</th><th>Program</th><th>Nominal</th></tr></thead>
    <tbody>${penyaluranRows}</tbody>
  </table>
  ${filteredPenyaluran.length > 30 ? `<p style="font-size:10px;color:#718096;">* Menampilkan 30 dari ${filteredPenyaluran.length} transaksi.</p>` : ""}
  ` : `<p style="color:#718096;font-size:11px;margin-bottom:16px;">Tidak ada data penyaluran pada periode ini.</p>`}

  <h2>Rincian Operasional Amil</h2>
  ${filteredOperasional.length > 0 ? `
  <table>
    <thead><tr><th>#</th><th>Tanggal</th><th>Jenis Pengeluaran</th><th>Nominal</th><th>Keterangan</th></tr></thead>
    <tbody>${opsRows}</tbody>
  </table>
  ` : `<p style="color:#718096;font-size:11px;margin-bottom:16px;">Tidak ada data operasional pada periode ini.</p>`}

  <div class="footer">
    <div>
      <p>Dicetak: ${cetakTgl}</p>
      <p>Siskeu Lazismu Ranting — memberi untuk negeri</p>
    </div>
    <div class="ttd">
      <p>Mengetahui, Ketua Ranting</p>
      <div class="garis"></div>
      <p>( _________________________ )</p>
    </div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(htmlContent);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
}

// =========================================================================
// 8. FORM SUBMIT & UTILS
// =========================================================================
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
function formatTglIndo(tgl) {
    if (!tgl) return "-";
    const [y, m, d] = tgl.split("-");
    const bln = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    return `${parseInt(d)} ${bln[parseInt(m)-1]} ${y}`;
}
