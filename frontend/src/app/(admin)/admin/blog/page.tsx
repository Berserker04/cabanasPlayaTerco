'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  CheckCircle2,
  Edit,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PostForm, type PostFormPayload } from '@/components/blog/post-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { BlogListResponse, Comment, CommentListResponse, Post, PostStatus, PostType } from '@/types/blog';

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : '';
}

function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function statusClass(status: PostStatus | string) {
  return {
    draft: 'border-amber-200 bg-amber-50 text-amber-800',
    published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    archived: 'border-neutral-200 bg-neutral-100 text-neutral-700',
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rejected: 'border-red-200 bg-red-50 text-red-800',
  }[status] ?? 'border-neutral-200 bg-neutral-100 text-neutral-700';
}

export default function AdminBlogPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PostStatus | 'all'>('all');
  const [type, setType] = useState<PostType | 'all'>('all');
  const [commentStatus, setCommentStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const postsQuery = useQuery({
    queryKey: ['admin-posts', search, status, type],
    queryFn: () =>
      api.get<BlogListResponse>(
        `/admin/posts${buildQuery({
          search,
          status: status === 'all' ? undefined : status,
          type: type === 'all' ? undefined : type,
          per_page: 50,
        })}`,
      ),
  });

  const commentsQuery = useQuery({
    queryKey: ['admin-comments', commentStatus],
    queryFn: () =>
      api.get<CommentListResponse>(
        `/admin/comments${buildQuery({
          status: commentStatus === 'all' ? undefined : commentStatus,
        })}`,
      ),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ post, payload }: { post?: Post | null; payload: PostFormPayload }) => {
      await fetchCsrfCookie();

      if (post) {
        return api.put<ApiResponse<Post>>(`/admin/posts/${post.id}`, payload);
      }

      const slug = payload.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      return api.post<ApiResponse<Post>>('/admin/posts', {
        ...payload,
        slug: slug || `blog-${Date.now()}`,
      });
    },
    onSuccess: (response) => {
      toast.success(response.message ?? 'Blog guardado.');
      setEditingPost(null);
      setIsDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos guardar el blog', {
        description: error instanceof ApiError ? error.message : 'Revisa los campos e intentalo de nuevo.',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ post, nextStatus }: { post: Post; nextStatus: PostStatus }) => {
      await fetchCsrfCookie();
      return api.put<ApiResponse<Post>>(`/admin/posts/${post.id}`, {
        status: nextStatus,
        published_at: nextStatus === 'published' ? post.published_at ?? new Date().toISOString() : post.published_at,
      });
    },
    onSuccess: (response) => {
      toast.success(response.message ?? 'Estado actualizado.');
      void queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos cambiar el estado', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (post: Post) => {
      await fetchCsrfCookie();
      return api.delete<{ message: string }>(`/admin/posts/${post.id}`);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos eliminar el blog', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ comment, nextStatus }: { comment: Comment; nextStatus: 'approved' | 'pending' | 'rejected' }) => {
      await fetchCsrfCookie();
      return api.put<ApiResponse<Comment>>(`/admin/comments/${comment.id}`, { status: nextStatus });
    },
    onSuccess: (response) => {
      toast.success(response.message ?? 'Comentario actualizado.');
      void queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos actualizar el comentario', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (comment: Comment) => {
      await fetchCsrfCookie();
      return api.delete<{ message: string }>(`/admin/comments/${comment.id}`);
    },
    onSuccess: (response) => {
      toast.success(response.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos eliminar el comentario', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  const posts = postsQuery.data?.data ?? [];
  const comments = commentsQuery.data?.data ?? [];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Contenido</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">Blog</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Interviene experiencias de turistas, articulos y comentarios publicados.
          </p>
        </div>
        <Button type="button" className="w-full bg-cyan-700 text-white hover:bg-cyan-800 sm:w-auto" onClick={() => {
          setEditingPost(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="h-4 w-4" />
          Crear articulo
        </Button>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_150px_150px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en blogs" className="pl-9" />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as PostStatus | 'all')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="draft">Borradores</SelectItem>
              <SelectItem value="archived">Archivados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(value) => setType(value as PostType | 'all')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tipos</SelectItem>
              <SelectItem value="experience">Experiencias</SelectItem>
              <SelectItem value="article">Articulos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Blog</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {postsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="max-w-[380px] whitespace-normal align-top">
                    <div className="font-medium text-neutral-950">{post.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{post.summary || post.excerpt}</p>
                    <div className="mt-2 text-xs text-cyan-700">{post.media_count} medio(s) · {post.comments_count ?? 0} comentario(s)</div>
                  </TableCell>
                  <TableCell className="align-top">{post.author?.name ?? 'Sin autor'}</TableCell>
                  <TableCell className="align-top">{post.type_label}</TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline" className={statusClass(post.status)}>{post.status_label}</Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">{formatDate(post.published_at ?? post.created_at)}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="icon-sm" variant="outline" aria-label="Ver publico">
                        <Link href={`/blog/${post.slug}`}>
                          <Search className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button type="button" size="icon-sm" variant="outline" aria-label="Editar" onClick={() => {
                        setEditingPost(post);
                        setIsDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon-sm" variant="outline" aria-label="Publicar" onClick={() => updateStatusMutation.mutate({ post, nextStatus: 'published' })}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      </Button>
                      <Button type="button" size="icon-sm" variant="outline" aria-label="Archivar" onClick={() => updateStatusMutation.mutate({ post, nextStatus: 'archived' })}>
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon-sm" variant="destructive" aria-label="Eliminar" onClick={() => deletePostMutation.mutate(post)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No hay blogs con estos filtros.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">Comentarios</h2>
            <p className="mt-1 text-sm text-muted-foreground">Aprueba, rechaza o elimina intervenciones de turistas.</p>
          </div>
          <Select value={commentStatus} onValueChange={(value) => setCommentStatus(value as 'all' | 'approved' | 'pending' | 'rejected')}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Autor</TableHead>
                <TableHead>Comentario</TableHead>
                <TableHead>Blog</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commentsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell className="align-top">{comment.author_name ?? comment.user?.name ?? 'Turista'}</TableCell>
                    <TableCell className="max-w-[380px] whitespace-normal align-top">
                      <p className="line-clamp-3 text-sm leading-6">{comment.body}</p>
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">{comment.commentable?.title ?? 'Blog'}</TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline" className={statusClass(comment.status)}>{comment.status}</Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="icon-sm" variant="outline" aria-label="Aprobar" onClick={() => updateCommentMutation.mutate({ comment, nextStatus: 'approved' })}>
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        </Button>
                        <Button type="button" size="icon-sm" variant="outline" aria-label="Rechazar" onClick={() => updateCommentMutation.mutate({ comment, nextStatus: 'rejected' })}>
                          <XCircle className="h-4 w-4 text-red-700" />
                        </Button>
                        <Button type="button" size="icon-sm" variant="destructive" aria-label="Eliminar" onClick={() => deleteCommentMutation.mutate(comment)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay comentarios con estos filtros.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingPost(null);
        }
      }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Intervenir blog' : 'Crear articulo'}</DialogTitle>
            <DialogDescription>
              Los cambios se reflejan en la vista publica segun el estado seleccionado.
            </DialogDescription>
          </DialogHeader>
          <PostForm
            key={editingPost?.id ?? 'admin-create'}
            initialPost={editingPost}
            showAdminFields
            submitLabel="Guardar blog"
            isSubmitting={saveMutation.isPending}
            onCancel={() => setIsDialogOpen(false)}
            onSubmit={(payload) => saveMutation.mutate({ post: editingPost, payload })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
