import { z } from "zod";

// PORTED from salvage, unchanged in logic.
export const ALLOWED_SECTION_KEYS = ["general", "prayer", "wins", "questions", "announcements"] as const;

export const createPostSchema = z.object({
  sectionKey: z.enum(ALLOWED_SECTION_KEYS),
  title: z.string().trim().min(1, "Title required").max(200, "200 characters max"),
  body: z.string().trim().min(1, "Body required").max(10_000, "10,000 characters max"),
  tags: z.array(z.string().trim().min(1).max(30)).max(5, "5 tags max").default([]),
});

export const createReplySchema = z.object({
  body: z.string().trim().min(1, "Reply required").max(4_000, "4,000 characters max"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
