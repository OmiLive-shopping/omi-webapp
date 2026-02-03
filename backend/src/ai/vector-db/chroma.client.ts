// backend/ai/vectordb/index.ts
import { prisma } from "../../prisma";
import type { Post } from "@prisma/client";

export async function savePostToDB(
  title: string,
  content: string,
  embedding: number[]
): Promise<Post> {
  return prisma.post.create({
    data: { title, content, embedding },
  });
}

export async function saveCommentToDB(postId: number, content: string) {
  return prisma.comment.create({
    data: { postId, content },
  });
}

export async function getAllPosts() {
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { comments: true },
  });
}

export async function searchPostsByEmbedding(queryEmbedding: number[]) {
  return prisma.$queryRawUnsafe<any[]>(
    `
    SELECT
      p.id,
      p.title,
      p.content,
      p."createdAt",
      1 - (p.embedding <=> $1::vector) AS score
    FROM "Post" p
    ORDER BY p.embedding <-> $1::vector
    LIMIT 20;
    `,
    queryEmbedding
  );
}
