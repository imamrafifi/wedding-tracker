# Wedding Tracker — Rafi & Sharly

Aplikasi pemantau progress wedding, terhubung ke database MySQL (Aiven)
sehingga semua orang yang membuka linknya melihat data yang sama, dan
setiap update langsung tersimpan permanen.

## Struktur proyek

```
wedding-tracker-app/
├── pages/
│   ├── index.js                  ← tampilan aplikasi (React)
│   ├── _app.js
│   └── api/
│       ├── categories/
│       │   ├── index.js          ← GET (list semua item), POST (tambah item)
│       │   └── [id].js           ← PUT (update item), DELETE (hapus item)
│       └── verify-pin.js         ← cek PIN mode edit (di server, aman)
├── lib/
│   └── db.js                     ← koneksi ke database MySQL Aiven
├── .env.example                  ← contoh isian environment variables
└── package.json
```

## 1. Deploy ke Vercel

1. Upload folder ini ke GitHub (bisa lewat GitHub Desktop, atau upload
   manual lewat github.com/new lalu drag semua file).
2. Di vercel.com, klik **New Project**, pilih repo GitHub tadi, klik **Import**.
3. **Jangan langsung klik Deploy** — dulu isi environment variables (langkah 2).

## 2. Isi Environment Variables di Vercel

Di halaman import project (atau nanti di **Project Settings → Environment
Variables**), tambahkan:

| Nama            | Isi                                                      |
|-----------------|-----------------------------------------------------------|
| `DB_HOST`       | Host dari Aiven, contoh: `mysql-xxxx.h.aivencloud.com`    |
| `DB_PORT`       | Port dari Aiven, contoh: `10020`                           |
| `DB_USER`       | `avnadmin`                                                 |
| `DB_PASSWORD`   | Password dari Aiven                                        |
| `DB_NAME`       | `defaultdb`                                                 |
| `DB_CA_CERT`    | Seluruh isi file `ca.pem` (buka dengan Notepad, copy semua) |

Lihat `.env.example` untuk contoh formatnya.

## 3. Deploy

Klik **Deploy**. Setelah selesai (1–2 menit), Vercel akan memberi link,
contoh: `wedding-tracker-xxxx.vercel.app` — link inilah yang dibagikan
ke tamu/keluarga.

## Cara kerja PIN edit

PIN (`110324`) tersimpan di tabel `app_settings` pada database, dan
dicek lewat `/api/verify-pin` di server — PIN aslinya **tidak pernah
dikirim ke browser**, jadi tidak bisa dilihat siapa pun lewat DevTools.

Untuk mengganti PIN nanti, cukup update lewat SQL:
```sql
UPDATE app_settings SET setting_value = 'PIN_BARU' WHERE setting_key = 'edit_pin';
```

## Menjalankan secara lokal (opsional, untuk uji coba sebelum deploy)

```bash
npm install
cp .env.example .env.local   # lalu isi kredensial Aiven kamu
npm run dev
```
Buka http://localhost:3000
