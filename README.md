# 📦 Ekstensi-LEMBAR

Repositori ekstensi JavaScript untuk aplikasi **Lembar** — pembaca komik ringan berbasis Android.

Setiap ekstensi merupakan sebuah modul JavaScript yang mengimplementasikan antarmuka standar dan dapat dieksekusi oleh JS Runtime yang ada di aplikasi Lembar.

---

## 📁 Struktur Direktori

```text
Ekstensi-LEMBAR/
├── src/
│   ├── core/                     # Utilities bersama: HTTP, parser HTML, formatter
│   │   ├── contract.js           # Definisi kontrak antarmuka ekstensi
│   │   ├── http.js               # HTTP client wrapper
│   │   └── parser.js             # HTML parser helper (berbasis Cheerio)
│   ├── templates/
│   │   └── extension-template.js # Template dasar untuk ekstensi baru
│   └── sources/                  # Seluruh ekstensi sumber komik
│       └── sample-source/
│           ├── manifest.json     # Metadata sumber
│           └── index.js          # Logic utama ekstensi
├── scripts/
│   ├── build.js                  # Bundler & generator index.json
│   ├── test-extension.js         # CLI tester untuk ekstensi
│   └── new-extension.js          # Generator ekstensi baru dari template
├── tests/                        # Unit test
├── dist/                         # Output build (otomatis dibuat)
│   ├── index.json                # Daftar semua ekstensi aktif
│   └── [source-id].js            # Bundel JS per ekstensi
├── package.json
└── README.md
```

---

## 🚀 Memulai

### Prasyarat
- Node.js **>= 18.0.0**
- npm **>= 8**

### Instalasi
```bash
git clone <repo-url>
cd Ekstensi-LEMBAR
npm install
```

---

## 📌 Kontrak Antarmuka Ekstensi

Setiap ekstensi **wajib** mengimplementasikan fungsi-fungsi berikut:

### `metadata` _(Object)_
```js
const metadata = {
  id: "source-id",          // String unik, lowercase, tanpa spasi
  name: "Nama Sumber",      // Nama tampilan
  baseUrl: "https://...",   // Base URL situs
  version: "1.0.0",         // Versi ekstensi (semver)
  lang: "id",               // Kode bahasa (ISO 639-1)
  icon: "https://...",      // URL ikon sumber
  nsfw: false               // Apakah konten dewasa?
};
```

### `getPopular(page)` → `Promise<MangaList>`
Mengembalikan daftar komik populer.

### `getLatest(page)` → `Promise<MangaList>`
Mengembalikan daftar komik update terbaru.

### `search(query, page, filters?)` → `Promise<MangaList>`
Mencari komik berdasarkan kata kunci dan filter.

### `getDetail(mangaId)` → `Promise<MangaDetail>`
Mengambil detail lengkap komik beserta daftar chapter.

### `getPageList(chapterId)` → `Promise<string[]>`
Mengambil daftar URL gambar halaman untuk sebuah chapter.

### `getFilterList()` → `Filter[]` _(Opsional)_
Mengembalikan daftar filter pencarian yang tersedia.

Lihat [`src/core/contract.js`](src/core/contract.js) untuk definisi tipe data lengkap.

---

## 🔨 Membuat Ekstensi Baru

### Cara Cepat (Generator)
```bash
npm run new
# Atau: node scripts/new-extension.js <source-id> <"Nama Sumber"> <https://base-url.com>
```

### Cara Manual
1. Buat folder baru di `src/sources/<source-id>/`.
2. Buat file `manifest.json` berdasarkan contoh di [`src/sources/sample-source/manifest.json`](src/sources/sample-source/manifest.json).
3. Buat file `index.js` berdasarkan template di [`src/templates/extension-template.js`](src/templates/extension-template.js).
4. Implementasikan seluruh fungsi kontrak.

---

## 🧪 Pengujian Ekstensi

### Uji Satu Ekstensi via CLI
```bash
# Uji fungsi getPopular
node scripts/test-extension.js --source <source-id> --fn getPopular --page 1

# Uji fungsi search
node scripts/test-extension.js --source <source-id> --fn search --query "one piece"

# Uji fungsi getDetail
node scripts/test-extension.js --source <source-id> --fn getDetail --id <manga-id>

# Uji fungsi getPageList
node scripts/test-extension.js --source <source-id> --fn getPageList --id <chapter-id>
```

### Unit Test
```bash
npm test
```

---

## ⚙️ Build

Untuk mengkompilasi semua ekstensi dan menghasilkan `dist/index.json`:

```bash
npm run build
```

