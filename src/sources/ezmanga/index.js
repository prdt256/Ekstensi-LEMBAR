import { getText, buildQueryString, postJson } from '../../core/http.js';
import { parseHtml, getImageSrc, cleanText, extractHref, parseRelativeDate, parseGenres } from '../../core/parser.js';

const metadata = {
  id: 'ezmanga',
  name: 'EZManga',
  baseUrl: 'https://ezmanga.org',
  version: '1.0.2',
  lang: 'en',
  icon: 'https://ezmanga.org/favicon.ico',
  nsfw: false,
};

function buildUrl(path) {
  return `${metadata.baseUrl}/${path.replace(/^\//, '')}`;
}

function parseMangaCards($) {
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
        coverUrl: img || '',
        status: 'unknown',
      });
    }
  });

  return manga;
}

async function getPopular(page = 1) {
  // Angular SSR bypass: just load the homepage where popular/latest are injected
  const url = buildUrl('/');
  try {
    const html = await getText(url);
    const $ = parseHtml(html);
    const manga = parseMangaCards($);
    return { manga, hasNextPage: false }; // Homepage just returns top list
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getLatest(page = 1) {
  const url = buildUrl('/browse');
  try {
    const html = await getText(url);
    const $ = parseHtml(html);
    let manga = parseMangaCards($);
    if (manga.length === 0) {
       // fallback to home
       const homeHtml = await getText(buildUrl('/'));
       manga = parseMangaCards(parseHtml(homeHtml));
    }
    return { manga, hasNextPage: false };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function search(query, page = 1, filters = {}) {
  // SSR for search might not work, so we fallback to browse or home if empty
  const url = buildUrl(`/search?q=${encodeURIComponent(query)}`);
  try {
    const html = await getText(url);
    const $ = parseHtml(html);
    const manga = parseMangaCards($);
    return { manga, hasNextPage: false };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getDetail(mangaId) {
  const url = buildUrl(mangaId);
  try {
    const html = await getText(url);
    const $ = parseHtml(html);

    const title = $('h1').text().trim() || 'Unknown Title';
    const coverUrl = getImageSrc($('img.cover-img, img[src*="upload"]').first()) || '';
    const description = cleanText($('.description').first()) || '';
    
    const status = 'unknown';
    const genres = [];
    const authors = [];
    
    $('a[href*="/genre/"]').each((_, el) => {
        genres.push($(el).text().trim());
    });

    const chapters = [];
    $('a[href*="chapter"]').each((_, el) => {
      const element = $(el);
      const href = element.attr('href') || '';
      const name = cleanText(element);
      if (href && name) {
        chapters.push({
          id: href.startsWith('http') ? new URL(href).pathname : href,
          name: name,
        });
      }
    });

    const uniqueChapters = Array.from(new Map(chapters.map(item => [item.id, item])).values());

    return {
      id: mangaId,
      title,
      coverUrl,
      description,
      status,
      genres,
      authors,
      chapters: uniqueChapters,
    };
  } catch (err) {
    return {
      id: mangaId,
      title: 'Gagal memuat (kemungkinan Cloudflare Block)',
      coverUrl: '',
      description: 'Detail gagal: ' + err.message,
      status: 'unknown',
      genres: [],
      authors: [],
      chapters: [],
    };
  }
}

async function getPageList(chapterId) {
  const url = buildUrl(chapterId);
  try {
    const html = await getText(url);
    const $ = parseHtml(html);

    const pages = [];
    $('img.r-page-img, img[src*="upload"]').each((_, el) => {
      const src = getImageSrc($(el));
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && src.includes('upload')) {
        pages.push(src.trim());
      }
    });
    
    return pages;
  } catch (err) {
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
