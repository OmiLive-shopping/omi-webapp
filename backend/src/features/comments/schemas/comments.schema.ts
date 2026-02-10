import { z } from 'zod';

// For creating a comment
export const createCommentBodySchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  comment: z
    .string()
    .min(2, 'Comment must be at least 2 characters long')
    .max(300, 'Comment cannot exceed 300 characters'),
});

// For liking a comment
export const likeCommentParamsSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
});

export const likeCommentBodySchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
});
