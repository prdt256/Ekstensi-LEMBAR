import { source } from './src/sources/ezmanga/index.js';

async function test() {
  try {
    const list = await source.getLatest(1);
    console.log("Latest:", JSON.stringify(list, null, 2));
    if (list.length > 0) {
      const first = list[0];
      const detail = await source.getDetail(first.id);
      console.log("Detail:", JSON.stringify(detail, null, 2));
      const firstChapter = detail.chapters[0];
      console.log("First chapter ID:", firstChapter.id);
      const pages = await source.getPageList(firstChapter.id);
      console.log("Pages:", pages);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

test();
