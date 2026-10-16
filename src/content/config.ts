import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    canonical: z.string(),
    replaces: z.string().optional(),
    h1: z.string().optional(),
    primary_keyword: z.string().optional(),
    secondary_keywords: z.array(z.string()).optional(),
    breadcrumbs: z.array(z.object({
      name: z.string(),
      url: z.string(),
    })),
    schema: z.array(z.string()),
    itemList: z.array(z.string()).optional(),
    author: z.string(),
    byline: z.string().optional(),
    datePublished: z.string(),
    dateModified: z.string(),
    tested_with: z.string().optional(),
    tools: z.array(z.string()).optional(),
    affiliation: z.string().optional(),
    meta_description: z.string().optional(),
    written_by_creator: z.boolean().optional(),
  }),
});

export const collections = {
  articles,
};
