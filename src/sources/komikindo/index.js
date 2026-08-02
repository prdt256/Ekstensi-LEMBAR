import { getText, buildQueryString } from '../../core/http.js';
import { parseHtml, getImageSrc, cleanText, extractHref, parseRelativeDate, parseGenres } from '../../core/parser.js';

const metadata = {
  id: 'komikindo',
  name: 'KomikIndo',
  baseUrl: 'https://komikindo.ch',
  version: '1.0.4',
  lang: 'id',
  icon: 'https://komikindo.ch/wp-content/uploads/2020/12/fav.png',
  nsfw: false,
};

function buildUrl(path) {
  return `${metadata.baseUrl}/${path.replace(/^\//, '')}`;
}

function parseMangaElements($) {
  const manga = [];
  const selectors = ['.animepost', '.list-update_item', '.bsx', '.film-list .animepost', '.sorlist .item'];
  
  const elements = $(selectors.join(', '));

  elements.each((_, el) => {
    const element = $(el);
    const linkEl = element.find('a').first();
    if (!linkEl.length) return;
    
    let title = element.find('h4').text().trim() || 
                element.find('.tt h4').text().trim() || 
                element.find('.title').text().trim() ||
                linkEl.attr('title') || '';

    if (!title) return;
    if (title.startsWith('Komik ')) {
      title = title.substring(6).trim();
    }

    let coverEl = element.find('img[itemprop="image"]');
    if (!coverEl.length) coverEl = element.find('.limit img');
    if (!coverEl.length) coverEl = element.find('img');
    const coverUrl = getImageSrc(coverEl.first());
    
    const id = extractHref(linkEl, metadata.baseUrl);

    let statusText = element.find('.status').text().trim().toLowerCase();
    if (!statusText) {
      statusText = element.find('.status-skroep').text().trim().toLowerCase();
    }
    
    const statusMap = {
      'ongoing': 'ongoing', 'berjalan': 'ongoing',
      'completed': 'completed', 'tamat': 'completed',
      'hiatus': 'hiatus',
    };
    const status = statusMap[statusText] || 'unknown';

    if (id && !manga.some(m => m.id === id)) {
      manga.push({
        id,
        title,
        coverUrl,
        latestChapter: element.find('.chapter, .epxs').text().trim(),
        status,
      });
    }
  });

  return manga;
}

