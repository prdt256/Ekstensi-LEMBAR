import { getText, buildQueryString } from '../../core/http.js';
import { parseHtml, getImageSrc, cleanText, extractHref, parseRelativeDate, parseGenres } from '../../core/parser.js';

const metadata = {
  id: 'komikindo',
  name: 'KomikIndo',
  baseUrl: 'https://komikindo.ch',
  version: '1.0.0',
  lang: 'id',
  icon: 'https://komikindo.ch/favicon.ico',
  nsfw: false,
};

function buildUrl(path) {
  return `${metadata.baseUrl}/${path.replace(/^\//, '')}`;
}

async function getPopular(page = 1) {
  const url = buildUrl(`/?page=${page}`);
  const html = await getText(url);
  const $ = parseHtml(html);

  const manga = [];
  $('.animepost').each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a');
    
    // Some titles might have "Komik " prefix, we can optionally strip it but it's fine for now
    let title = element.find('h4').text().trim() || element.find('.tt h4').text().trim() || linkEl.attr('title');
    if (title.startsWith('Komik ')) {
      title = title.substring(6).trim();
    }

    manga.push({
      id: extractHref(linkEl, metadata.baseUrl),
      title: title,
      coverUrl: getImageSrc(element.find('img')),
      status: element.find('.status').text().trim().toLowerCase() || 'unknown',
    });
  });

  const hasNextPage = $('.pagination .next').length > 0;
  return { manga, hasNextPage };
}

async function getLatest(page = 1) {
  const url = buildUrl(`/komik-terbaru/page/${page}/`);
  const html = await getText(url);
  const $ = parseHtml(html);

  const manga = [];
  $('.animepost').each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a');
    
    let title = element.find('h4').text().trim() || element.find('.tt h4').text().trim() || linkEl.attr('title');
    if (title.startsWith('Komik ')) {
      title = title.substring(6).trim();
    }

    manga.push({
      id: extractHref(linkEl, metadata.baseUrl),
      title: title,
      coverUrl: getImageSrc(element.find('img')),
      status: 'unknown',
    });
  });

  const hasNextPage = $('.pagination .next').length > 0 || $('.hpage a.r').length > 0;
  return { manga, hasNextPage };
}

async function search(query, page = 1, filters = {}) {
  const url = buildUrl(`/page/${page}/?s=${encodeURIComponent(query)}`);
  const html = await getText(url);
  const $ = parseHtml(html);

  const manga = [];
  $('.animepost').each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a');
    
    let title = element.find('h4').text().trim() || element.find('.tt h4').text().trim() || linkEl.attr('title');
    if (title.startsWith('Komik ')) {
      title = title.substring(6).trim();
    }

    manga.push({
      id: extractHref(linkEl, metadata.baseUrl),
      title: title,
      coverUrl: getImageSrc(element.find('img')),
      status: 'unknown',
    });
  });

  const hasNextPage = $('.pagination .next').length > 0;
  return { manga, hasNextPage };
}

async function getDetail(mangaId) {
  const url = buildUrl(mangaId);
  const html = await getText(url);
  const $ = parseHtml(html);

  let title = cleanText($('.komik_info-content-body h1').first()) || cleanText($('h1.entry-title').first());
  if (title.startsWith('Komik ')) {
    title = title.substring(6).trim();
  }
  
  const coverUrl = getImageSrc($('.komik_info-content-thumbnail img').first()) || getImageSrc($('.thumb img').first());
  
  let description = cleanText($('.komik_info-description .entry-content').first()) || cleanText($('.entry-content').first());
  if (description.startsWith('Sinopsis Manga')) {
    description = description.replace(/^Sinopsis\s*Manga\s*/i, '').trim();
  }

  let statusText = '';
  let authors = [];
  let artists = [];
  
  $('.komik_info-content-meta span').each((_, el) => {
    const text = cleanText($(el));
    if (text.includes('Status:')) statusText = text.replace('Status:', '').trim().toLowerCase();
    if (text.includes('Pengarang:')) authors = text.replace('Pengarang:', '').split(',').map(a => a.trim());
    if (text.includes('Ilustrator:')) artists = text.replace('Ilustrator:', '').split(',').map(a => a.trim());
  });

  const statusMap = {
    'ongoing': 'ongoing', 'berjalan': 'ongoing',
    'completed': 'completed', 'tamat': 'completed',
    'hiatus': 'hiatus',
  };
  const status = statusMap[statusText] || 'unknown';

  const genres = parseGenres(
    $('.genre-info a').map((_, el) => $(el).text()).get()
  );

  const chapters = [];
  $('#chapter_list li').each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a');
    const dateText = element.find('.dt').text().trim();

    chapters.push({
      id: extractHref(linkEl, metadata.baseUrl),
      name: cleanText(element.find('.lchx').first()) || cleanText(linkEl),
      uploadedAt: parseRelativeDate(dateText).toISOString(),
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
    artists,
    chapters,
  };
}

async function getPageList(chapterId) {
  const url = buildUrl(chapterId);
  const html = await getText(url);
  const $ = parseHtml(html);

  const pages = [];
  $('#chimg-auh img').each((_, el) => {
    const src = getImageSrc($(el));
    if (src && src.startsWith('http')) pages.push(src);
  });

  return pages;
}

export const source = {
  metadata,
  getPopular,
  getLatest,
  search,
  getDetail,
  getPageList,
};
