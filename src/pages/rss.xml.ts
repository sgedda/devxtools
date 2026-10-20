import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles');

  const items = articles.map(article => ({
    title: article.data.title,
    description: article.data.description,
    link: article.data.slug,
    pubDate: new Date(article.data.datePublished),
  }));

  return rss({
    title: 'DevXTools',
    description: "The developer's guide to API mocking, testing, and test data generation tools",
    site: context.site?.toString() || 'https://devxtools.dev',
    items,
    customData: '<language>en-us</language>',
  });
}
