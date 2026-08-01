/**
 * @file new-extension.js
 * @description Generator ekstensi baru dari template.
 *
 * Penggunaan:
 *   node scripts/new-extension.js <source-id> "<Nama Sumber>" <https://base-url.com>
 *
 * Contoh:
 *   node scripts/new-extension.js komiku "Komiku.id" https://komiku.id
 */

import { readFile, mkdir, writeFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const [, , sourceId, sourceName, baseUrl] = process.argv;

if (!sourceId || !sourceName || !baseUrl) {
  console.error('Penggunaan: node scripts/new-extension.js <source-id> "<Nama Sumber>" <https://base-url.com>');
  console.error('Contoh:    node scripts/new-extension.js komiku "Komiku.id" https://komiku.id');
  process.exit(1);
}

const targetDir = path.join(ROOT, 'src', 'sources', sourceId);

if (existsSync(targetDir)) {
  console.error(`Error: Source "${sourceId}" sudah ada di src/sources/${sourceId}/`);
  process.exit(1);
}

async function main() {
  // Buat direktori
  await mkdir(targetDir, { recursive: true });

  // Buat manifest.json
  const manifest = {
    id: sourceId,
    name: sourceName,
    baseUrl: baseUrl,
    version: '1.0.0',
    lang: 'id',
    icon: `${baseUrl.replace(/\/$/, '')}/favicon.ico`,
    nsfw: false,
    active: true,
    description: `Ekstensi sumber komik untuk ${sourceName}.`,
  };
  await writeFile(
    path.join(targetDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  // Salin template dan ganti placeholder
  const templatePath = path.join(ROOT, 'src', 'templates', 'extension-template.js');
  let templateContent = await readFile(templatePath, 'utf-8');

  // Ganti placeholder dengan nilai nyata
  templateContent = templateContent
    .replace("id: '[GANTI_INI]',            // Contoh: \"komiku\", \"mangakatana\"", `id: '${sourceId}',`)
    .replace("name: '[GANTI_INI]',          // Contoh: \"Komiku.id\", \"MangaKatana\"", `name: '${sourceName}',`)
    .replace("baseUrl: '[GANTI_INI]',       // Contoh: \"https://komiku.id\"", `baseUrl: '${baseUrl}',`)
    .replace("icon: '[GANTI_INI]',          // Contoh: \"https://komiku.id/favicon.ico\"", `icon: '${baseUrl.replace(/\/$/, '')}/favicon.ico',`);

  await writeFile(path.join(targetDir, 'index.js'), templateContent, 'utf-8');

  console.log(`\n✔ Ekstensi baru berhasil dibuat: src/sources/${sourceId}/`);
  console.log(`  ├── manifest.json`);
  console.log(`  └── index.js\n`);
  console.log(`Langkah berikutnya:`);
  console.log(`  1. Buka src/sources/${sourceId}/index.js`);
  console.log(`  2. Implementasikan semua fungsi sesuai struktur situs ${sourceName}`);
  console.log(`  3. Uji dengan: node scripts/test-extension.js --source ${sourceId} --fn all\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
