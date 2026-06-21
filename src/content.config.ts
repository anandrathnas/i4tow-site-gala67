import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blocks are validated loosely here (each is a JSON object); the strict shapes
// live in src/lib/blocks.ts and are enforced by the React render layer.
const blocks = z.array(z.record(z.string(), z.any())).optional();

const seo = {
  title: z.string(),
  description: z.string().optional(),
  descriptionAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  ogImage: z.string().optional(),
  // `slug` from frontmatter drives the public URL (lets the editor preserve
  // existing SEO paths like /curriculum/ regardless of filename).
  slug: z.string().optional(),
  type: z.string().optional(),
  blocks,
};

// Editor commits to repo-root content/pages and content/posts (see
// backend siteContent.contentPath), so the loaders read from there.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/pages' }),
  schema: z.object({ ...seo }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/posts' }),
  schema: z.object({
    ...seo,
    date: z.string().optional(),
    excerpt: z.string().optional(),
    coverImage: z.string().optional(),
  }),
});

export const collections = { pages, posts };
