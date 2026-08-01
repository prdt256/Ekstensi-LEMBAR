/**
 * @file parser.js
 * @description Helper untuk parsing HTML menggunakan Cheerio.
 *
 * Di lingkungan Node.js (lokal/build), menggunakan paket `cheerio`.
 * Di lingkungan Android JS Runtime, aplikasi Lembar akan menyediakan
 * bridge DOMParser atau serialisasi HTML yang setara.
 */

import { load } from 'cheerio';

// ============================================================================
// PARSER FACTORY
// ============================================================================

/**
 * Mem-parse string HTML dan mengembalikan konteks Cheerio ($).
 * Gunakan `$` layaknya jQuery untuk memanipulasi DOM secara statis.
 *
 * @param {string} html - String HTML yang akan di-parse.
 * @returns {import('cheerio').CheerioAPI} Instance Cheerio yang siap digunakan.
 *
 * @example
 * const $ = parseHtml('<h1 class="title">Judul Komik</h1>');
 * const title = $('h1.title').text().trim(); // => "Judul Komik"
 */
export function parseHtml(html) {
  return load(html, { decodeEntities: true });
}

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

/**
 * Mengambil nilai atribut `src` atau `data-src` dari sebuah elemen gambar.
 * Berguna untuk menangani lazy-loaded images.
 *
 * @param {import('cheerio').Cheerio} el - Elemen Cheerio.
 * @returns {string} URL gambar.
 *
 * @example
 * const imgSrc = getImageSrc($('img.cover'));
 */
export function getImageSrc(el) {
  return el.attr('data-src') || el.attr('data-lazy-src') || el.attr('data-original') || el.attr('src') || '';
}

/**
 * Membersihkan dan memformat teks dari sebuah elemen.
 * Menghapus whitespace berlebih dan karakter tak terlihat.
 *
 * @param {import('cheerio').Cheerio} el - Elemen Cheerio.
 * @returns {string} Teks bersih.
 */
export function cleanText(el) {
  return el.text().replace(/\s+/g, ' ').trim();
}

/**
 * Mengambil URL dari atribut href sebuah elemen anchor dan mengubahnya
 * menjadi path relatif atau ID yang dapat digunakan sebagai key.
 *
 * @param {import('cheerio').Cheerio} el - Elemen Cheerio (biasanya `<a>`).
 * @param {string} baseUrl - Base URL untuk dijadikan relatif.
 * @returns {string} Path relatif atau href asli jika tidak bisa direlativkan.
 *
 * @example
 * // href = "https://komiku.id/manga/one-piece/"
 * // baseUrl = "https://komiku.id"
 * // => "/manga/one-piece/"
 */
export function extractHref(el, baseUrl = '') {
  const href = el.attr('href') || '';
  if (!href) return '';
  try {
    const url = new URL(href, baseUrl);
    // Kembalikan pathname + search sebagai ID
    return url.pathname + url.search;
  } catch {
    return href;
  }
}

/**
 * Mem-parse teks tanggal yang tidak terformat (misal: "3 hari lalu", "2 jam lalu")
 * ke sebuah Date object perkiraan.
 *
 * @param {string} text - Teks tanggal relatif.
 * @returns {Date} Objek Date perkiraan.
 */
export function parseRelativeDate(text) {
  const now = new Date();
  const lower = text.toLowerCase().trim();

  const patterns = [
    { regex: /(\d+)\s*(detik|second)/i, unit: 'seconds' },
    { regex: /(\d+)\s*(menit|minute|min)/i, unit: 'minutes' },
    { regex: /(\d+)\s*(jam|hour)/i, unit: 'hours' },
    { regex: /(\d+)\s*(hari|day)/i, unit: 'days' },
    { regex: /(\d+)\s*(minggu|week)/i, unit: 'weeks' },
    { regex: /(\d+)\s*(bulan|month)/i, unit: 'months' },
    { regex: /(\d+)\s*(tahun|year)/i, unit: 'years' },
  ];

  for (const { regex, unit } of patterns) {
    const match = lower.match(regex);
    if (match) {
      const value = parseInt(match[1], 10);
      const date = new Date(now);
      switch (unit) {
        case 'seconds': date.setSeconds(date.getSeconds() - value); break;
        case 'minutes': date.setMinutes(date.getMinutes() - value); break;
        case 'hours':   date.setHours(date.getHours() - value); break;
        case 'days':    date.setDate(date.getDate() - value); break;
        case 'weeks':   date.setDate(date.getDate() - value * 7); break;
        case 'months':  date.setMonth(date.getMonth() - value); break;
        case 'years':   date.setFullYear(date.getFullYear() - value); break;
      }
      return date;
    }
  }

  // Coba parse sebagai tanggal langsung
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? now : parsed;
}

/**
 * Mengekstrak semua URL gambar dari string HTML (berguna untuk halaman baca chapter).
 *
 * @param {string} html - String HTML yang mengandung tag `<img>`.
 * @returns {string[]} Array URL gambar.
 */
export function extractImageUrls(html) {
  const $ = parseHtml(html);
  const urls = [];
  $('img').each((_, el) => {
    const src = getImageSrc($(el));
    if (src && src.startsWith('http')) {
      urls.push(src);
    }
  });
  return urls;
}

/**
 * Mem-parse string genre yang dipisahkan oleh koma atau karakter lain
 * menjadi array genre yang bersih.
 *
 * @param {string|string[]} input - String atau array genre.
 * @param {string} [separator=','] - Pemisah jika input berupa string.
 * @returns {string[]} Array genre yang sudah dibersihkan.
 */
export function parseGenres(input, separator = ',') {
  if (Array.isArray(input)) {
    return input.map(g => g.trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input.split(separator).map(g => g.trim()).filter(Boolean);
  }
  return [];
}
