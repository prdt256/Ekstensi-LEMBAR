import { load } from 'cheerio';
import { readFileSync } from 'fs';
const html = readFileSync('/home/prdt/.gemini/antigravity-ide/brain/99b12aa0-30bf-4488-9fdd-e1c13492c529/scratch/komikindo_detail.html', 'utf8');
const $ = load(html);
console.log("Title:", $('.komik_info-content-body h1').text().trim() || $('h1.entry-title').text().trim());
console.log("Desc:", $('.desc').text().trim().substring(0, 100));
console.log("Img:", $('.komik_info-content-thumbnail img').attr('src') || $('.thumb img').attr('src'));
let status = '';
$('.komik_info-content-meta span').each((i, el) => {
  if ($(el).text().includes('Status:')) status = $(el).text().replace('Status:', '').trim();
});
console.log("Status:", status);
const chapters = [];
$('#chapter_list li').slice(0,3).each((i, el) => {
  chapters.push({
    href: $(el).find('a').attr('href'),
    title: $(el).find('.lchx').text().trim() || $(el).find('a').text().trim(),
    date: $(el).find('.dt').text().trim()
  });
});
console.log("Chapters:", chapters);
