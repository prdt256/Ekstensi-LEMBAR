/**
 * @file contract.test.js
 * @description Unit test untuk core contract validators dan sample-source extension.
 */

import { validateExtension, validateMangaList, validateMangaDetail, validatePageList } from '../src/core/contract.js';

// ============================================================================
// TEST: validateExtension
// ============================================================================

describe('validateExtension()', () => {
  const validExt = {
    metadata: {
      id: 'test', name: 'Test', baseUrl: 'https://test.com',
      version: '1.0.0', lang: 'id', icon: 'https://test.com/icon.ico', nsfw: false,
    },
    getPopular: async () => {},
    getLatest: async () => {},
    search: async () => {},
    getDetail: async () => {},
    getPageList: async () => {},
  };

  test('ekstensi valid lolos validasi', () => {
    const result = validateExtension(validExt);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('gagal jika metadata tidak ada', () => {
    const { metadata, ...noMeta } = validExt;
    const result = validateExtension(noMeta);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('metadata'))).toBe(true);
  });

  test('gagal jika salah satu fungsi wajib tidak ada', () => {
    const { getPageList, ...noPageList } = validExt;
    const result = validateExtension(noPageList);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('getPageList'))).toBe(true);
  });

  test('gagal jika metadata.nsfw bukan boolean', () => {
    const badExt = { ...validExt, metadata: { ...validExt.metadata, nsfw: 'false' } };
    const result = validateExtension(badExt);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('nsfw'))).toBe(true);
  });

  test('gagal jika input bukan object', () => {
    const result = validateExtension(null);
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// TEST: validateMangaList
// ============================================================================

describe('validateMangaList()', () => {
  const validList = {
    manga: [
      { id: '/manga/test/', title: 'Test Manga', coverUrl: 'https://example.com/cover.jpg' },
    ],
    hasNextPage: false,
  };

  test('MangaList valid lolos', () => {
    expect(validateMangaList(validList).valid).toBe(true);
  });

  test('gagal jika manga bukan array', () => {
    const result = validateMangaList({ manga: null, hasNextPage: false });
    expect(result.valid).toBe(false);
  });

  test('gagal jika hasNextPage bukan boolean', () => {
    const result = validateMangaList({ manga: [], hasNextPage: 'false' });
    expect(result.valid).toBe(false);
  });

  test('gagal jika manga item tidak ada id', () => {
    const result = validateMangaList({
      manga: [{ title: 'No ID', coverUrl: 'https://x.com/img.jpg' }],
      hasNextPage: false,
    });
    expect(result.valid).toBe(false);
  });

  test('array manga boleh kosong dengan hasNextPage false', () => {
    expect(validateMangaList({ manga: [], hasNextPage: false }).valid).toBe(true);
  });
});

// ============================================================================
// TEST: validateMangaDetail
// ============================================================================

describe('validateMangaDetail()', () => {
  const validDetail = {
    id: '/manga/test/',
    title: 'Test Manga',
    coverUrl: 'https://example.com/cover.jpg',
    chapters: [{ id: '/chapter/test-ch-1/', name: 'Chapter 1' }],
  };

  test('MangaDetail valid lolos', () => {
    expect(validateMangaDetail(validDetail).valid).toBe(true);
  });

  test('gagal jika tidak ada chapters', () => {
    const { chapters, ...noChapters } = validDetail;
    const result = validateMangaDetail(noChapters);
    expect(result.valid).toBe(false);
  });

  test('gagal jika chapter item tidak ada name', () => {
    const result = validateMangaDetail({
      ...validDetail,
      chapters: [{ id: '/chapter/test/' }],
    });
    expect(result.valid).toBe(false);
  });

  test('chapters boleh array kosong', () => {
    expect(validateMangaDetail({ ...validDetail, chapters: [] }).valid).toBe(true);
  });
});

// ============================================================================
// TEST: validatePageList
// ============================================================================

describe('validatePageList()', () => {
  test('array URL valid lolos', () => {
    const result = validatePageList([
      'https://cdn.example.com/page-1.jpg',
      'https://cdn.example.com/page-2.jpg',
    ]);
    expect(result.valid).toBe(true);
  });

  test('gagal jika bukan array', () => {
    expect(validatePageList(null).valid).toBe(false);
    expect(validatePageList({}).valid).toBe(false);
  });

  test('gagal jika ada URL tidak valid', () => {
    const result = validatePageList(['https://ok.com/img.jpg', '/relative/path.jpg']);
    expect(result.valid).toBe(false);
  });

  test('gagal (dengan warning) jika array kosong', () => {
    const result = validatePageList([]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('kosong'))).toBe(true);
  });
});

// ============================================================================
// INTEGRATION TEST: sample-source extension
// ============================================================================

describe('sample-source integration test', () => {
  let ext;

  beforeAll(async () => {
    const mod = await import('../src/sources/sample-source/index.js');
    ext = mod.source;
  });

  test('kontrak ekstensi valid', () => {
    const result = validateExtension(ext);
    if (!result.valid) console.error('Contract errors:', result.errors);
    expect(result.valid).toBe(true);
  });

  test('getPopular() mengembalikan MangaList valid', async () => {
    const result = await ext.getPopular(1);
    const v = validateMangaList(result);
    if (!v.valid) console.error('MangaList errors:', v.errors);
    expect(v.valid).toBe(true);
    expect(result.manga.length).toBeGreaterThan(0);
  });

  test('getLatest() mengembalikan MangaList valid', async () => {
    const result = await ext.getLatest(1);
    expect(validateMangaList(result).valid).toBe(true);
  });

  test('search() mengembalikan MangaList valid', async () => {
    const result = await ext.search('naga');
    expect(validateMangaList(result).valid).toBe(true);
    expect(result.manga.length).toBeGreaterThan(0);
  });

  test('search() yang tidak ketemu mengembalikan array kosong', async () => {
    const result = await ext.search('xxxnotfoundxxx');
    expect(result.manga).toHaveLength(0);
    expect(result.hasNextPage).toBe(false);
  });

  test('getDetail() mengembalikan MangaDetail valid', async () => {
    const list = await ext.getPopular(1);
    const detail = await ext.getDetail(list.manga[0].id);
    const v = validateMangaDetail(detail);
    if (!v.valid) console.error('MangaDetail errors:', v.errors);
    expect(v.valid).toBe(true);
    expect(detail.chapters.length).toBeGreaterThan(0);
  });

  test('getPageList() mengembalikan array URL valid', async () => {
    const list = await ext.getPopular(1);
    const detail = await ext.getDetail(list.manga[0].id);
    const pages = await ext.getPageList(detail.chapters[0].id);
    const v = validatePageList(pages);
    if (!v.valid) console.error('PageList errors:', v.errors);
    expect(v.valid).toBe(true);
    expect(pages.length).toBeGreaterThan(0);
  });

  test('getFilterList() mengembalikan array', () => {
    const filters = ext.getFilterList();
    expect(Array.isArray(filters)).toBe(true);
    expect(filters.length).toBeGreaterThan(0);
  });
});
