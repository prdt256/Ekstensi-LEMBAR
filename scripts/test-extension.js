/**
 * @file test-extension.js
 * @description CLI tool untuk menguji ekstensi sumber komik secara langsung dari terminal.
 *
 * Penggunaan:
 *   node scripts/test-extension.js --source <source-id> --fn <function-name> [options]
 *
 * Contoh:
 *   node scripts/test-extension.js --source sample-source --fn getPopular
 *   node scripts/test-extension.js --source sample-source --fn getLatest --page 2
 *   node scripts/test-extension.js --source sample-source --fn search --query "one piece"
 *   node scripts/test-extension.js --source sample-source --fn getDetail --id "/manga/one-piece/"
 *   node scripts/test-extension.js --source sample-source --fn getPageList --id "/chapter/one-piece-ch-1/"
 *   node scripts/test-extension.js --source sample-source --fn getFilterList
 *   node scripts/test-extension.js --source sample-source --fn all   (uji semua fungsi dengan data mock)
 */

import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  validateExtension,
  validateMangaList,
  validateMangaDetail,
  validatePageList,
} from '../src/core/contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'sources');

// ============================================================================
// CLI ARG PARSING
// ============================================================================

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const sourceId = getArg('--source');
const fnName = getArg('--fn');
const page = parseInt(getArg('--page') || '1', 10);
const query = getArg('--query') || 'test';
const id = getArg('--id') || '';

