import { load } from 'cheerio';
import fetch from 'node-fetch';
async function test() {
  const html = await (await fetch('https://komikindo.ch/')).text();
  const $ = load(html);
  $('.animepost').slice(0,2).each((i, el) => {
    const title = $(el).find('h4').text().trim() || $(el).find('.tt h4').text().trim() || $(el).find('a').attr('title');
    const href = $(el).find('a').attr('href');
    const img = $(el).find('img').attr('src');
    const status = $(el).find('.status').text().trim();
    console.log({title, href, img, status});
  });
}
test();
