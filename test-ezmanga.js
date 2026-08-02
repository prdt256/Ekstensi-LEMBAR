const { source } = await import('./src/sources/ezmanga/index.js');
console.log(await source.getPopular(1));