// ============================================================================
// TERMINAL COLORS & FORMATTING
// ============================================================================

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', magenta: '\x1b[35m', blue: '\x1b[34m',
};

function header(title) {
  console.log(`\n${c.bold}${c.cyan}=== ${title} ===${c.reset}`);
}

function ok(label, detail = '') {
  console.log(`  ${c.green}✔${c.reset} ${c.bold}${label}${c.reset}${detail ? c.dim + ' — ' + detail + c.reset : ''}`);
}

function fail(label, detail = '') {
  console.log(`  ${c.red}✖${c.reset} ${c.bold}${label}${c.reset}${detail ? ' ' + c.red + detail + c.reset : ''}`);
}

function info(label, value) {
  const valStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  // Batasi panjang output
  const truncated = valStr.length > 500 ? valStr.substring(0, 500) + '\n  ... (truncated)' : valStr;
  console.log(`  ${c.blue}→${c.reset} ${c.bold}${label}:${c.reset}\n    ${truncated.replace(/\n/g, '\n    ')}`);
}

// ============================================================================
// TEST RUNNERS
// ============================================================================

async function testGetPopular(ext) {
  header(`getPopular(page=${page})`);
  try {
    const result = await ext.getPopular(page);
    const v = validateMangaList(result);
    if (v.valid) {
      ok('Schema valid');
      info('Manga count', result.manga.length);
      info('Has next page', result.hasNextPage);
      if (result.manga.length > 0) {
        info('First manga', result.manga[0]);
      }
    } else {
      fail('Schema tidak valid');
      v.errors.forEach(e => fail('  Error', e));
    }
    return v.valid;
  } catch (err) {
    fail('getPopular() melempar error', err.message);
    return false;
  }
}

async function testGetLatest(ext) {
  header(`getLatest(page=${page})`);
  try {
    const result = await ext.getLatest(page);
    const v = validateMangaList(result);
    if (v.valid) {
      ok('Schema valid');
      info('Manga count', result.manga.length);
      info('Has next page', result.hasNextPage);
    } else {
      fail('Schema tidak valid');
      v.errors.forEach(e => fail('  Error', e));
    }
    return v.valid;
  } catch (err) {
    fail('getLatest() melempar error', err.message);
    return false;
  }
}

async function testSearch(ext) {
  header(`search("${query}", page=${page})`);
  try {
    const result = await ext.search(query, page);
    const v = validateMangaList(result);
    if (v.valid) {
      ok('Schema valid');
      info('Hasil ditemukan', result.manga.length);
      if (result.manga.length > 0) {
        info('First result', result.manga[0]);
      }
    } else {
      fail('Schema tidak valid');
      v.errors.forEach(e => fail('  Error', e));
    }
    return v.valid;
  } catch (err) {
    fail('search() melempar error', err.message);
    return false;
  }
}

async function testGetDetail(ext, mangaId) {
  const targetId = mangaId || id;
  if (!targetId) {
    // Gunakan ID pertama dari getPopular sebagai fallback
    try {
      const list = await ext.getPopular(1);
      if (list.manga.length > 0) {
        return testGetDetail(ext, list.manga[0].id);
      }
    } catch { /* ignore */ }
    fail('getDetail() membutuhkan --id <manga-id>');
    return false;
  }
  header(`getDetail("${targetId}")`);
  try {
    const result = await ext.getDetail(targetId);
    const v = validateMangaDetail(result);
    if (v.valid) {
      ok('Schema valid');
      info('Title', result.title);
      info('Status', result.status);
      info('Genres', result.genres?.join(', ') || '-');
      info('Chapters count', result.chapters?.length || 0);
      if (result.chapters?.length > 0) {
        info('Latest chapter', result.chapters[0]);
      }
    } else {
      fail('Schema tidak valid');
      v.errors.forEach(e => fail('  Error', e));
    }
    return v.valid;
  } catch (err) {
    fail('getDetail() melempar error', err.message);
    return false;
  }
}

async function testGetPageList(ext, chapterId) {
  const targetId = chapterId || id;
  if (!targetId) {
    // Gunakan chapter pertama dari manga pertama sebagai fallback
    try {
      const list = await ext.getPopular(1);
      if (list.manga.length > 0) {
        const detail = await ext.getDetail(list.manga[0].id);
        if (detail.chapters.length > 0) {
          return testGetPageList(ext, detail.chapters[0].id);
        }
      }
    } catch { /* ignore */ }
    fail('getPageList() membutuhkan --id <chapter-id>');
    return false;
  }
  header(`getPageList("${targetId}")`);
  try {
    const result = await ext.getPageList(targetId);
    const v = validatePageList(result);
    if (v.valid) {
      ok('Schema valid');
      info('Jumlah halaman', result.length);
      info('Page 1 URL', result[0]);
    } else {
      fail('Schema tidak valid');
      v.errors.forEach(e => fail('  Error', e));
    }
    return v.valid;
  } catch (err) {
    fail('getPageList() melempar error', err.message);
    return false;
  }
}

function testGetFilterList(ext) {
  header('getFilterList()');
  if (typeof ext.getFilterList !== 'function') {
    console.log(`  ${c.dim}(getFilterList tidak diimplementasikan — opsional)${c.reset}`);
    return true;
  }
  try {
    const result = ext.getFilterList();
    ok('Mengembalikan array filter');
    info('Filter count', result.length);
    if (result.length > 0) {
      info('First filter', result[0]);
    }
    return true;
  } catch (err) {
    fail('getFilterList() melempar error', err.message);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Validasi input
  if (!sourceId) {
    console.error(`${c.red}Error: --source <source-id> wajib diisi.${c.reset}`);
    console.error(`\nContoh: node scripts/test-extension.js --source sample-source --fn getPopular\n`);
    process.exit(1);
  }
  if (!fnName) {
    console.error(`${c.red}Error: --fn <function-name> wajib diisi.${c.reset}`);
    console.error(`\nFungsi yang tersedia: getPopular, getLatest, search, getDetail, getPageList, getFilterList, all\n`);
    process.exit(1);
  }

  const extDir = path.join(SRC_DIR, sourceId);
  if (!existsSync(extDir)) {
    console.error(`${c.red}Error: Source "${sourceId}" tidak ditemukan di src/sources/.${c.reset}`);
    const available = await readdir(SRC_DIR, { withFileTypes: true });
    const dirs = available.filter(e => e.isDirectory()).map(e => e.name);
    console.error(`Source yang tersedia: ${dirs.join(', ') || '(tidak ada)'}\n`);
    process.exit(1);
  }

  // Load ekstensi
  const extPath = `file://${path.join(extDir, 'index.js')}`;
  let mod;
  try {
    mod = await import(extPath);
  } catch (err) {
    console.error(`${c.red}Gagal import ekstensi "${sourceId}":${c.reset}`, err.message);
    process.exit(1);
  }

  const ext = mod.source;
  if (!ext) {
    console.error(`${c.red}Ekstensi "${sourceId}" tidak mengekspor "source".${c.reset}`);
    process.exit(1);
  }

  // Validasi kontrak
  console.log(`\n${c.bold}${c.magenta}Ekstensi: ${ext.metadata?.name || sourceId} (${ext.metadata?.version || '?'})${c.reset}`);
  const contractCheck = validateExtension(ext);
  if (!contractCheck.valid) {
    console.log(`\n${c.red}${c.bold}Kontrak tidak valid:${c.reset}`);
    contractCheck.errors.forEach(e => console.log(`  ${c.red}✖${c.reset} ${e}`));
    process.exit(1);
  }
  console.log(`${c.dim}  Kontrak: OK | Lang: ${ext.metadata.lang} | NSFW: ${ext.metadata.nsfw}${c.reset}`);

  // Jalankan test
  const results = [];

  if (fnName === 'all') {
    results.push(await testGetPopular(ext));
    results.push(await testGetLatest(ext));
    results.push(await testSearch(ext));
    results.push(await testGetDetail(ext));
    results.push(await testGetPageList(ext));
    results.push(testGetFilterList(ext));
  } else {
    switch (fnName) {
      case 'getPopular':    results.push(await testGetPopular(ext)); break;
      case 'getLatest':     results.push(await testGetLatest(ext)); break;
      case 'search':        results.push(await testSearch(ext)); break;
      case 'getDetail':     results.push(await testGetDetail(ext)); break;
      case 'getPageList':   results.push(await testGetPageList(ext)); break;
      case 'getFilterList': results.push(testGetFilterList(ext)); break;
      default:
        console.error(`${c.red}Fungsi tidak dikenal: "${fnName}"${c.reset}`);
        console.error(`Pilihan: getPopular, getLatest, search, getDetail, getPageList, getFilterList, all`);
        process.exit(1);
    }
  }

  // Summary
  const allPassed = results.every(Boolean);
  const passCount = results.filter(Boolean).length;
  console.log(`\n${c.bold}${allPassed ? c.green : c.red}${passCount}/${results.length} test lolos.${c.reset}\n`);

  if (!allPassed) process.exit(1);
}

main().catch(err => {
  console.error(`\n${c.red}Fatal error:${c.reset}`, err);
  process.exit(1);
});
