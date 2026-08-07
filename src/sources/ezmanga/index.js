import { getText, getJson, buildQueryString } from '../../core/http.js';
import { parseHtml, getImageSrc, cleanText } from '../../core/parser.js';

const metadata = {
  id: 'ezmanga',
  name: 'EZManga',
  baseUrl: 'https://ezmanga.org',
  version: '1.0.5',
  lang: 'en',
  icon: 'https://ezmanga.org/favicon.ico',
  nsfw: false,
};

const API_BASE = 'https://vapi.ezmanga.org/api/v1';

function parseMangaElements($) {
  const manga = [];
  $('a.card, a[href*="/series/"]').each((_, el) => {
    const element = $(el);
    const title = element.attr('aria-label') || element.find('h3, .title').text().trim();
    const href = element.attr('href') || '';
    const img = getImageSrc(element.find('img'));
    if (title && href && !href.includes('chapter') && !manga.some(m => m.id === href)) {
      manga.push({
        id: href.startsWith('http') ? new URL(href).pathname : href,
        title,
        coverUrl: img || metadata.icon,
        status: 'unknown',
      });
    }
  });
  return manga;
}

async function fetchBatch(buildPageUrl, page = 1) {
  const initialCount = 10;
  const fetchCount = page === 1 ? initialCount : 2;
  const startPage = page === 1 ? 1 : initialCount + (page - 2) * 2 + 1;
  
  let allManga = [];
  let hasNextPage = false;

  for (let i = startPage; i < startPage + fetchCount; i++) {
    const url = buildPageUrl(i);
    try {
      const html = await getText(url);
      if (html) {
        const $ = parseHtml(html);
        allManga = allManga.concat(parseMangaElements($));
        if (html.includes('aria-label="Next page"') || html.includes('aria-label="Next"')) {
          hasNextPage = true;
        } else if (allManga.length > 0) {
          hasNextPage = true; // Fallback
        }
      }
    } catch (e) {
      // Ignore single page error
    }
  }

  // Hilangkan duplikat jika ada
  allManga = allManga.filter((m, index, self) => 
    index === self.findIndex((t) => t.id === m.id)
  );

  return { manga: allManga, hasNextPage };
}

async function getPopular(page = 1) {
  try {
    return await fetchBatch((p) => `${metadata.baseUrl}/browse?page=${p}&sort=popular`, page);
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getLatest(page = 1) {
  try {
    return await fetchBatch((p) => `${metadata.baseUrl}/browse?page=${p}&sort=latest`, page);
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function search(query, page = 1, filters = {}) {
  try {
    return await fetchBatch((p) => `${metadata.baseUrl}/search?q=${encodeURIComponent(query)}&page=${p}`, page);
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getDetail(mangaId) {
  try {
    const slug = mangaId.split('/').filter(Boolean).pop();
    const detailApiUrl = `${API_BASE}/series/${slug}`;

    const detailData = await getJson(detailApiUrl);

    const title = detailData.title || 'Unknown Title';
    const coverUrl = detailData.cover || metadata.icon;
    let description = detailData.description || '';
    description = description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    const status = detailData.status ? detailData.status.toLowerCase() : 'unknown';
    const genres = (detailData.genres || []).map(g => g.name || g);
    const authors = detailData.author ? [detailData.author] : [];

    const chapters = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const chaptersApiUrl = `${API_BASE}/series/${slug}/chapters?page=${page}&perPage=100`;
      try {
        const chaptersData = await getJson(chaptersApiUrl);
        if (chaptersData && chaptersData.data) {
          chaptersData.data.forEach(ch => {
            chapters.push({
              id: `/series/${slug}/chapters/${ch.slug}`,
              name: ch.title ? `Chapter ${ch.number} - ${ch.title}` : `Chapter ${ch.number}`,
              uploadedAt: ch.createdAt || '',
            });
          });
          if (chaptersData.current >= chaptersData.totalPages || !chaptersData.next) {
            hasNext = false;
          } else {
            page++;
          }
        } else {
          hasNext = false;
        }
      } catch (err) {
        hasNext = false; // Stop fetching on error
      }
    }

    // Jika tidak ada chapter yang ditemukan, biarkan array kosong.
    // Android akan menampilkan pesan "Tidak ada chapter" lebih tepat.

    const info = {};
    if (detailData.alternative) info['Alternatif'] = detailData.alternative;
    if (detailData.type) info['Tipe'] = detailData.type;
    if (detailData.release) info['Rilis'] = detailData.release;
    if (detailData.serialization) info['Serialisasi'] = detailData.serialization;
    if (detailData.artist) info['Ilustrator'] = detailData.artist;
    if (detailData.updatedAt) {
      info['Diperbarui'] = new Date(detailData.updatedAt).toLocaleDateString('id-ID');
    }

    return {
      id: mangaId,
      title,
      coverUrl,
      description,
      status,
      genres,
      authors,
      chapters,
      info,
    };
  } catch (err) {
    // Lempar error agar Android dapat menampilkan pesan error yang tepat
    throw new Error('Gagal memuat detail: ' + err.message);
  }
}

async function getPageList(chapterId) {
  try {
    const url = `${API_BASE}${chapterId}`;
    const data = await getJson(url);

    const pages = [];
    if (data && data.images) {
      data.images.forEach(img => {
        if (img && img.url) pages.push(img.url);
      });
    }

    // Kembalikan array kosong jika tidak ada gambar agar Android tampilkan error
    return pages;
  } catch (err) {
    // Kembalikan array kosong — Android akan menampilkan pesan error
    return [];
  }
}

export const source = {
  metadata,
  getPopular,
  getLatest,
  search,
  getDetail,
  getPageList,
};
