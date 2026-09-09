'use client';

import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { api, fetchCsrfCookie } from '@/lib/api';
import { invalidateBlog } from '@/lib/blog-queries';
import type { Post } from '@/types/blog';
import { PostForm, type PostFormPayload } from './post-form';
import { BlogError, BlogLoading, useBlogDialogFocus } from './blog-ui';

export function PostEditor({
  postId,
  admin = false,
  onClose,
}: {
  postId?: number;
  admin?: boolean;
  onClose: () => void;
}) {
  const close = useRef<(() => Promise<void>) | null>(null);
  const focus = useBlogDialogFocus();
  const client = useQueryClient();
  const base = admin ? '/admin/posts' : '/me/posts';
  const post = useQuery({
    queryKey: ['private-post', base, postId],
    queryFn: () => api.get<{ data: Post }>(`${base}/${postId}`),
    enabled: !!postId,
    staleTime: 0,
    retry: 1,
  });
  const registerClose = useCallback((handler: () => Promise<void>) => {
    close.current = handler;
  }, []);
  async function save(payload: PostFormPayload, id?: number) {
    await fetchCsrfCookie();
    const result = id
      ? await api.put<{ data: Post }>(`${base}/${id}`, payload)
      : await api.post<{ data: Post }>(base, payload);
    void invalidateBlog(client);
    return result.data;
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          if (close.current) void close.current();
          else onClose();
        }
      }}
    >
      <DialogContent
        {...focus}
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[94dvh] sm:max-w-[min(1400px,96vw)] sm:rounded-xl"
      >
        {postId && post.isLoading ? (
          <div className="p-6">
            <DialogTitle>Cargando publicación</DialogTitle>
            <DialogDescription>Preparando el editor.</DialogDescription>
            <BlogLoading />
          </div>
        ) : postId && post.isError ? (
          <div className="p-6">
            <DialogTitle>No pudimos abrir el editor</DialogTitle>
            <DialogDescription>
              Comprueba tu conexión y vuelve a intentarlo.
            </DialogDescription>
            <BlogError retry={() => void post.refetch()} />
            <button className="mt-4 underline" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <PostForm
            initialPost={post.data?.data}
            admin={admin}
            onSave={save}
            onClose={onClose}
            registerClose={registerClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
