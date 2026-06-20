import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/data/posts' }),
  schema: z.object({
    title: z.string(), date: z.string(), summary: z.string(),
    tags: z.array(z.string()).default([]), draft: z.boolean().default(false),
  }),
});
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/projects' }),
  schema: z.object({
    name: z.string(), date: z.string(), status: z.enum(['shipped','live','wip']),
    repo: z.string().optional(), stack: z.array(z.string()).default([]), order: z.number().default(0),
  }),
});
export const collections = { posts, projects };