Output yang dihasilkan di folder `dist/`:
- **`index.json`** — Manifes repositori berisi daftar semua ekstensi aktif.
- **`<source-id>.js`** — File JavaScript bundle untuk setiap ekstensi.

---

## 📋 Format `dist/index.json`

```json
{
  "version": 1,
  "generated_at": "2026-08-01T00:00:00.000Z",
  "extensions": [
    {
      "id": "source-id",
      "name": "Nama Sumber",
      "version": "1.0.0",
      "lang": "id",
      "icon": "https://...",
      "nsfw": false,
      "bundle_url": "https://<host>/dist/source-id.js"
    }
  ]
}
```

---

## 📱 Cara Penggunaan di Aplikasi Lembar (Android Template)

Ekstensi JavaScript yang sudah di-build (`dist/<source-id>.js`) siap dikonsumsi oleh aplikasi Android **Lembar** dengan 2 metode utama:

### 1. Menggunakan Repositori Online (Rekomendasi)
1. Push folder `dist/` ke repositori GitHub ini.
2. Di aplikasi Android, panggil endpoint `index.json` langsung via URL Raw GitHub:
   `https://raw.githubusercontent.com/prdt256/Ekstensi-LEMBAR/main/dist/index.json`
3. Aplikasi akan menampilkan daftar semua ekstensi yang tersedia secara dinamis.
4. Ketika user memasang ekstensi, Android mengunduh file `.js`(misal: ``` https://raw.githubusercontent.com/prdt256/Ekstensi-LEMBAR/main/dist/komikindo.js ```) dan menyimpannya di penyimpanan internal aplikasi.

### 2. Penggunaan Lokal (Assets / Offline Mode)
Jika ingin menyertakan ekstensi secara langsung saat aplikasi dibuild:
1. Salin file dari folder `dist/` (misal `komikindo.js` dan `index.json`) ke folder Android:
   `app/src/main/assets/extensions/`
2. Aplikasi dapat membaca `index.json` lokal secara offline.

### 3. Cara Meng-eksekusi di Android (Integrasi QuickJS)

Aplikasi **Lembar** menggunakan `QuickJs` dari CashApp. Karena JS Engine tidak punya fungsi `fetch` bawaan untuk mengambil HTML internet, ekstensi ini dirancang agar **otomatis mendeteksi `NetworkBridge`** dari Android!

Anda harus menambahkan *bridge* jaringan pada `QuickJSEngine.kt` di aplikasi **Lembar** dengan kode Kotlin berikut:

```kotlin
// Tambahkan Interface ini di QuickJSEngine.kt
interface NetworkBridge {
    fun get(url: String): String
}

// Saat inisialisasi QuickJS (di fungsi init()), inject jembatan jaringannya:
fun init() {
    if (quickJs == null) {
        quickJs = QuickJs.create()
        // Hubungkan HttpClient Android ke JavaScript
        quickJs?.set("NetworkBridge", NetworkBridge::class.java, object : NetworkBridge {
            override fun get(url: String): String {
                // Memanggil HttpClient Kotlin yang sudah ada di com.lembar.app.network
                return com.lembar.app.network.HttpClient.get(url)
            }
        })
    }
}
```

### 4. Contoh Memanggil Fungsi Ekstensi dari Kotlin

Setelah `NetworkBridge` di-set, Android tinggal mengeksekusi script `.js` dan memanggil fungsinya. Karena fungsi ekstensi menggunakan `async`, kita bisa menggunakan trik Promise resolver atau langsung `JSON.stringify` di JS.

**Contoh pengambilan data populer dari Kotlin:**
```kotlin
// 1. Baca kode dari internal storage (lewat ExtensionManager.kt)
val jsCode = extensionManager.getExtensionCode("komikindo.js")
quickJs.evaluate(jsCode)

// 2. Karena JS-nya Async, jalankan fungsi via evaluate dan tunggu string JSON-nya
val jsonResult = quickJs.evaluate("""
    // Karena evaluate QuickJS synchronous, eksekusi async butuh wrapper
    var result = null;
    LembarExt_komikindo.source.getPopular(1).then(res => {
        result = JSON.stringify(res);
    }).catch(err => {
        result = JSON.stringify({ error: err.message });
    });
    // Jika QuickJS tidak auto-resolve, Anda butuh implementasi Promise Bridge
    // atau gunakan script sinkron (blocking) sederhana.
    result;
""")

println("Hasil Populer: ${jsonResult}")
```



---

## 🤝 Kontribusi

1. Fork repositori ini.
2. Buat ekstensi baru dengan `npm run new`.
3. Pastikan semua tes lolos dengan `npm test`.
4. Buat pull request dengan deskripsi sumber yang ditambahkan.
