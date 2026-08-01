import { load } from 'cheerio';
import { readFileSync } from 'fs';
const html = readFileSync('/home/prdt/.gemini/antigravity-ide/brain/99b12aa0-30bf-4488-9fdd-e1c13492c529/scratch/ezmanga_detail.html', 'utf8');
const $ = load(html);
console.log("Title:", $('h1').text().trim() || $('h2').text().trim());
console.log("Desc:", $('.summary, .description, p').text().substring(0, 100));
console.log("Img:", $('img').first().attr('src'));
$('a[href*="/chapter/"]').slice(0, 5).each((i, el) => {
  console.log(`Chapter Link: ${$(el).attr('href')} Title: ${$(el).text().trim()}`);
});
