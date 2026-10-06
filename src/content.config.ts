// Content contract (FOUND-01): posts and the shared glossary, both validated by Zod at build time.
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { defineCollection, reference } from "astro:content";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    deck: z.string(),
    order: z.number().int().positive(),
    terms: z.array(reference("glossary")).default([]),
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/glossary" }),
  schema: z.object({
    term: z.string(),
    definition: z.string(),
    order: z.number().int().positive(),
  }),
});

export const collections = { posts, glossary };
