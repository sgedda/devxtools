import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    canonical: z.string(),
    h1: z.string().optional(),
    primary_keyword: z.string().optional(),
    replaces: z.string().optional(),
    breadcrumbs: z.array(z.object({
      name: z.string(),
      url: z.string(),
    })),
    schema: z.array(z.string()),
    author: z.string(),
    datePublished: z.string(),
    dateModified: z.string(),
    tested_with: z.string().optional(),
    tools: z.array(z.string()).optional(),
    affiliation: z.string().optional(),
  }),
});

export const collections = {
  articles,
};
