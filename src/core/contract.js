/**
 * @file contract.js
 * @description Definisi kontrak (interface) standar yang WAJIB diimplementasikan
 *   oleh setiap ekstensi sumber komik di Lembar.
 *
 * Dokumen ini menjadi satu-satunya sumber kebenaran (source of truth) untuk
 * struktur data yang dikembalikan oleh setiap ekstensi.
 */

// ============================================================================
// DATA TYPES (JSDoc Typedef)
// ============================================================================

/**
 * @typedef {Object} MangaItem
 * @description Representasi ringkas sebuah komik dalam daftar (list view).
 *
 * @property {string} id          - ID unik komik dalam sumber ini (bisa berupa slug atau URL path).
 * @property {string} title       - Judul komik.
 * @property {string} coverUrl    - URL gambar sampul komik.
 * @property {string} [status]    - Status rilis: "ongoing" | "completed" | "hiatus" | "unknown".
 */

/**
 * @typedef {Object} MangaList
 * @description Hasil dari fungsi getPopular, getLatest, atau search.
 *
 * @property {MangaItem[]} manga  - Daftar komik pada halaman ini.
 * @property {boolean} hasNextPage - Apakah ada halaman berikutnya?
 */

/**
 * @typedef {Object} Chapter
 * @description Representasi sebuah chapter dalam detail komik.
 *
 * @property {string} id          - ID unik chapter (bisa berupa slug atau URL path).
 * @property {string} name        - Nama/nomor chapter (misal: "Chapter 1", "Vol.1 Ch.1").
 * @property {string} [uploadedAt] - Tanggal upload (format ISO 8601 direkomendasikan).
 * @property {string} [scanlator] - Nama group penerjemah/scanlator.
 */

/**
 * @typedef {Object} MangaDetail
 * @description Detail lengkap sebuah komik, dikembalikan oleh getDetail().
 *
 * @property {string} id              - ID unik komik.
 * @property {string} title           - Judul komik.
 * @property {string} coverUrl        - URL gambar sampul komik.
 * @property {string} [description]   - Sinopsis atau deskripsi komik.
 * @property {string} [status]        - Status rilis: "ongoing" | "completed" | "hiatus" | "unknown".
 * @property {string[]} [genres]      - Daftar genre (misal: ["Action", "Fantasy"]).
 * @property {string[]} [authors]     - Daftar nama pengarang.
 * @property {string[]} [artists]     - Daftar nama ilustrator/artist.
 * @property {Chapter[]} chapters     - Daftar chapter tersedia, diurutkan TERBARU dahulu.
 */

/**
 * @typedef {Object} Filter
 * @description Definisi satu buah opsi filter pencarian.
 *
 * @property {string} id          - ID unik filter (dipakai sebagai key saat search).
 * @property {string} label       - Label tampilan filter.
 * @property {'select'|'multiselect'|'checkbox'|'text'} type - Tipe input filter.
 * @property {Array<{value: string, label: string}>} [options] - Pilihan yang tersedia (untuk select/multiselect).
 */

/**
 * @typedef {Object} ExtensionMetadata
 * @description Metadata identitas ekstensi.
 *
 * @property {string} id          - ID unik ekstensi (lowercase, alphanumeric, dan dash).
 * @property {string} name        - Nama tampilan sumber komik.
 * @property {string} baseUrl     - URL dasar situs sumber.
 * @property {string} version     - Versi ekstensi (semver, misal: "1.0.0").
 * @property {string} lang        - Kode bahasa konten (ISO 639-1, misal: "id", "en").
 * @property {string} icon        - URL ikon/logo sumber.
 * @property {boolean} nsfw       - Apakah sumber mengandung konten dewasa?
 */

// ============================================================================
// EXTENSION CONTRACT INTERFACE (sebagai dokumentasi)
// ============================================================================

/**
 * @interface ExtensionContract
 * @description Interface wajib yang harus diimplementasikan oleh setiap ekstensi.
 *
 * Setiap ekstensi HARUS mengekspor objek bernama `source` dengan struktur berikut:
 *
 * ```js
 * export const source = {
 *   metadata: { ... },
 *   getPopular(page) { ... },
 *   getLatest(page) { ... },
 *   search(query, page, filters) { ... },
 *   getDetail(mangaId) { ... },
 *   getPageList(chapterId) { ... },
 *   getFilterList() { ... }, // opsional
 * };
 * ```
 */

