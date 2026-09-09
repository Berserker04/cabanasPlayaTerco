import type { QueryClient } from '@tanstack/react-query';

export async function invalidateBlog(client: QueryClient) {
  await Promise.all(
    [
      'posts',
      'post',
      'my-posts',
      'admin-posts',
      'admin-comments',
      'blog-categories',
      'blog-tags',
      'private-post',
    ].map((key) => client.invalidateQueries({ queryKey: [key] })),
  );
}
