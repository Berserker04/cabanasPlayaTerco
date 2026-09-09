'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, fetchCsrfCookie } from '@/lib/api';
import { blogDate, blogQuery } from '@/lib/blog-utils';
import { invalidateBlog } from '@/lib/blog-queries';
import type { Comment, CommentListResponse, Post } from '@/types/blog';
import {
  BlogActionDialog,
  BlogError,
  BlogLoading,
  BlogPagination,
  BlogStatus,
  useBlogFilters,
  useBlogDialogFocus,
  useBlogSearch,
  type BlogAction,
} from './blog-ui';

export function CommentManager() {
  const detailFocus = useBlogDialogFocus();
  const client = useQueryClient();
  const { params, update } = useBlogFilters();
  const search = params.get('blog_comment_search') ?? '';
  const debounced = useBlogSearch(search);
  const status = params.get('blog_comment_status') ?? 'all';
  const postId = params.get('blog_post_id') ?? '';
  const page = Math.max(1, Number(params.get('blog_comment_page')) || 1);
  const [selected, setSelected] = useState<Comment | null>(null);
  const [action, setAction] = useState<BlogAction | null>(null);
  const query = useQuery({
    queryKey: ['admin-comments', page, debounced, status, postId],
    queryFn: () =>
      api.get<CommentListResponse>(
        '/admin/comments' +
          blogQuery({ page, search: debounced, status, post_id: postId }),
      ),
  });
  const post = useQuery({
    queryKey: ['private-post', '/admin/posts', Number(postId)],
    queryFn: () => api.get<{ data: Post }>(`/admin/posts/${postId}`),
    enabled: !!postId,
  });
  const last = query.data?.meta.last_page;
  useEffect(() => {
    if (last && page > last) update({ blog_comment_page: last });
  }, [last, page, update]);
  function moderate(
    comment: Comment,
    next: 'approved' | 'rejected' | 'delete',
  ) {
    const deleting = next === 'delete';
    const verb = deleting
      ? 'Eliminar'
      : next === 'approved'
        ? 'Aprobar'
        : 'Rechazar';
    setAction({
      title: `${verb} comentario`,
      label: verb,
      destructive: deleting,
      description: `De ${comment.author_name || 'Viajero'}:\n“${comment.body}”\n\n${deleting ? `Se eliminarán este comentario y sus ${comment.replies_count ?? 0} respuestas. Esta acción no se puede deshacer.` : next === 'rejected' ? 'El comentario y sus respuestas dejarán de verse públicamente.' : comment.parent && comment.parent.status !== 'approved' ? 'Quedará aprobado, pero seguirá oculto mientras su comentario principal no esté aprobado.' : 'El comentario quedará visible en la publicación.'}`,
      run: async () => {
        await fetchCsrfCookie();
        if (deleting) await api.delete(`/admin/comments/${comment.id}`);
        else await api.put(`/admin/comments/${comment.id}`, { status: next });
        setSelected(null);
        await invalidateBlog(client);
      },
    });
  }
  function actions(comment: Comment) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelected(comment)}
        >
          Leer completo
        </Button>
        {comment.status !== 'approved' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => moderate(comment, 'approved')}
          >
            Aprobar
          </Button>
        )}
        {comment.status !== 'rejected' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => moderate(comment, 'rejected')}
          >
            Rechazar
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-red-700"
          onClick={() => moderate(comment, 'delete')}
        >
          Eliminar
        </Button>
      </div>
    );
  }
  function body(comment: Comment) {
    return (
      <div className="space-y-2">
        <p className="line-clamp-3 whitespace-pre-line break-words text-sm leading-6">
          {comment.body}
        </p>
        {comment.parent && (
          <p className="text-xs text-muted-foreground">
            Respuesta a {comment.parent.author_name || 'Viajero'}
          </p>
        )}
      </div>
    );
  }
  const comments = query.data?.data ?? [];
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Comentarios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa conversaciones completas y gestiona su visibilidad.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="comment-search">
            Buscar comentarios o publicación
          </Label>
          <Input
            id="comment-search"
            value={search}
            onChange={(e) =>
              update({
                blog_comment_search: e.target.value,
                blog_comment_page: 1,
              })
            }
            placeholder="Contenido, autor o título del blog"
          />
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Estado
          <select
            className="h-10 rounded-md border bg-white px-3"
            value={status}
            onChange={(e) =>
              update({
                blog_comment_status: e.target.value,
                blog_comment_page: 1,
              })
            }
          >
            <option value="all">Todos los estados</option>
            <option value="approved">Aprobados</option>
            <option value="pending">Pendientes</option>
            <option value="rejected">Rechazados</option>
          </select>
        </label>
        <Button
          variant="ghost"
          onClick={() =>
            update({
              blog_comment_search: null,
              blog_comment_status: null,
              blog_post_id: null,
              blog_comment_page: 1,
            })
          }
        >
          Limpiar filtros
        </Button>
      </div>
      {postId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900">
          <span>Publicación: {post.data?.data.title || `#${postId}`}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => update({ blog_post_id: null, blog_comment_page: 1 })}
          >
            Ver todas
          </Button>
        </div>
      )}
      {query.isLoading ? (
        <BlogLoading />
      ) : query.isError ? (
        <BlogError retry={() => void query.refetch()} />
      ) : !comments.length ? (
        <p className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
          No hay comentarios con estos filtros.
        </p>
      ) : (
        <>
          <div className="hidden rounded-lg border bg-white lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Autor y fecha</TableHead>
                  <TableHead>Comentario</TableHead>
                  <TableHead>Publicación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell className="max-w-[180px] whitespace-normal align-top">
                      {comment.author_name}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {blogDate(comment.created_at)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[340px] whitespace-normal align-top">
                      {body(comment)}
                    </TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal align-top">
                      <button
                        className="text-left text-sm text-cyan-800 hover:underline"
                        onClick={() =>
                          update({
                            blog_post_id: comment.commentable?.id ?? null,
                            blog_comment_page: 1,
                          })
                        }
                      >
                        {comment.commentable?.title}
                      </button>
                    </TableCell>
                    <TableCell className="align-top">
                      <BlogStatus status={comment.status} />
                    </TableCell>
                    <TableCell className="align-top">
                      {actions(comment)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-4 lg:hidden">
            {comments.map((comment) => (
              <article
                key={comment.id}
                className="space-y-3 rounded-lg border bg-white p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{comment.author_name}</p>
                  <BlogStatus status={comment.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {blogDate(comment.created_at)}
                </p>
                {body(comment)}
                <button
                  className="text-left text-sm text-cyan-800 underline"
                  onClick={() =>
                    update({
                      blog_post_id: comment.commentable?.id ?? null,
                      blog_comment_page: 1,
                    })
                  }
                >
                  {comment.commentable?.title}
                </button>
                {actions(comment)}
              </article>
            ))}
          </div>
        </>
      )}
      {!query.isError && (
        <BlogPagination
          meta={query.data?.meta}
          page={page}
          onPage={(value) => update({ blog_comment_page: value })}
          busy={query.isFetching}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent
          {...detailFocus}
          closeLabel="Cerrar comentario"
          className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        >
          <DialogTitle>Comentario de {selected?.author_name}</DialogTitle>
          <DialogDescription>
            {selected?.commentable?.title} ·{' '}
            {blogDate(selected?.created_at, true)}
          </DialogDescription>
          {selected?.parent && (
            <blockquote className="rounded-md border-l-4 border-cyan-600 bg-cyan-50 p-4 text-sm">
              <p className="mb-2 font-medium">
                En respuesta a {selected.parent.author_name}
              </p>
              <p className="whitespace-pre-line break-words">
                {selected.parent.body}
              </p>
            </blockquote>
          )}
          <p className="whitespace-pre-line break-words leading-7">
            {selected?.body}
          </p>
          {selected && (
            <>
              <BlogStatus status={selected.status} />
              {actions(selected)}
              {selected.commentable?.slug && (
                <Link
                  className="text-sm text-cyan-800 underline"
                  href={`/blog/${selected.commentable.slug}#comentario-${selected.parent_id || selected.id}`}
                >
                  Ir a la publicación
                </Link>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <BlogActionDialog action={action} onClose={() => setAction(null)} />
    </section>
  );
}
