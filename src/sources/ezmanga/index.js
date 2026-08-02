import { getText, buildQueryString } from '../../core/http.js';
import { parseHtml, getImageSrc, cleanText, extractHref, parseRelativeDate, parseGenres } from '../../core/parser.js';

const metadata = {
  id: 'ezmanga',
  name: 'EZManga',
  baseUrl: 'https://ezmanga.org',
  version: '1.0.1',
  lang: 'en',
  icon: 'https://ezmanga.org/favicon.ico',
  nsfw: false,
};

function buildUrl(path) {
  return `${metadata.baseUrl}/${path.replace(/^\//, '')}`;
}

/**
 * EZManga menggunakan WordPress theme Madara.
 * Selector kunci Madara:
 *  - Cover: .post-title, h1
 *  - Chapter list: li.wp-manga-chapter a
 *  - Halaman baca: .reading-content img, .page-break img
 *  - Info: .post-content_item .summary-content
 *  - Genre: .genres-content a
 *  - Status: .post-content_item:contains("Status") .summary-content
 */

function parseMangaCards($) {
  const manga = [];

  // Madara card selectors: .page-item-detail, .manga, .bsx, animepost fallback
  const selectors = [
    '.page-item-detail',
    '.manga__item',
    '.c-tabs-item__content',
    '.post-title a',
    'a[href*="/manga/"]'
  ];

  // Coba selector card terlebih dahulu
  let cardElements = $();
  for (const sel of ['.page-item-detail', '.manga__item', '.c-tabs-item__content']) {
    const found = $(sel);
    if (found.length > 0) {
      cardElements = found;
      break;
    }
  }

  if (cardElements.length > 0) {
    cardElements.each((_, el) => {
      const element = $(el);
      const linkEl = element.find('.post-title a, h3 a, h5 a, a[href*="/manga/"]').first();
      if (!linkEl.length) return;

      const title = linkEl.text().trim();
      const href = linkEl.attr('href') || '';
      const img = getImageSrc(element.find('img').first());

      if (title && href && !manga.some(m => m.title === title)) {
        manga.push({
          id: href.startsWith('http') ? new URL(href).pathname : href,
          title,
          coverUrl: img || '',
          status: 'unknown',
        });
      }
    });
  } else {
    // Fallback: cari semua link manga
    $('a[href*="/manga/"]').each((_, el) => {
      const element = $(el);
      const href = element.attr('href') || '';
      const title = element.attr('title') || element.text().trim();
      const img = getImageSrc(element.find('img')) || getImageSrc(element.parent().find('img'));

      if (title && href && title.length > 2 && !manga.some(m => m.id === href)) {
        manga.push({
          id: href.startsWith('http') ? new URL(href).pathname : href,
          title,
          coverUrl: img || '',
          status: 'unknown',
        });
      }
    });
  }

  return manga;
}

async function getPopular(page = 1) {
  const url = page === 1
    ? buildUrl('/manga/?m_orderby=views')
    : buildUrl(`/manga/page/${page}/?m_orderby=views`);

  try {
    const html = await getText(url);
    const $ = parseHtml(html);
    const manga = parseMangaCards($);
    const hasNextPage = $('.wp-pagenavi .nextpostslink, .nav-previous a, a.next').length > 0;
    return { manga, hasNextPage };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getLatest(page = 1) {
  const url = page === 1
    ? buildUrl('/manga/?m_orderby=latest')
    : buildUrl(`/manga/page/${page}/?m_orderby=latest`);

  try {
    const html = await getText(url);
    const $ = parseHtml(html);
    const manga = parseMangaCards($);
    const hasNextPage = $('.wp-pagenavi .nextpostslink, .nav-previous a, a.next').length > 0;
    return { manga, hasNextPage };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function search(query, page = 1, filters = {}) {
  const url = page === 1
    ? buildUrl(`/?s=${encodeURIComponent(query)}&post_type=wp-manga`)
    : buildUrl(`/page/${page}/?s=${encodeURIComponent(query)}&post_type=wp-manga`);

  try {
    const html = await getText(url);
    const $ = parseHtml(html);
    const manga = parseMangaCards($);
    const hasNextPage = $('.wp-pagenavi .nextpostslink, .nav-previous a, a.next').length > 0;
    return { manga, hasNextPage };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getDetail(mangaId) {
  const url = buildUrl(mangaId);
  try {
    const html = await getText(url);
    const $ = parseHtml(html);

    // Madara: judul ada di .post-title h1 atau h1
    const title = cleanText($('.post-title h1').first())
      || cleanText($('.post-title').first())
      || cleanText($('h1').first());

    // Cover
    const coverUrl = getImageSrc($('.summary_image img').first())
      || getImageSrc($('.tab-summary img').first())
      || getImageSrc($('img').first())
      || '';

    // Deskripsi
    const description = cleanText($('.summary__content, .description-summary .summary__content, .manga-excerpt').first())
      || cleanText($('.entry-content').first())
      || '';

    // Metadata
    let status = 'unknown';
    let authors = [];
    let genres = [];

    $('.post-content_item').each((_, el) => {
      const label = cleanText($(el).find('.summary-heading').first()).toLowerCase();
      const value = cleanText($(el).find('.summary-content').first());

      if (label.includes('status')) status = value.toLowerCase();
      if (label.includes('author') || label.includes('artist')) {
        authors = value.split(',').map(a => a.trim()).filter(Boolean);
      }
    });

    genres = parseGenres(
      $('.genres-content a, .tags-content a').map((_, el) => $(el).text()).get()
    );

    // Chapters — Madara standar: li.wp-manga-chapter
    const chapters = [];
    $('li.wp-manga-chapter, .listing-chapters_wrap li').each((_, el) => {
      const element = $(el);
      const linkEl = element.find('a').first();
      if (!linkEl.length) return;

      const dateText = element.find('.chapter-release-date, .release-date, i').text().trim();
      chapters.push({
        id: (linkEl.attr('href') || '').startsWith('http')
          ? new URL(linkEl.attr('href')).pathname
          : (linkEl.attr('href') || ''),
        name: cleanText(linkEl),
        uploadedAt: dateText ? parseRelativeDate(dateText).toISOString() : '',
      });
    });

    return {
      id: mangaId,
      title: title || 'Unknown Title',
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
    // Madara chapter reader: .reading-content img, .page-break img
    $('.reading-content img, .page-break img, #readerarea img').each((_, el) => {
      const src = getImageSrc($(el));
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
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
