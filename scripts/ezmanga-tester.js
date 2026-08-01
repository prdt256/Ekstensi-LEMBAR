import { load } from 'cheerio';
import { readFileSync } from 'fs';
const html = readFileSync('/home/prdt/.gemini/antigravity-ide/brain/99b12aa0-30bf-4488-9fdd-e1c13492c529/scratch/ezmanga_home.html', 'utf8');
const $ = load(html);
$('a[href*="/series/"]').slice(0, 5).each((i, el) => {
  const p = $(el).parent();
  console.log(`Parent Class: ${p.attr('class')}, HTML: ${p.html().substring(0, 100).replace(/\n/g, '')}`);
});
