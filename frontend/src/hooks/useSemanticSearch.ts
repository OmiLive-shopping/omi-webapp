// frontend/src/hooks/useSemanticSearch.ts
import { useState } from 'react';
import { UserPost } from './useCommunityPosts';
import { searchPosts } from '@/lib/api-client';

export function useSemanticSearch() {
  const [results, setResults] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const posts: UserPost[] = await searchPosts(query);
      setResults(posts);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
}
