import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/data/posts' }),
  schema: z.object({
    title: z.string(), date: z.string(), summary: z.string(),
    tags: z.array(z.string()).default([]), workshop: z.string().optional(), cover: z.string().optional(), draft: z.boolean().default(false),
  }),
});
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/projects' }),
  schema: z.object({
    name: z.string(), date: z.string(), status: z.enum(['shipped','live','wip']),
    repo: z.string().optional(), stack: z.array(z.string()).default([]), order: z.number().default(0),
  }),
});

const books = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/books' }),
  schema: z.object({ title: z.string(), th: z.string().optional(), pages: z.string().optional(),
    workshop: z.string().optional(), cover: z.string(), pdf: z.string(), source: z.string().optional(), order: z.number().default(0) }),
});

export const collections = { posts, projects, books };