/**
 * Fungsi validator: memastikan sebuah objek ekstensi mengimplementasikan
 * semua fungsi wajib dalam kontrak.
 *
 * @param {object} ext - Objek ekstensi yang akan divalidasi.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateExtension(ext) {
  const errors = [];
  const requiredFunctions = ['getPopular', 'getLatest', 'search', 'getDetail', 'getPageList'];
  const requiredMetadata = ['id', 'name', 'baseUrl', 'version', 'lang', 'icon', 'nsfw'];

  if (!ext || typeof ext !== 'object') {
    return { valid: false, errors: ['Ekstensi harus berupa objek.'] };
  }

  // Cek metadata
  if (!ext.metadata || typeof ext.metadata !== 'object') {
    errors.push('Property "metadata" tidak ada atau bukan object.');
  } else {
    for (const key of requiredMetadata) {
      if (ext.metadata[key] === undefined || ext.metadata[key] === null) {
        errors.push(`metadata.${key} tidak boleh kosong.`);
      }
    }
    if (typeof ext.metadata.nsfw !== 'boolean') {
      errors.push('metadata.nsfw harus bertipe boolean.');
    }
  }

  // Cek fungsi wajib
  for (const fn of requiredFunctions) {
    if (typeof ext[fn] !== 'function') {
      errors.push(`Fungsi "${fn}()" tidak diimplementasikan.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Fungsi helper: memvalidasi struktur MangaList yang dikembalikan oleh
 * getPopular, getLatest, atau search.
 *
 * @param {any} result - Hasil yang dikembalikan oleh fungsi list.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMangaList(result) {
  const errors = [];
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['Hasil harus berupa object MangaList.'] };
  }
  if (!Array.isArray(result.manga)) {
    errors.push('MangaList.manga harus berupa array.');
  } else {
    result.manga.forEach((item, i) => {
      if (!item.id) errors.push(`manga[${i}].id tidak boleh kosong.`);
      if (!item.title) errors.push(`manga[${i}].title tidak boleh kosong.`);
      if (!item.coverUrl) errors.push(`manga[${i}].coverUrl tidak boleh kosong.`);
    });
  }
  if (typeof result.hasNextPage !== 'boolean') {
    errors.push('MangaList.hasNextPage harus bertipe boolean.');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Fungsi helper: memvalidasi struktur MangaDetail.
 *
 * @param {any} result - Hasil yang dikembalikan oleh getDetail().
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMangaDetail(result) {
  const errors = [];
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['Hasil harus berupa object MangaDetail.'] };
  }
  if (!result.id) errors.push('MangaDetail.id tidak boleh kosong.');
  if (!result.title) errors.push('MangaDetail.title tidak boleh kosong.');
  if (!result.coverUrl) errors.push('MangaDetail.coverUrl tidak boleh kosong.');
  if (!Array.isArray(result.chapters)) {
    errors.push('MangaDetail.chapters harus berupa array.');
  } else {
    result.chapters.forEach((ch, i) => {
      if (!ch.id) errors.push(`chapters[${i}].id tidak boleh kosong.`);
      if (!ch.name) errors.push(`chapters[${i}].name tidak boleh kosong.`);
    });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Fungsi helper: memvalidasi hasil getPageList.
 *
 * @param {any} result - Hasil yang dikembalikan oleh getPageList().
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePageList(result) {
  const errors = [];
  if (!Array.isArray(result)) {
    return { valid: false, errors: ['getPageList harus mengembalikan array string URL.'] };
  }
  if (result.length === 0) {
    errors.push('getPageList mengembalikan array kosong (tidak ada gambar).');
  }
  result.forEach((url, i) => {
    if (typeof url !== 'string' || !url.startsWith('http')) {
      errors.push(`pageList[${i}] bukan URL yang valid: "${url}"`);
    }
  });
  return { valid: errors.length === 0, errors };
}