async function getPopular(page = 1) {
  try {
    const promises = [];
    const limit = 3;
    const startPage = (page - 1) * limit + 1;
    
    for (let i = startPage; i < startPage + limit; i++) {
      const url = i === 1 
        ? buildUrl('/komik/')
        : buildUrl(`/komik/page/${i}/`);
      promises.push(getText(url).catch(() => null));
    }
    
    const htmls = await Promise.all(promises);
    let allManga = [];
    let hasNextPage = false;
    
    for (const html of htmls) {
      if (!html) continue;
      const $ = parseHtml(html);
      allManga = allManga.concat(parseMangaElements($));
      if ($('.pagination .next').length > 0 || $('.hpage a.r').length > 0) {
        hasNextPage = true;
      }
    }
    
    // Hilangkan duplikat jika ada
    allManga = allManga.filter((m, index, self) => 
      index === self.findIndex((t) => t.id === m.id)
    );

    return { manga: allManga, hasNextPage };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getLatest(page = 1) {
  try {
    const promises = [];
    const limit = 3;
    const startPage = (page - 1) * limit + 1;
    
    for (let i = startPage; i < startPage + limit; i++) {
      const url = i === 1 
        ? buildUrl('/komik-terbaru/')
        : buildUrl(`/komik-terbaru/page/${i}/`);
      promises.push(getText(url).catch(() => null));
    }
    
    const htmls = await Promise.all(promises);
    let allManga = [];
    let hasNextPage = false;
    
    for (const html of htmls) {
      if (!html) continue;
      const $ = parseHtml(html);
      allManga = allManga.concat(parseMangaElements($));
      if ($('.pagination .next').length > 0 || $('.hpage a.r').length > 0) {
        hasNextPage = true;
      }
    }
    
    allManga = allManga.filter((m, index, self) => 
      index === self.findIndex((t) => t.id === m.id)
    );

    return { manga: allManga, hasNextPage };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function search(query, page = 1) {
  try {
    const promises = [];
    const limit = 3;
    const startPage = (page - 1) * limit + 1;
    
    for (let i = startPage; i < startPage + limit; i++) {
      const url = i === 1 
        ? buildUrl(`/komik/?s=${encodeURIComponent(query)}`)
        : buildUrl(`/komik/page/${i}/?s=${encodeURIComponent(query)}`);
      promises.push(getText(url).catch(() => null));
    }
    
    const htmls = await Promise.all(promises);
    let allManga = [];
    let hasNextPage = false;
    
    for (const html of htmls) {
      if (!html) continue;
      const $ = parseHtml(html);
      allManga = allManga.concat(parseMangaElements($));
      if ($('.pagination .next').length > 0 || $('.hpage a.r').length > 0) {
        hasNextPage = true;
      }
    }
    
    allManga = allManga.filter((m, index, self) => 
      index === self.findIndex((t) => t.id === m.id)
    );

    return { manga: allManga, hasNextPage };
  } catch (err) {
    return { manga: [], hasNextPage: false };
  }
}

async function getDetail(mangaId) {
  const url = buildUrl(mangaId);
  const html = await getText(url);
  const $ = parseHtml(html);

  let title = cleanText($('.komik_info-content-body h1').first()) || cleanText($('h1.entry-title').first());
  if (title.startsWith('Komik ')) {
    title = title.substring(6).trim();
  }
  
  // Ambil semua potensi gambar
  let coverUrl = '';
  $('.komik_info-content-thumbnail img, .thumb img').each((_, el) => {
    if (coverUrl) return; // sudah ketemu
    const src = getImageSrc($(el));
    if (src && !src.toLowerCase().includes('logo') && !src.toLowerCase().includes('icon')) {
      coverUrl = src;
    }
  });
  
  let description = cleanText($('.komik_info-description .entry-content').first()) || cleanText($('.entry-content').first());
  if (description.startsWith('Sinopsis Manga')) {
    description = description.replace(/^Sinopsis\s*Manga\s*/i, '').trim();
  }

  let statusText = '';
  let authors = [];
  
  const info = {};
  
  // Ambil judul alternatif jika ada
  const altTitle = cleanText($('.komik_info-content-native').first());
  if (altTitle && altTitle.toLowerCase() !== 'n/a') {
    info['Judul Alternatif'] = altTitle;
  }

  $('.komik_info-content-meta span, .infox .spe span').each((_, el) => {
    const text = cleanText($(el));
    // Deteksi "Pengarang: Oda" atau "Pengarang : Oda" dll
    const lowerText = text.toLowerCase();
    if (lowerText.includes('pengarang') || lowerText.includes('author')) {
      const match = text.match(/(?:Pengarang|Authors?)\s*:\s*(.+)/i);
      if (match && match[1]) {
        authors = match[1].split(',').map(a => a.trim());
      }
    }
    
    if (text.includes(':')) {
      const parts = text.split(':');
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      
      if (key && value && value.toLowerCase() !== 'n/a' && value !== '-' && value !== '?') {
        if (key.toLowerCase() === 'status') statusText = value.toLowerCase();
        info[key] = value;
      }
    }
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
  
  // Cari di tempat umum
  const chapterElements = $('#chapter_list li, .eps_lst li, .clist li, .chapter-list li, #chapterlist li');
  
  if (chapterElements.length > 0) {
    chapterElements.each((_, el) => {
      const element = $(el);
      const linkEl = element.find('a').first();
      if (!linkEl.length) return;
      const dateText = element.find('.dt, .chapterdate, .chapter-date').text().trim();
  
      chapters.push({
        id: extractHref(linkEl, metadata.baseUrl),
        name: cleanText(element.find('.lchx').first()) || cleanText(linkEl),
        uploadedAt: dateText ? parseRelativeDate(dateText).toISOString() : '',
      });
    });
  } else {
    // Sapu jagat: ambil semua link yang url-nya mengandung kata 'chapter'
    $('a').each((_, el) => {
      const linkEl = $(el);
      const href = linkEl.attr('href') || '';
      if (href.includes('/chapter-') || href.includes('/ch-')) {
        const titleText = cleanText(linkEl);
        if (titleText.toLowerCase().includes('chapter') || titleText.toLowerCase().includes('ch.')) {
          chapters.push({
            id: extractHref(linkEl, metadata.baseUrl),
            name: titleText,
            uploadedAt: '',
          });
        }
      }
    });
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
}

async function getPageList(chapterId) {
  const url = buildUrl(chapterId);
  const html = await getText(url);
  const $ = parseHtml(html);

  const pages = [];
  $('#chimg-auh img, #readerarea img').each((_, el) => {
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
