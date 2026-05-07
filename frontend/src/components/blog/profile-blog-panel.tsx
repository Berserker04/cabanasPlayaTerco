'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, FileText, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PostForm, type PostFormPayload } from '@/components/blog/post-form';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { BlogListResponse, Post, PostStatus } from '@/types/blog';

function formatDate(value?: string | null) {
  if (!value) {
    return 'Sin publicar';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function statusClass(status: PostStatus) {
  return {
    draft: 'border-amber-200 bg-amber-50 text-amber-800',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    archived: 'border-neutral-200 bg-neutral-100 text-neutral-700',
  }[status];
}

export function ProfileBlogPanel() {
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const postsQuery = useQuery({
    queryKey: ['my-posts'],
    queryFn: () => api.get<BlogListResponse>('/me/posts'),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: PostFormPayload) => {
      await fetchCsrfCookie();
      return api.post<ApiResponse<Post>>('/me/posts', payload);
    },
    onSuccess: (response) => {
      toast.success(response.message ?? 'Blog publicado.');
      setIsDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos publicar el blog', {
        description: error instanceof ApiError ? error.message : 'Revisa los campos e intentalo de nuevo.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ post, payload }: { post: Post; payload: PostFormPayload }) => {
      await fetchCsrfCookie();
      return api.put<ApiResponse<Post>>(`/me/posts/${post.id}`, payload);
    },
    onSuccess: (response) => {
      toast.success(response.message ?? 'Blog actualizado.');
      setEditingPost(null);
      setIsDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos actualizar el blog', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (post: Post) => {
      await fetchCsrfCookie();
      return api.delete<{ message: string }>(`/me/posts/${post.id}`);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos eliminar el blog', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const posts = postsQuery.data?.data ?? [];

  function openCreate() {
    setEditingPost(null);
    setIsDialogOpen(true);
  }

  function openEdit(post: Post) {
    setEditingPost(post);
    setIsDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">Mis blogs de experiencia</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Publica relatos completos con fotos, videos, recomendaciones y momentos de tu visita.
          </p>
        </div>
        <Button type="button" className="bg-cyan-700 text-white hover:bg-cyan-800" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Crear blog
        </Button>
      </div>

      {postsQuery.isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
          <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
        </div>
      ) : posts.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
              {post.featured_image ? (
                <img src={post.featured_image} alt={post.title} className="aspect-[16/8] w-full object-cover" />
              ) : null}
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusClass(post.status)}>
                    {post.status_label}
                  </Badge>
                  <Badge variant="outline">{post.type_label}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(post.published_at ?? post.created_at)}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-neutral-950">{post.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">
                  {post.summary || post.excerpt || 'Sin resumen.'}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button asChild variant="outline">
                    <Link href={`/blog/${post.slug}`}>Ver publico</Link>
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => openEdit(post)}>
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate(post)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-cyan-700" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-neutral-950">Aun no has creado blogs</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">
            Cuando publiques tu experiencia, aparecera de inmediato en el blog para otros turistas registrados.
          </p>
          <Button type="button" className="mt-5 bg-cyan-700 text-white hover:bg-cyan-800" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Crear primer blog
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingPost(null);
        }
      }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Editar blog' : 'Crear blog de experiencia'}</DialogTitle>
            <DialogDescription>
              El blog se publica inmediatamente. El equipo puede intervenirlo si hace falta.
            </DialogDescription>
          </DialogHeader>
          <PostForm
            key={editingPost?.id ?? 'create'}
            initialPost={editingPost}
            submitLabel={editingPost ? 'Guardar cambios' : 'Publicar blog'}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setIsDialogOpen(false)}
            onSubmit={(payload) => {
              if (editingPost) {
                updateMutation.mutate({ post: editingPost, payload });
                return;
              }

              createMutation.mutate(payload);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
