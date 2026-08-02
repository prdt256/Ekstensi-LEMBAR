import { getText } from './src/core/http.js';
async function testLimit() {
  const promises = [];
  for (let i = 1; i <= 5; i++) {
    const url = `https://komikindo.ch/komik/page/${i}/`;
    promises.push(getText(url).catch(e => `Error: ${e.message}`));
  }
  const results = await Promise.all(promises);
  let success = 0;
  for (const r of results) {
    if (typeof r === 'string' && r.startsWith('Error')) {
      console.log(r);
    } else if (r) {
      success++;
    }
  }
  console.log(`Success: ${success}/5`);
}
testLimit();
