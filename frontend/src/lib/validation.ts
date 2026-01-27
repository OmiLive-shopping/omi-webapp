// frontend/src/lib/validation.ts
import { z } from 'zod';

export const postSchema = z.object({
  postDescription: z
    .string()
    .min(1, 'Post content cannot be empty')
    .max(500, 'Post content cannot exceed 500 characters'),
  postImage: z.string().url('Invalid image URL').optional().nullable(),
});

export const commentSchema = z.object({
  comment: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(200, 'Comment cannot exceed 200 characters'),
});
