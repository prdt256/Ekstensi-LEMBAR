import { getText, getJson, buildQueryString } from '../../core/http.js';
import { parseHtml, getImageSrc, cleanText } from '../../core/parser.js';

const metadata = {
  id: 'ezmanga',
  name: 'EZManga',
  baseUrl: 'https://ezmanga.org',
  version: '1.0.3',
  lang: 'en',
  icon: 'https://ezmanga.org/favicon.ico',
  nsfw: false,
};

const API_BASE = 'https://vapi.ezmanga.org/api/v1';

function formatMangaItem(item) {
  return {
    id: `/series/${item.slug}`,
    title: item.title,
    coverUrl: item.cover || metadata.icon,
    status: item.status ? item.status.toLowerCase() : 'unknown',
  };
}

async function getPopular(page = 1) {
  if (page > 1) return { manga: [], hasNextPage: false };
  try {
    const data = await getJson(`${API_BASE}/home`);
    const manga = [];
    const collections = ['pinned', 'editorsPick', 'popular', 'newSeries'];
    const addedIds = new Set();

    if (data) {
      collections.forEach(key => {
        if (data[key]) {
          data[key].forEach(item => {
            const series = item.series || item;
            const formatted = formatMangaItem(series);
            if (!addedIds.has(formatted.id)) {
              manga.push(formatted);
              addedIds.add(formatted.id);
            }
          });
        }
      });
    }
    return { manga, hasNextPage: false };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getLatest(page = 1) {
  try {
    const data = await getJson(`${API_BASE}/home/latest?page=${page}&perPage=20`);
    const manga = [];
    if (data && data.data) {
      data.data.forEach(item => {
        manga.push(formatMangaItem(item));
      });
    }
    return { manga, hasNextPage: data.next !== null && data.next !== undefined };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function search(query, page = 1, filters = {}) {
  try {
    const url = `${metadata.baseUrl}/search?q=${encodeURIComponent(query)}`;
    const html = await getText(url);
    const $ = parseHtml(html);
    const manga = [];
    $('a.card, a[href*="/series/"]').each((_, el) => {
      const element = $(el);
      const title = element.attr('aria-label') || element.find('h3, .title').text().trim();
      const href = element.attr('href') || '';
      const img = getImageSrc(element.find('img.cover-img, img[src*="upload"]'));
      if (title && href && !href.includes('chapter') && !manga.some(m => m.id === href)) {
        manga.push({
          id: href.startsWith('http') ? new URL(href).pathname : href,
          title,
          coverUrl: img || metadata.icon,
          status: 'unknown',
        });
      }
    });
    return { manga, hasNextPage: false };
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

    if (chapters.length === 0) {
      chapters.push({ id: mangaId + '/dummy', name: 'Tidak ada chapter' });
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
    };
  } catch (err) {
    return {
      id: mangaId,
      title: 'Gagal memuat API',
      coverUrl: metadata.icon,
      description: 'Detail gagal: ' + err.message,
      status: 'unknown',
      genres: [],
      authors: [],
      chapters: [{ id: mangaId + '/error', name: 'Gagal memuat chapter' }],
    };
  }
}

async function getPageList(chapterId) {
  try {
    if (chapterId.endsWith('/error') || chapterId.endsWith('/dummy')) {
      return [metadata.icon];
    }
    
    const url = `${API_BASE}${chapterId}`;
    const data = await getJson(url);

    const pages = [];
    if (data && data.images) {
      data.images.forEach(img => {
        if (img && img.url) pages.push(img.url);
      });
    }

    if (pages.length === 0) {
      return [metadata.icon];
    }
    return pages;
  } catch (err) {
    return [metadata.icon];
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
