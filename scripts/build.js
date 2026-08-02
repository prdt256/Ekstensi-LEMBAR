/**
 * @file build.js
 * @description Script build otomatis untuk Ekstensi-LEMBAR.
 *
 * Apa yang dilakukan script ini:
 *   1. Memindai semua ekstensi di `src/sources/` yang aktif (active: true di manifest.json).
 *   2. Mem-bundle setiap ekstensi beserta dependensinya menggunakan esbuild menjadi
 *      satu file JS mandiri (IIFE) di `dist/<source-id>.js`.
 *   3. Menghasilkan file `dist/index.json` berisi manifes repositori ekstensi.
 *
 * Penggunaan:
 *   node scripts/build.js
 *   node scripts/build.js --source <source-id>   (build satu ekstensi saja)
 *   node scripts/build.js --skip-index           (skip regenerasi index.json)
 */

import { build } from 'esbuild';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'sources');
const DIST_DIR = path.join(ROOT, 'dist');

// ============================================================================
// CLI ARG PARSING
// ============================================================================

const args = process.argv.slice(2);
const targetSource = args[args.indexOf('--source') + 1] || null;
const skipIndex = args.includes('--skip-index');

// ============================================================================
// UTILITIES
// ============================================================================

/** Warna terminal */
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(symbol, msg) { console.log(`${symbol} ${msg}`); }
function logOk(msg) { log(`${c.green}✔${c.reset}`, msg); }
function logErr(msg) { log(`${c.red}✖${c.reset}`, msg); }
function logInfo(msg) { log(`${c.cyan}ℹ${c.reset}`, msg); }
function logWarn(msg) { log(`${c.yellow}⚠${c.reset}`, msg); }

// ============================================================================
// CORE BUILD LOGIC
// ============================================================================

/**
 * Mendapatkan daftar semua source ID yang ada di src/sources/.
 * @returns {Promise<string[]>}
 */
async function getSourceIds() {
  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(e => e.name);
}

/**
 * Membaca dan mem-parse manifest.json sebuah ekstensi.
 * @param {string} sourceId
 * @returns {Promise<object|null>}
 */
async function readManifest(sourceId) {
  const manifestPath = path.join(SRC_DIR, sourceId, 'manifest.json');
  if (!existsSync(manifestPath)) {
    logWarn(`Tidak ada manifest.json untuk "${sourceId}", dilewati.`);
    return null;
  }
  const raw = await readFile(manifestPath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Mem-bundle satu ekstensi menggunakan esbuild.
 * @param {string} sourceId
 * @param {object} manifest
 * @returns {Promise<boolean>} true jika sukses
 */
async function buildExtension(sourceId, manifest) {
  const entryPoint = path.join(SRC_DIR, sourceId, 'index.js');
  const outfile = path.join(DIST_DIR, `${sourceId}.js`);

  if (!existsSync(entryPoint)) {
    logErr(`Tidak ada index.js untuk "${sourceId}".`);
    return false;
  }

  try {
    await build({
      entryPoints: [entryPoint],
      bundle: true,
      format: 'iife',
      globalName: `LembarExt_${sourceId.replace(/-/g, '_')}`,
      outfile,
      platform: 'browser',
      target: ['es2020'],
      minify: true,
      sourcemap: false,
      // Injeksi metadata ke dalam banner
      banner: {
        js: [
          `/* Lembar Extension | ID: ${manifest.id} | v${manifest.version} | ${manifest.lang} */`,
          `/* Built: ${new Date().toISOString()} */`,
        ].join('\n'),
      },
      // Eksternalkan node built-ins yang tidak tersedia di JS Runtime Android
      external: [],
    });
    logOk(`Bundle: ${c.bold}${sourceId}${c.reset} → ${c.dim}dist/${sourceId}.js${c.reset}`);
    return true;
  } catch (err) {
    logErr(`Gagal build "${sourceId}": ${err.message}`);
    return false;
  }
}

/**
 * Menghasilkan file dist/index.json berisi manifes semua ekstensi aktif.
 * @param {Array<object>} manifests - Array manifest yang berhasil di-build.
 * @param {string} [baseUrl=''] - Base URL distribusi (untuk bundle_url).
 */
async function generateIndex(manifests, baseUrl = '') {
  const index = {
    version: 1,
    generated_at: new Date().toISOString(),
    extensions: manifests.map(m => ({
      id: m.id,
      name: m.name,
      version: m.version,
      lang: m.lang,
      icon: m.icon,
      nsfw: m.nsfw,
      base_url: m.baseUrl || m.base_url || '',
      bundle_url: baseUrl ? `${baseUrl.replace(/\/$/, '')}/dist/${m.id}.js` : `dist/${m.id}.js`,
    })),
  };

  const indexPath = path.join(DIST_DIR, 'index.json');
  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  logOk(`Index: ${c.bold}dist/index.json${c.reset} (${manifests.length} ekstensi)`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`\n${c.bold}${c.cyan}=== Lembar Extension Builder ===${c.reset}\n`);

  // Pastikan dist/ ada
  await mkdir(DIST_DIR, { recursive: true });

  let sourceIds = await getSourceIds();

  // Filter jika --source diberikan
  if (targetSource) {
    if (!sourceIds.includes(targetSource)) {
      logErr(`Source "${targetSource}" tidak ditemukan di src/sources/.`);
      process.exit(1);
    }
    sourceIds = [targetSource];
    logInfo(`Mode single build: ${c.bold}${targetSource}${c.reset}`);
  } else {
    logInfo(`Ditemukan ${sourceIds.length} source: ${sourceIds.join(', ')}`);
  }

  console.log('');

  const successManifests = [];
  let failCount = 0;

  for (const sourceId of sourceIds) {
    const manifest = await readManifest(sourceId);
    if (!manifest) { failCount++; continue; }

    // Lewati ekstensi yang tidak aktif
    if (manifest.active === false) {
      logWarn(`Skip (inactive): ${sourceId}`);
      continue;
    }

    const ok = await buildExtension(sourceId, manifest);
    if (ok) {
      successManifests.push(manifest);
    } else {
      failCount++;
    }
  }

  // Generate index
  if (!skipIndex && successManifests.length > 0) {
    console.log('');
    const baseUrl = process.env.DIST_BASE_URL || 'https://raw.githubusercontent.com/prdt256/Ekstensi-LEMBAR/main';
    await generateIndex(successManifests, baseUrl);
  }

  // Summary
  console.log('');
  console.log(`${c.bold}Selesai.${c.reset} ${c.green}${successManifests.length} berhasil${c.reset}` +
    (failCount > 0 ? `, ${c.red}${failCount} gagal${c.reset}` : '') + '\n');

  if (failCount > 0) process.exit(1);
}

main().catch(err => {
  console.error(`\n${c.red}Build error fatal:${c.reset}`, err);
  process.exit(1);
});
