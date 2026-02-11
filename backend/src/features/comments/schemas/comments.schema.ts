// schemas/comments.schema.ts
// src/modules/comments/schemas/comments.schema.ts
import { z } from 'zod';

export const createCommentSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  comment: z
    .string()
    .min(3, 'Comment must be at least 3 characters')
    .max(300, 'Comment cannot exceed 300 characters'),
});

