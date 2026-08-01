import { load } from 'cheerio';
import { readFileSync } from 'fs';

function analyze(file, label) {
  console.log(`\n=== ${label} ===`);
  const html = readFileSync(file, 'utf8');
  const $ = load(html);
  
  // Try to find common manga list containers
  console.log("Title: ", $('title').text());
  
  const popularClasses = ['popular', 'trending', 'hot', 'listupd'];
  console.log("Looking for lists...");
  
  // Komikindo specific: they usually use .animepost for items, or .listupd
  const listupd = $('.listupd').first();
  if (listupd.length) {
    console.log("Found .listupd");
    const items = listupd.find('.animepost, .bs');
    console.log(`Found ${items.length} items in .listupd`);
    if (items.length) {
      const first = items.first();
      console.log("First item class:", first.attr('class'));
      console.log("First item HTML:", first.html().substring(0, 200).replace(/\n/g, ''));
    }
  } else {
    // EZManga might use .page-item-detail, .item, .manga-item
    const items = $('.page-item-detail, .item-summary, .manga-item');
    console.log(`Found ${items.length} items with generic manga classes`);
    if (items.length) {
      const first = items.first();
      console.log("First item HTML:", first.html().substring(0, 200).replace(/\n/g, ''));
    } else {
       console.log("Trying to find any a tag with img inside");
       const aWithImg = $('a:has(img)').slice(0, 3);
       aWithImg.each((i, el) => {
          console.log(`Link ${i}: ${$(el).attr('href')} -> Img: ${$(el).find('img').attr('src')} or ${$(el).find('img').attr('data-src')}`);
       });
    }
  }
}

analyze('/home/prdt/.gemini/antigravity-ide/brain/99b12aa0-30bf-4488-9fdd-e1c13492c529/scratch/komikindo_home.html', 'Komikindo');
analyze('/home/prdt/.gemini/antigravity-ide/brain/99b12aa0-30bf-4488-9fdd-e1c13492c529/scratch/ezmanga_home.html', 'EZManga');
