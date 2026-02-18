import { z } from 'zod';

export const createPostSchema = z.object({
  postDescription: z
    .string()
    .min(5, "Post must be at least 5 characters")
    .max(500, "Post cannot exceed 500 characters"),
  postImage: z.string().optional().nullable(),
});


export const searchPostsQuerySchema = z.object({
  q: z.string().min(1, "Search query cannot be empty"),
});

