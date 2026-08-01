/**
 * @file extension-template.js
 * @description Template dasar untuk membuat ekstensi sumber komik baru di Lembar.
 *
 * === CARA MENGGUNAKAN TEMPLATE INI ===
 * 1. Salin file ini ke `src/sources/<source-id>/index.js`
 * 2. Ganti semua nilai placeholder yang ditandai dengan [GANTI_INI]
 * 3. Implementasikan seluruh fungsi sesuai situs target
 * 4. Uji ekstensi dengan: node scripts/test-extension.js --source <source-id> --fn getPopular
 *
 * Referensi kontrak data: src/core/contract.js
 */

import { getText } from '../../core/http.js';
import { parseHtml, getImageSrc, cleanText, extractHref, parseRelativeDate, parseGenres } from '../../core/parser.js';

// ============================================================================
// METADATA
// ============================================================================

/**
 * Metadata identitas ekstensi ini.
 * @type {import('../../core/contract.js').ExtensionMetadata}
 */
const metadata = {
  id: '[GANTI_INI]',            // Contoh: "komiku", "mangakatana"
  name: '[GANTI_INI]',          // Contoh: "Komiku.id", "MangaKatana"
  baseUrl: '[GANTI_INI]',       // Contoh: "https://komiku.id"
  version: '1.0.0',
  lang: 'id',                   // Kode bahasa: "id" untuk Indonesia, "en" untuk Inggris
  icon: '[GANTI_INI]',          // Contoh: "https://komiku.id/favicon.ico"
  nsfw: false,                  // Ubah ke true jika situs mengandung konten dewasa
};

// ============================================================================
// HELPER INTERNAL
// ============================================================================

/**
 * Membangun URL lengkap dari path relatif.
 * @param {string} path
 * @returns {string}
 */
function buildUrl(path) {
  return `${metadata.baseUrl}/${path.replace(/^\//, '')}`;
}

// ============================================================================
// FUNGSI UTAMA (WAJIB DIIMPLEMENTASIKAN)
// ============================================================================

/**
 * Mengambil daftar komik populer/trending.
 *
 * @param {number} page - Nomor halaman (dimulai dari 1).
 * @returns {Promise<import('../../core/contract.js').MangaList>}
 */
async function getPopular(page = 1) {
  // TODO: Ganti URL di bawah sesuai halaman populer situs target
  const url = buildUrl(`/popular?page=${page}`);
  const html = await getText(url);
  const $ = parseHtml(html);

  const manga = [];

  // TODO: Ganti selector CSS di bawah sesuai struktur HTML situs target
  $('.manga-list-item').each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a.manga-title');

    manga.push({
      id: extractHref(linkEl, metadata.baseUrl),
      title: cleanText(linkEl),
      coverUrl: getImageSrc(element.find('img')),
      status: element.find('.status').text().trim().toLowerCase() || 'unknown',
    });
  });

  // TODO: Sesuaikan selector tombol "halaman berikutnya"
  const hasNextPage = $('.pagination .next').length > 0;

  return { manga, hasNextPage };
}

/**
 * Mengambil daftar komik dengan update terbaru.
 *
 * @param {number} page - Nomor halaman (dimulai dari 1).
 * @returns {Promise<import('../../core/contract.js').MangaList>}
 */
async function getLatest(page = 1) {
  // TODO: Ganti URL di bawah sesuai halaman "terbaru" situs target
  const url = buildUrl(`/latest?page=${page}`);
  const html = await getText(url);
  const $ = parseHtml(html);

  const manga = [];

  // TODO: Sesuaikan selector
  $('.latest-manga-item').each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a.title');

    manga.push({
      id: extractHref(linkEl, metadata.baseUrl),
      title: cleanText(linkEl),
      coverUrl: getImageSrc(element.find('img')),
      status: 'unknown',
    });
  });

  const hasNextPage = $('.pagination .next').length > 0;

  return { manga, hasNextPage };
}

/**
 * Mencari komik berdasarkan kata kunci.
 *
 * @param {string} query - Kata kunci pencarian.
 * @param {number} page - Nomor halaman.
 * @param {Record<string, string>} [filters={}] - Filter opsional.
 * @returns {Promise<import('../../core/contract.js').MangaList>}
 */
