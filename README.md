# Wedding Tracker — Rafi & Sharly

## Sebelum deploy: jalankan migrasi database

Jalankan (lewat DBeaver, SQL Editor, urut sesuai nomor) terhadap database Aiven kamu:

1. `migration_add_dp_lunas_by.sql` — kalau belum pernah dijalankan sebelumnya.
2. `migration_add_lunas_amount_and_pct.sql` — WAJIB, ini migrasi baru untuk fitur
   "Jumlah Pelunasan" terpisah dan persentase pembagian anggaran Rafi/Sharly.

## Fitur di versi ini

- Form Tambah/Edit Item kondisional: field tambahan berubah otomatis sesuai
  Status Pembayaran (Belum Bayar / DP / Lunas).
- Badge "Lunas" hanya muncul kalau Jumlah Pelunasan benar-benar sama dengan Sisa
  Pembayaran — kalau belum pas, otomatis tetap tampil "DP".
- Field Harga, Jumlah DP, Jumlah Pelunasan otomatis terformat "Rp 1.000.000"
  dan tidak menampilkan "0" saat kosong.
- Ikon tiap item otomatis menyesuaikan nama item (Venue → gedung, Catering →
  alat makan, dst).
- Panel "Rekap & Pembagian Anggaran" (Mode Edit saja): atur persentase target
  Rafi/Sharly, sistem otomatis hitung Target, Total DP, Total Pelunasan,
  Progress, dan Sisa Kewajiban masing-masing. Persentase tersimpan permanen
  di database (tabel app_settings), jadi sama untuk semua orang yang buka
  aplikasinya.
- Tombol "Cetak" (Mode Edit): mencetak laporan lengkap lewat dialog print
  browser — bekerja normal di sini (tidak seperti pratinjau di Claude yang
  butuh workaround, karena situs ini bukan iframe sandboxed).
- Tombol "PDF" (Mode Edit): langsung mengunduh file PDF berisi ringkasan,
  rekap per orang, dan daftar item (sesuai filter tab yang aktif).

## Deploy

1. Extract folder ini, upload isinya (replace semua file lama) ke repo GitHub
   yang sudah terhubung ke Vercel — seperti proses sebelumnya.
2. Commit. Vercel otomatis build & redeploy.
3. Environment Variables di Vercel TIDAK berubah (masih DB_HOST, DB_PORT,
   DB_USER, DB_PASSWORD, DB_NAME, DB_CA_CERT yang sama seperti sebelumnya) —
   tidak perlu diisi ulang.

## PIN edit

Tetap `110324`, tersimpan di tabel `app_settings` (kolom `edit_pin`), dicek
lewat `/api/verify-pin` di server.
