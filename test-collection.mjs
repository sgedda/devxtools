import { getCollection } from 'astro:content';

const articles = await getCollection('articles');
console.log('Articles:', articles.length);
articles.forEach(a => console.log('  -', a.id));
