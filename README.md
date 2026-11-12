<div align="center">

# 🏪 Kasir Grosir Premium

### Aplikasi Kasir (POS) & Manajemen Toko Grosir untuk **Toko Gemilang Jaya**

*Cepat di kasir, rapi di laporan, tersinkron real-time di semua perangkat.*

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)

![Dark Mode](https://img.shields.io/badge/Tema-Dark_%26_Light-0b0f17?style=flat-square&labelColor=f59e0b)
![Excel](https://img.shields.io/badge/Export-Excel_.xlsx-217346?style=flat-square&logo=microsoftexcel&logoColor=white)
![Roles](https://img.shields.io/badge/Peran-Owner_%7C_Kasir-f59e0b?style=flat-square)
![Bahasa](https://img.shields.io/badge/Bahasa-Indonesia-red?style=flat-square)

</div>

---

## 📖 Daftar Isi

- [Tentang Aplikasi](#-tentang-aplikasi)
- [Fitur Unggulan](#-fitur-unggulan)
- [Hak Akses Peran](#-hak-akses-peran)
- [Teknologi](#-teknologi)
- [Struktur Proyek](#-struktur-proyek)
- [Instalasi Cepat](#-instalasi-cepat)
- [Setup Supabase](#-setup-supabase)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Build APK Android (Capacitor)](#-build-apk-android-capacitor)
- [Cara Pakai](#-cara-pakai)
- [Export Excel & Backup](#-export-excel--backup)
- [Skema Database](#-skema-database)
- [Troubleshooting](#-troubleshooting)
- [Rencana Pengembangan](#-rencana-pengembangan)

---

## ✨ Tentang Aplikasi

**Kasir Grosir Premium** adalah aplikasi kasir modern yang dibuat khusus untuk kebutuhan toko grosir. Aplikasi ini berjalan di **browser laptop** maupun sebagai **aplikasi Android (APK)**, dengan data tersimpan di cloud **Supabase** sehingga kasir dan pemilik bisa bekerja dari perangkat berbeda, dan semua perubahan muncul **otomatis secara real-time**.

Yang membedakannya dari kasir biasa:

- 💰 **Harga grosir otomatis**: cukup masukkan barang, bila jumlahnya mencapai batas minimum, harga grosir langsung berlaku.
- 🔄 **Sinkron real-time** antar perangkat lewat Supabase Realtime.
- 🎨 **Tampilan premium**: Dark Luxury Glassmorphism dan Light Mode yang bersih, penuh animasi halus.
- 📊 **Laporan siap Excel**: file `.xlsx` asli dengan 4 sheet rapi.

---

## 🚀 Fitur Unggulan

### 🛒 Kasir (POS)
| Fitur | Keterangan |
|---|---|
| **Scan barcode** | Ketik atau scan barcode lalu tekan `Enter`, barang langsung masuk keranjang |
| **Pencarian & kategori** | Cari nama/barcode dan filter dengan pill kategori |
| **Smart auto-pricing** | Harga grosir aktif otomatis saat qty ≥ min. qty grosir, plus label *"Hemat Grosir"* |
| **Diskon tambahan** | Dalam Rupiah (nominal) atau persen (%) |
| **3 metode bayar** | Tunai, QRIS, Transfer Bank |
| **Uang tunai cepat** | Tombol `Uang Pas`, `Rp 20.000`, `Rp 50.000`, `Rp 100.000`, `Rp 200.000` plus kembalian otomatis |
| **Validasi stok** | Tidak bisa menjual melebihi stok yang ada |
| **Layar sukses checkout** | Animasi centang bercahaya, confetti, kembalian besar dan jelas |
| **Cetak struk** | Pilihan kertas thermal **58 mm / 80 mm** |
| **Kirim struk ke WhatsApp** | Ke nomor pelanggan, atau pilih kontak sendiri |
| **Stok aman multi-kasir** | Pengurangan stok dilakukan atomik di server (`decrement_stock`) |

### 📈 Dashboard (Owner)
- **Omset, HPP, Pengeluaran, Laba Bersih** dengan angka yang menghitung naik (*count-up*)
- **Target Omset Harian** dengan progress bar beranimasi yang bisa diatur Owner
- **Grafik penjualan 7 hari** dengan tooltip saat disentuh atau di-hover
- **Top 5 Produk Terlaris** lengkap dengan leaderboard dan progress bar
- **Peringatan stok menipis** dengan badge berdenyut
- Filter periode: Hari ini, 7 hari, 30 hari, Semua

### 📦 Produk & Stok (Owner)
- Tambah, ubah, dan hapus produk
- Harga **modal (HPP)**, **eceran**, **grosir**, dan **min. qty grosir**
- Satuan: Pcs, Dus, Pack, Sak
- Ambang batas stok menipis per produk
- Validasi cerdas: barcode unik, harga grosir tidak boleh lebih tinggi dari eceran

### 🧾 Riwayat Transaksi
- Filter tanggal dan pencarian nomor transaksi
- Klik transaksi untuk melihat detail dan **cetak ulang struk**
- **Hapus transaksi** (Owner) dengan opsi *"Kembalikan stok barang"* dan konfirmasi yang elegan
- Ringkasan jumlah transaksi, omset, dan laba kotor

### 💸 Pengeluaran (Owner)
- Catat biaya operasional: gaji, listrik, sewa, transportasi, dan lainnya
- Ubah, hapus, dan filter per periode

### ⚙️ Pengaturan (Owner)
- Backup & restore data (`.json`)
- Export laporan Excel lengkap
- Reset semua data (dengan konfirmasi mengetik `RESET`)
- Status koneksi cloud real-time

### 🌗 Tampilan
- **Dark Mode**: Dark Luxury Glassmorphism dengan aksen emas/amber dan emerald
- **Light Mode**: Clean Modern Glass dengan latar pearl dan kartu putih
- Pilihan tema tersimpan otomatis
- **Responsif penuh**: nyaman di desktop, tablet, serta HP **portrait** dan **landscape** (layout kasir tablet: produk di kiri, keranjang di kanan)

---

## 🔐 Hak Akses Peran

Hak akses dijaga di dua lapis: **antarmuka aplikasi** dan **Row Level Security (RLS) Supabase**.

| Menu / Aksi | 👑 Owner | 🧑‍💼 Kasir |
|---|:---:|:---:|
| Kasir (POS) | ✅ | ✅ |
| Riwayat Transaksi (lihat) | ✅ | ✅ |
| Lihat laba kotor per transaksi | ✅ | ❌ |
| Hapus transaksi | ✅ | ❌ |
| Dashboard | ✅ | ❌ |
| Produk & Stok (tambah/ubah/hapus) | ✅ | ❌ (hanya lihat di kasir) |
| Pengeluaran | ✅ | ❌ |
| Pengaturan, Backup, Export, Reset | ✅ | ❌ |

> Akun baru otomatis berperan **Kasir**. Menjadikannya Owner dilakukan lewat SQL (lihat [Setup Supabase](#-setup-supabase)).

---

## 🧰 Teknologi

| Lapisan | Teknologi |
|---|---|
| Framework UI | **React** + **Vite** |
| Styling | **Tailwind CSS 3** + CSS keyframes kustom |
| Ikon | **lucide-react** |
| Backend & Database | **Supabase** (PostgreSQL, Auth, Realtime, RLS) |
| Export Excel | **SheetJS** (`xlsx`) |
| Aplikasi Android | **Capacitor** (`@capacitor/core`, `filesystem`, `share`) |

---

## 📁 Struktur Proyek

```
kasir-grosir/
├── src/
│   ├── App.jsx              # Seluruh aplikasi (UI, logika, integrasi Supabase)
│   ├── main.jsx             # Entry point React
│   └── index.css            # Direktif Tailwind (@tailwind base/components/utilities)
├── android/                 # Proyek Android (dibuat oleh Capacitor)
├── supabase-schema.sql      # Skema tabel, fungsi, RLS, dan realtime
├── capacitor.config.json    # Konfigurasi Capacitor
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── package.json
```

---

## ⚡ Instalasi Cepat

### Prasyarat
- [Node.js](https://nodejs.org) versi 18 atau lebih baru
- Akun [Supabase](https://supabase.com) (gratis)
- *(Opsional, untuk APK)* [Android Studio](https://developer.android.com/studio)

### 1. Pasang dependensi

```bash
npm install
npm install @supabase/supabase-js lucide-react xlsx
npm install @capacitor/core @capacitor/filesystem @capacitor/share
```

### 2. Pastikan Tailwind terpasang

`tailwind.config.js`:

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 🗄️ Setup Supabase

### 1. Buat proyek
Buat proyek baru di [supabase.com](https://supabase.com), lalu buka **Project Settings → API** dan salin:
- **Project URL**
- **anon / publishable key**

### 2. Isi konfigurasi di `src/App.jsx`

```js
const SUPABASE_URL = 'https://PROJECT-ID-ANDA.supabase.co';
const SUPABASE_ANON_KEY = 'KUNCI_PUBLISHABLE_ANDA';
```

> 💡 Anon/publishable key aman berada di sisi klien **selama RLS aktif** (sudah diatur oleh skema). Jangan pernah memakai `service_role` key di aplikasi ini.

### 3. Jalankan skema SQL
Buka **SQL Editor → New query**, tempel isi `supabase-schema.sql`, lalu klik **Run** (cukup **sekali**). Skema ini membuat:
- Tabel `profiles`, `products`, `transactions`, `expenses`
- Fungsi `is_owner()`, `decrement_stock()`, dan trigger profil otomatis
- Kebijakan RLS per peran
- Publikasi Realtime

### 4. Buat akun login
Buka **Authentication → Users → Add user**, isi email dan PIN/kata sandi, lalu **centang Auto Confirm User**. Buat satu akun untuk pemilik dan satu atau lebih akun untuk kasir.

### 5. Jadikan satu akun sebagai Owner
Di **SQL Editor**, jalankan (ganti emailnya):

```sql
update public.profiles set role = 'owner'
where id = (select id from auth.users where email = 'pemilik@tokoanda.com');
```

Selesai. Akun lain tetap berperan **Kasir**.

---

## ▶️ Menjalankan Aplikasi

```bash
# Mode pengembangan
npm run dev

# Build produksi
npm run build

# Pratinjau hasil build
npm run preview
```

Buka alamat yang ditampilkan (biasanya `http://localhost:5173`), lalu masuk dengan email dan PIN akun Anda.

---

## 📱 Build APK Android (Capacitor)

### Pertama kali

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Toko Gemilang Jaya" com.gemilangjaya.kasir --web-dir=dist
npm run build
npx cap add android
```

### Setiap kali ada perubahan kode

```bash
npm run build
npx cap sync android
npx cap open android
```

Di **Android Studio**, pilih **Build → Build Bundle(s) / APK(s) → Build APK(s)**. File APK ada di `android/app/build/outputs/apk/`.

### Catatan Android
- Export Excel di APK memakai **dialog Share bawaan Android**, jadi file bisa langsung disimpan ke File Manager atau dikirim ke WhatsApp/Excel.
- Setelah memasang plugin baru (`filesystem`, `share`), selalu jalankan `npx cap sync android`.
- Aplikasi mendukung rotasi **landscape** dan **portrait**. Pastikan orientasi di `AndroidManifest.xml` tidak dikunci bila ingin keduanya.

---

## 🧭 Cara Pakai

### Melayani pelanggan
1. Buka menu **Kasir (POS)**.
2. Scan barcode atau ketik nama barang, lalu tekan `Enter`. Atau klik kartu produk.
3. Atur jumlah di keranjang. Harga grosir berlaku otomatis bila syaratnya terpenuhi.
4. (Opsional) Isi diskon tambahan.
5. Pilih metode bayar. Untuk tunai, isi uang dibayar atau pakai tombol cepat.
6. Klik **Bayar & cetak struk**. Layar sukses menampilkan kembalian, tombol cetak, dan tombol WhatsApp.

### Menghapus transaksi (Owner)
1. Buka **Riwayat Transaksi**.
2. Klik ikon 🗑️ pada transaksi (atau buka detail struk lalu klik **Hapus**).
3. Centang atau biarkan *"Kembalikan stok barang"* sesuai kebutuhan, lalu konfirmasi.

### Mengatur target harian (Owner)
Di **Dashboard**, klik **Atur target** pada kartu *Target omset hari ini*, isi nominal, lalu simpan.

> ℹ️ Target harian tersimpan di perangkat yang dipakai (`localStorage`), belum tersinkron antar perangkat.

---

## 📊 Export Excel & Backup

### Export Excel (`.xlsx`)
Satu file berisi 4 sheet:

| Sheet | Isi |
|---|---|
| **Ringkasan Laporan** | Omset, HPP, laba kotor, pengeluaran, laba bersih, rekap metode bayar, nilai stok |
| **Riwayat Transaksi** | Nomor, waktu, kasir, barang, subtotal, diskon, total, HPP, laba kotor, metode |
| **Data Produk & Stok** | Barcode, harga, stok, status stok (Aman/Menipis/Habis), nilai stok |
| **Pengeluaran** | Tanggal, kategori, keterangan, nominal, dan total |

Tombol export tersedia di **Pengaturan**, **Riwayat Transaksi** (mengikuti filter tanggal), dan **Pengeluaran** (mengikuti periode).

- 💻 **Laptop/Web**: file langsung terunduh.
- 📱 **Android**: muncul dialog Share untuk menyimpan atau mengirim file.

### Backup & Restore
- **Export backup (`.json`)** menyimpan seluruh produk, transaksi, dan pengeluaran.
- **Import / restore** mengganti seluruh data dengan isi file backup (file divalidasi dulu).
- Disarankan backup rutin, terutama sebelum **Reset Semua Data**.

---

## 🗃️ Skema Database

```
profiles        id (→ auth.users) · name · role ('owner'|'cashier') · created_at
products        id · sku (unik) · name · category · unit · cost · retail · wholesale
                min_qty · stock · low_stock
transactions    id · date · items (jsonb) · subtotal · discount · total · method
                paid · change_amount · hpp · cashier
expenses        id · date · category · note · amount
```

**Fungsi penting**
- `is_owner()`: cek apakah pengguna yang login adalah Owner (dipakai oleh RLS)
- `decrement_stock(p_id, p_qty)`: kurangi stok secara atomik, aman bila dua kasir menjual barang yang sama
- `handle_new_user()`: membuat profil otomatis (default `cashier`) saat akun baru dibuat

---

## 🛠️ Troubleshooting

<details>
<summary><b>Tidak bisa login / "Email atau PIN salah"</b></summary>

Pastikan user dibuat di **Authentication → Users** dengan **Auto Confirm User** dicentang, dan PIN minimal 6 karakter.
</details>

<details>
<summary><b>Setelah login hanya muncul menu Kasir dan Riwayat</b></summary>

Akun tersebut masih berperan Kasir. Jalankan SQL *"Jadikan satu akun sebagai Owner"* di atas, lalu keluar dan masuk kembali.
</details>

<details>
<summary><b>Data tidak tersimpan / muncul "Gagal menyimpan ke cloud"</b></summary>

Periksa apakah `supabase-schema.sql` sudah dijalankan sepenuhnya dan akun yang dipakai punya hak akses yang sesuai (RLS). Pesan error lengkap dari Supabase ditampilkan pada notifikasi.
</details>

<details>
<summary><b>Status "Sinkron terputus"</b></summary>

Cek koneksi internet. Pastikan Realtime aktif untuk tabel `products`, `transactions`, dan `expenses` (sudah diatur oleh skema SQL).
</details>

<details>
<summary><b>File Excel tidak muncul di APK</b></summary>

Pastikan `@capacitor/filesystem` dan `@capacitor/share` terpasang, lalu jalankan `npm run build` dan `npx cap sync android`, kemudian pasang ulang APK. Di Android, file muncul lewat dialog Share, bukan terunduh otomatis ke folder Download.
</details>

<details>
<summary><b>Tombol cetak struk tidak bekerja di APK</b></summary>

Cetak memakai fitur cetak browser (`window.print`), yang tidak selalu tersedia di WebView Android. Alternatifnya, gunakan tombol **Kirim WA** untuk mengirim struk sebagai teks.
</details>

<details>
<summary><b>Tampilan Light Mode ada teks yang kurang kontras</b></summary>

Light Mode diatur lewat aturan CSS di konstanta `GLOBAL_CSS` pada `App.jsx`. Tambahkan aturan warna untuk kelas yang bermasalah di bagian `.tl`.
</details>

---

## 🗺️ Rencana Pengembangan

- [ ] Sinkronisasi target harian ke Supabase
- [ ] Mode offline penuh dengan antrean sinkronisasi
- [ ] Manajemen akun kasir dari dalam aplikasi
- [ ] Laporan per kasir dan per kategori
- [ ] Cetak struk Bluetooth thermal langsung dari Android
- [ ] Retur barang dan pelanggan langganan

---

## 🔒 Catatan Keamanan

- Jangan membagikan kunci `service_role` Supabase.
- Gunakan PIN/kata sandi yang kuat untuk akun Owner.
- Lakukan **backup rutin** (`.json`) dan simpan di tempat terpisah.
- Tindakan **Reset Semua Data** bersifat permanen dan berlaku di semua perangkat.

---

<div align="center">

### Dibuat dengan ❤️ untuk **Toko Gemilang Jaya**

*Jl. Sisingamangaraja No. 88, Medan*

⭐ Semoga usaha semakin lancar dan laris manis! ⭐

</div>
