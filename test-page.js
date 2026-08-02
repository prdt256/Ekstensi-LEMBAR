const cheerio = require('cheerio');
const html = `<div class="pagination"><a class="next page-numbers" href="...">Berikutnya &raquo;</a></div>`;
const $ = cheerio.load(html);
console.log($('.pagination .next').length > 0);
