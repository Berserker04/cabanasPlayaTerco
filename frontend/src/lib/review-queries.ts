import type { QueryClient } from '@tanstack/react-query';

export async function refreshReviews(client: QueryClient) {
  await Promise.all(
    [
      'reviews',
      'my-reviews',
      'admin-reviews',
      'admin-dashboard-operations',
    ].map((key) => client.invalidateQueries({ queryKey: [key] })),
  );
}
