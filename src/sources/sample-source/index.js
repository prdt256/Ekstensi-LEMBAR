/**
 * @file index.js - Sample Source
 * @description Ekstensi contoh (mock/demo) untuk Lembar.
 *
 * Ekstensi ini TIDAK melakukan HTTP request nyata — seluruh datanya adalah
 * data dummy (mock) yang digunakan untuk:
 *   1. Membuktikan bahwa alur kerja bundling & testing berjalan dengan benar.
 *   2. Menjadi referensi nyata penggunaan core utilities (http, parser).
 *   3. Sandaran pengujian kontrak tanpa bergantung pada koneksi internet.
 *
 * Untuk melihat contoh ekstensi yang melakukan scraping sungguhan,
 * lihat template di: src/templates/extension-template.js
 */

// ============================================================================
// METADATA
// ============================================================================

const metadata = {
  id: 'sample-source',
  name: 'Sample Source',
  baseUrl: 'https://example-comic-site.com',
  version: '1.0.0',
  lang: 'id',
  icon: 'https://example-comic-site.com/favicon.ico',
  nsfw: false,
};

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_MANGA_LIST = [
  {
    id: '/manga/petualangan-naga-sakti/',
    title: 'Petualangan Naga Sakti',
    coverUrl: 'https://picsum.photos/seed/naga-sakti/300/400',
    status: 'ongoing',
  },
  {
    id: '/manga/sang-pemanah-bintang/',
    title: 'Sang Pemanah Bintang',
    coverUrl: 'https://picsum.photos/seed/pemanah/300/400',
    status: 'completed',
  },
  {
    id: '/manga/raja-kegelapan/',
    title: 'Raja Kegelapan',
    coverUrl: 'https://picsum.photos/seed/raja-gelap/300/400',
    status: 'ongoing',
  },
  {
    id: '/manga/dewi-pedang/',
    title: 'Dewi Pedang',
    coverUrl: 'https://picsum.photos/seed/dewi-pedang/300/400',
    status: 'hiatus',
  },
  {
    id: '/manga/legenda-laut-selatan/',
    title: 'Legenda Laut Selatan',
    coverUrl: 'https://picsum.photos/seed/laut-selatan/300/400',
    status: 'ongoing',
  },
];

const MOCK_CHAPTERS = [
  { id: '/chapter/petualangan-naga-sakti-ch-50/', name: 'Chapter 50', uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '/chapter/petualangan-naga-sakti-ch-49/', name: 'Chapter 49', uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '/chapter/petualangan-naga-sakti-ch-48/', name: 'Chapter 48', uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '/chapter/petualangan-naga-sakti-ch-1/', name: 'Chapter 1', uploadedAt: new Date('2023-01-01').toISOString() },
];

const MOCK_PAGES = Array.from({ length: 18 }, (_, i) =>
  `https://picsum.photos/seed/page-${i + 1}/800/1200`
);

// ============================================================================
// IMPLEMENTASI FUNGSI
// ============================================================================

/**
 * @param {number} page
 * @returns {Promise<import('../../core/contract.js').MangaList>}
 */
async function getPopular(page = 1) {
  // Simulasi pagination: halaman 1 ada data, halaman 2 kosong
  if (page > 1) {
    return { manga: [], hasNextPage: false };
  }
  return {
    manga: [...MOCK_MANGA_LIST],
    hasNextPage: false,
  };
}

/**
 * @param {number} page
 * @returns {Promise<import('../../core/contract.js').MangaList>}
 */
async function getLatest(page = 1) {
  if (page > 1) {
    return { manga: [], hasNextPage: false };
  }
  // Latest: kembalikan dalam urutan terbalik sebagai variasi
  return {
    manga: [...MOCK_MANGA_LIST].reverse(),
    hasNextPage: false,
  };
}

/**
 * @param {string} query
 * @param {number} page
 * @param {Record<string, string>} [filters={}]
 * @returns {Promise<import('../../core/contract.js').MangaList>}
 */
async function search(query, page = 1, filters = {}) {
  const lowerQuery = query.toLowerCase();
  const results = MOCK_MANGA_LIST.filter(m =>
    m.title.toLowerCase().includes(lowerQuery)
  );
  return {
    manga: results,
    hasNextPage: false,
  };
}

/**
 * @param {string} mangaId
 * @returns {Promise<import('../../core/contract.js').MangaDetail>}
 */
async function getDetail(mangaId) {
  const manga = MOCK_MANGA_LIST.find(m => m.id === mangaId) || MOCK_MANGA_LIST[0];
  return {
    id: manga.id,
    title: manga.title,
    coverUrl: manga.coverUrl,
    description:
      'Ini adalah deskripsi contoh dari komik yang luar biasa. Kisah seorang pahlawan yang berjuang melewati berbagai rintangan dan menghadapi musuh-musuh tangguh dalam perjalanan menuju takdirnya.',
    status: manga.status,
    genres: ['Action', 'Fantasy', 'Adventure'],
    authors: ['Penulis Contoh'],
    artists: ['Ilustrator Contoh'],
    chapters: MOCK_CHAPTERS,
  };
}

/**
 * @param {string} chapterId
 * @returns {Promise<string[]>}
 */
async function getPageList(chapterId) {
  // Mengembalikan 18 halaman gambar mock
  return [...MOCK_PAGES];
}

/**
 * @returns {import('../../core/contract.js').Filter[]}
 */
function getFilterList() {
  return [
    {
      id: 'genre',
      label: 'Genre',
      type: 'multiselect',
      options: [
        { value: 'action', label: 'Action' },
        { value: 'fantasy', label: 'Fantasy' },
        { value: 'romance', label: 'Romance' },
        { value: 'adventure', label: 'Adventure' },
        { value: 'comedy', label: 'Comedy' },
        { value: 'drama', label: 'Drama' },
        { value: 'horror', label: 'Horror' },
        { value: 'slice-of-life', label: 'Slice of Life' },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'Semua' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'completed', label: 'Completed' },
        { value: 'hiatus', label: 'Hiatus' },
      ],
    },
  ];
}

// ============================================================================
// EXPORT
// ============================================================================

export const source = {
  metadata,
  getPopular,
  getLatest,
  search,
  getDetail,
  getPageList,
  getFilterList,
};
