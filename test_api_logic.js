const mangaId = '/series/taming-the-demon-king';
const slug = mangaId.split('/').pop();
console.log("Detail API:", `https://vapi.ezmanga.org/api/v1/series/${slug}`);
console.log("Chapters API:", `https://vapi.ezmanga.org/api/v1/series/${slug}/chapters?page=1&perPage=100`);

const chapterId = `/series/${slug}/chapters/chapter-28`;
console.log("Page List API:", `https://vapi.ezmanga.org/api/v1${chapterId}`);
