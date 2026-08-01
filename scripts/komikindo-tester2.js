import { load } from 'cheerio';
import fetch from 'node-fetch';
async function test() {
  const html = await (await fetch('https://komikindo.ch/komik/tsuihou-sareta-tenshou-juu-kishi-ha-gemu-chishiki-de-musou-suru/')).text();
  const $ = load(html);
  console.log("Title:", $('h1.entry-title').text().trim() || $('h1').text().trim());
  console.log("Desc:", $('.entry-content.entry-content-single').text().trim().substring(0, 50));
  console.log("Img:", $('.thumb img').attr('src') || $('.infoanime .thumb img').attr('src'));
  
  const chapters = [];
  $('#chapter_list li').slice(0,2).each((i, el) => {
    chapters.push({
      href: $(el).find('a').attr('href'),
      title: $(el).find('.lchx').text().trim() || $(el).find('a').text().trim(),
      date: $(el).find('.dt').text().trim()
    });
  });
  console.log("Chapters:", chapters);
}
test();