async function search(query, page = 1, filters = {}) {
  // TODO: Sesuaikan URL dan parameter query string situs target
  const url = buildUrl(`/search?q=${encodeURIComponent(query)}&page=${page}`);
  const html = await getText(url);
  const $ = parseHtml(html);

  const manga = [];

  // TODO: Sesuaikan selector
  $('.search-result-item').each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a.title');

    manga.push({
      id: extractHref(linkEl, metadata.baseUrl),
      title: cleanText(linkEl),
      coverUrl: getImageSrc(element.find('img')),
      status: 'unknown',
    });
  });

  const hasNextPage = $('.pagination .next').length > 0;

  return { manga, hasNextPage };
}

/**
 * Mengambil detail lengkap sebuah komik beserta daftar chapter-nya.
 *
 * @param {string} mangaId - ID komik (biasanya path URL, misal: "/manga/one-piece/").
 * @returns {Promise<import('../../core/contract.js').MangaDetail>}
 */
async function getDetail(mangaId) {
  const url = buildUrl(mangaId);
  const html = await getText(url);
  const $ = parseHtml(html);

  // TODO: Sesuaikan selector di bawah dengan struktur halaman detail situs
  const title = cleanText($('h1.manga-title'));
  const coverUrl = getImageSrc($('img.cover'));
  const description = cleanText($('.synopsis'));
  const statusText = cleanText($('.status-value')).toLowerCase();

  const statusMap = {
    'ongoing': 'ongoing', 'berlangsung': 'ongoing', 'berjalan': 'ongoing',
    'completed': 'completed', 'selesai': 'completed', 'tamat': 'completed',
    'hiatus': 'hiatus',
  };
  const status = statusMap[statusText] || 'unknown';

  const genres = parseGenres(
    $('.genres a').map((_, el) => $(el).text()).get()
  );
  const authors = cleanText($('.author-value')).split(',').map(a => a.trim()).filter(Boolean);

  const chapters = [];
  // TODO: Sesuaikan selector daftar chapter
  $('.chapter-list li').each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a');
    const dateText = element.find('.chapter-date').text().trim();

    chapters.push({
      id: extractHref(linkEl, metadata.baseUrl),
      name: cleanText(linkEl),
      uploadedAt: parseRelativeDate(dateText).toISOString(),
      scanlator: element.find('.scanlator').text().trim() || undefined,
    });
  });

  return {
    id: mangaId,
    title,
    coverUrl,
    description,
    status,
    genres,
    authors,
    chapters, // Diasumsikan sudah diurutkan terbaru dahulu
  };
}

/**
 * Mengambil daftar URL gambar halaman untuk sebuah chapter.
 *
 * @param {string} chapterId - ID chapter (biasanya path URL).
 * @returns {Promise<string[]>} Array URL gambar halaman.
 */
async function getPageList(chapterId) {
  const url = buildUrl(chapterId);
  const html = await getText(url);
  const $ = parseHtml(html);

  const pages = [];

  // TODO: Sesuaikan selector — cari semua tag <img> di area baca chapter
  // Beberapa situs menyimpan URL dalam JSON di dalam tag <script>, sesuaikan jika perlu.
  $('.reader-area img').each((_, el) => {
    const src = getImageSrc($(el));
    if (src) pages.push(src);
  });

  return pages;
}

// ============================================================================
// FUNGSI OPSIONAL
// ============================================================================

/**
 * Mengembalikan daftar filter yang tersedia untuk pencarian.
 * Hapus fungsi ini jika situs tidak mendukung filter.
 *
 * @returns {import('../../core/contract.js').Filter[]}
 */
function getFilterList() {
  return [
    // Contoh filter genre:
    // {
    //   id: 'genre',
    //   label: 'Genre',
    //   type: 'multiselect',
    //   options: [
    //     { value: 'action', label: 'Action' },
    //     { value: 'romance', label: 'Romance' },
    //   ],
    // },
  ];
}

// ============================================================================
// EXPORT
// ============================================================================

/**
 * Objek `source` adalah ekspor utama yang dibaca oleh Lembar.
 * Pastikan nama properti TIDAK diubah.
 */
export const source = {
  metadata,
  getPopular,
  getLatest,
  search,
  getDetail,
  getPageList,
  getFilterList,
};
