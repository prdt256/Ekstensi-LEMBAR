import { getText, buildQueryString } from '../../core/http.js';
import { parseHtml, getImageSrc, cleanText, extractHref, parseRelativeDate, parseGenres } from '../../core/parser.js';

const metadata = {
  id: 'ezmanga',
  name: 'EZManga',
  baseUrl: 'https://ezmanga.org',
  version: '1.0.0',
  lang: 'en',
  icon: 'https://ezmanga.org/favicon.ico',
  nsfw: false,
};

function buildUrl(path) {
  return `${metadata.baseUrl}/${path.replace(/^\//, '')}`;
}

async function getPopular(page = 1) {
  // EZManga uses an Angular SSR or similar structure. 
  // We'll use a best-effort selector based on home page analysis.
  const url = buildUrl(`/?page=${page}`);
  const html = await getText(url);
  const $ = parseHtml(html);

  const manga = [];
  $('a[href*="/series/"]').each((_, el) => {
    const element = $(el);
    const title = element.attr('aria-label') || element.attr('title') || cleanText(element);
    const href = element.attr('href');
    
    // Attempt to find image inside the link or parent
    const img = getImageSrc(element.find('img')) || getImageSrc(element.parent().find('img'));

    // Avoid duplicates
    if (title && href && !manga.some(m => m.id === href)) {
      manga.push({
        id: href.startsWith('http') ? new URL(href).pathname : href,
        title: title,
        coverUrl: img || 'https://via.placeholder.com/150',
        status: 'unknown',
      });
    }
  });

  return { manga, hasNextPage: false };
}

async function getLatest(page = 1) {
  return getPopular(page); // Fallback for EZManga
}

async function search(query, page = 1, filters = {}) {
  const url = buildUrl(`/search?q=${encodeURIComponent(query)}&page=${page}`);
  try {
    const html = await getText(url);
    const $ = parseHtml(html);

    const manga = [];
    $('a[href*="/series/"]').each((_, el) => {
      const element = $(el);
      const title = element.attr('aria-label') || element.attr('title') || cleanText(element);
      const href = element.attr('href');
      const img = getImageSrc(element.find('img'));

      if (title && href && !manga.some(m => m.id === href)) {
        manga.push({
          id: href.startsWith('http') ? new URL(href).pathname : href,
          title: title,
          coverUrl: img || 'https://via.placeholder.com/150',
          status: 'unknown',
        });
      }
    });

    return { manga, hasNextPage: false };
  } catch (err) {
    // Cloudflare blocks or no search page
    return { manga: [], hasNextPage: false };
  }
}

async function getDetail(mangaId) {
  const url = buildUrl(mangaId);
  try {
    const html = await getText(url);
    const $ = parseHtml(html);

    // Standard generic selectors
    const title = cleanText($('h1')) || cleanText($('h2'));
    const description = cleanText($('.summary, .description, p').first());
    const coverUrl = getImageSrc($('img').first()) || 'https://via.placeholder.com/150';
    
    const chapters = [];
    $('a[href*="/chapter/"]').each((_, el) => {
      const element = $(el);
      chapters.push({
        id: element.attr('href').startsWith('http') ? new URL(element.attr('href')).pathname : element.attr('href'),
        name: cleanText(element),
        uploadedAt: new Date().toISOString(),
      });
    });

    return {
      id: mangaId,
      title: title || 'Unknown Title',
      coverUrl,
      description,
      status: 'unknown',
      chapters,
    };
  } catch (err) {
    return {
      id: mangaId,
      title: 'Failed to load (Cloudflare Block)',
      coverUrl: 'https://via.placeholder.com/150',
      description: 'Detail failed: ' + err.message,
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
    $('img').each((_, el) => {
      const src = getImageSrc($(el));
      // Ignore tiny icons or logos
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
        pages.push(src);
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
