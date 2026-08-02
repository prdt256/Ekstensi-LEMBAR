import { source } from './src/sources/komikindo/index.js';
async function testPage2() {
  const result = await source.getPopular(2);
  console.log('Manga count:', result.manga.length);
  console.log('Has next page:', result.hasNextPage);
}
testPage2();
