import { load } from 'cheerio';
import { readFileSync } from 'fs';
const html = readFileSync('/home/prdt/.gemini/antigravity-ide/brain/99b12aa0-30bf-4488-9fdd-e1c13492c529/scratch/ezmanga_home.html', 'utf8');
const $ = load(html);
$('a').each((i, el) => {
  const href = $(el).attr('href');
  if (href && href.includes('/series/')) {
     const title = $(el).attr('aria-label') || $(el).attr('title') || $(el).text().trim();
     console.log(`Href: ${href}, Title: ${title}`);
  }
});
