'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Eye, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { BlogListResponse, Post, PostStatus } from '@/types/blog';
import { PostEditor } from './post-editor';
import { PostPreview } from './blog-content';
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

export function PostManager({ admin = false }: { admin?: boolean }) {
  const previewFocus = useBlogDialogFocus();
  const client = useQueryClient();
  const { params, update } = useBlogFilters();
  const search = params.get('blog_search') ?? '';
  const debounced = useBlogSearch(search);
  const status = params.get('blog_status') ?? 'all';
  const type = params.get('blog_type') ?? 'all';
  const page = Math.max(1, Number(params.get('blog_page')) || 1);
  const base = admin ? '/admin/posts' : '/me/posts';
  const [editor, setEditor] = useState<{ id?: number } | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [action, setAction] = useState<BlogAction | null>(null);
  const closeEditor = useCallback(() => setEditor(null), []);
  const query = useQuery({
    queryKey: [
      admin ? 'admin-posts' : 'my-posts',
      page,
      debounced,
      status,
      type,
    ],
    queryFn: () =>
      api.get<BlogListResponse>(
        base +
          blogQuery({
            page,
            per_page: 12,
            search: debounced,
            status,
            type: admin ? type : undefined,
          }),
      ),
  });
  const privatePost = useQuery({
    queryKey: ['private-post', base, previewId],
    queryFn: () => api.get<{ data: Post }>(`${base}/${previewId}`),
    enabled: !!previewId,
    staleTime: 0,
  });
  const last = query.data?.meta.last_page;
  useEffect(() => {
    if (last && page > last) update({ blog_page: last });
  }, [last, page, update]);

  function statusAction(post: Post, next: PostStatus) {
    const labels = {
      published: 'Publicar',
      archived: 'Archivar',
      draft: 'Volver a borrador',
    };
    setAction({
      title: `${labels[next]} publicación`,
      label: labels[next],
      description: `«${post.title}»\n${next === 'published' ? 'El contenido y sus archivos estarán visibles para cualquier visitante.' : 'La publicación dejará de estar visible. Sus archivos y comentarios se conservarán.'}`,
      run: async () => {
        await fetchCsrfCookie();
        await api.put(`${base}/${post.id}`, { status: next });
        await invalidateBlog(client);
        toast.success('Estado actualizado.');
      },
    });
  }
  function deleteAction(post: Post) {
    setAction({
      title: 'Eliminar publicación',
      label: 'Eliminar publicación',
      destructive: true,
      description: `¿Eliminar «${post.title}»?\nSe retirarán sus ${post.media_count} archivos y ${post.comments_count ?? 0} comentarios, incluidas las respuestas. No podrás recuperarla desde el sitio.${admin ? ' Puedes archivarla si quieres conservarla.' : ''}`,
      run: async () => {
        await fetchCsrfCookie();
        await api.delete(`${base}/${post.id}`);
        await invalidateBlog(client);
        toast.success('Publicación eliminada.');
      },
    });
  }
  function actions(post: Post) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewId(post.id)}
        >
          <Eye />
          {post.status === 'published' ? 'Ver detalle' : 'Vista previa'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditor({ id: post.id })}
        >
          <Edit />
          Editar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Más acciones de ${post.title}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {post.status === 'published' && (
              <DropdownMenuItem asChild>
                <Link href={`/blog/${post.slug}`}>Ver publicación</Link>
              </DropdownMenuItem>
            )}
            {admin && (
              <DropdownMenuItem
                onSelect={() =>
                  update({
                    blog_view: 'comments',
                    blog_post_id: post.id,
                    blog_comment_page: 1,
                  })
                }
              >
                Ver comentarios
              </DropdownMenuItem>
            )}
            {admin && post.status !== 'published' && (
              <DropdownMenuItem
                onSelect={() => statusAction(post, 'published')}
              >
                Publicar
              </DropdownMenuItem>
            )}
            {admin && post.status !== 'draft' && (
              <DropdownMenuItem onSelect={() => statusAction(post, 'draft')}>
                Volver a borrador
              </DropdownMenuItem>
            )}
            {admin && post.status !== 'archived' && (
              <DropdownMenuItem onSelect={() => statusAction(post, 'archived')}>
                Archivar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-red-700"
              onSelect={() => deleteAction(post)}
            >
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
  function info(post: Post) {
    return (
      <div className="min-w-0 space-y-2">
        <button
          className="block text-left font-semibold break-words hover:text-cyan-800 hover:underline"
          onClick={() => setPreviewId(post.id)}
        >
          {post.title}
        </button>
        <p className="line-clamp-2 whitespace-normal text-sm leading-6 text-neutral-600">
          {post.excerpt || post.summary || 'Sin resumen.'}
        </p>
        <p className="text-xs text-muted-foreground">
          {post.media_count} archivos · {post.comments_count ?? 0} comentarios
        </p>
      </div>
    );
  }
  const posts = query.data?.data ?? [];
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {admin ? 'Publicaciones' : 'Mis blogs de experiencia'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {admin
              ? 'Gestiona artículos y experiencias de viajeros.'
              : 'Guarda tus recuerdos como borrador y compártelos cuando estén listos.'}
          </p>
        </div>
        <Button
          className="bg-cyan-700 text-white hover:bg-cyan-800"
          onClick={() => setEditor({})}
        >
          <Plus />
          {admin ? 'Crear artículo' : 'Crear blog'}
        </Button>
      </header>
      <div className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <div className="space-y-1">
          <Label htmlFor="blog-search">Buscar publicaciones</Label>
          <Input
            id="blog-search"
            value={search}
            placeholder={
              admin ? 'Título, contenido o autor' : 'Título o resumen'
            }
            onChange={(e) =>
              update({ blog_search: e.target.value, blog_page: 1 })
            }
          />
        </div>
        <label className="grid content-start gap-1 text-sm font-medium">
          Estado
          <select
            className="h-10 w-full rounded-md border bg-white px-3 font-normal"
            value={status}
            onChange={(e) =>
              update({ blog_status: e.target.value, blog_page: 1 })
            }
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="published">Publicados</option>
            <option value="archived">Archivados</option>
          </select>
        </label>
        {admin && (
          <label className="grid content-start gap-1 text-sm font-medium">
            Tipo
            <select
              className="h-10 w-full rounded-md border bg-white px-3 font-normal"
              value={type}
              onChange={(e) =>
                update({ blog_type: e.target.value, blog_page: 1 })
              }
            >
              <option value="all">Todos los tipos</option>
              <option value="article">Artículos</option>
              <option value="experience">Experiencias</option>
            </select>
          </label>
        )}
        <Button
          variant="ghost"
          className="self-end"
          onClick={() =>
            update({
              blog_search: null,
              blog_status: null,
              blog_type: null,
              blog_page: 1,
            })
          }
        >
          Limpiar filtros
        </Button>
      </div>
      {query.isLoading ? (
        <BlogLoading />
      ) : query.isError ? (
        <BlogError retry={() => void query.refetch()} />
      ) : posts.length ? (
        <>
          {admin && (
            <div className="hidden rounded-lg border bg-white lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Publicación</TableHead>
                    <TableHead>Autor y tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Actualizada</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-[340px] whitespace-normal align-top">
                        {info(post)}
                      </TableCell>
                      <TableCell className="max-w-[180px] whitespace-normal align-top">
                        <p>{post.author?.name || 'Sin autor'}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {post.type === 'experience'
                            ? 'Experiencia'
                            : 'Artículo'}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">
                        <BlogStatus status={post.status} />
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {blogDate(post.updated_at || post.created_at)}
                      </TableCell>
                      <TableCell className="align-top">
                        {actions(post)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div
            className={
              admin ? 'grid gap-4 lg:hidden' : 'grid gap-5 xl:grid-cols-2'
            }
          >
            {posts.map((post) => (
              <article
                key={post.id}
                className="min-w-0 rounded-lg border bg-white p-5"
              >
                <div className="mb-4 flex gap-3">
                  {post.featured_image && (
                    <img
                      src={post.featured_image}
                      alt=""
                      className="h-20 w-24 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="space-y-2">
                    <BlogStatus status={post.status} />
                    <p className="text-xs text-muted-foreground">
                      {admin ? `${post.author?.name || 'Sin autor'} · ` : ''}
                      {blogDate(post.updated_at || post.created_at)}
                    </p>
                  </div>
                </div>
                {info(post)}
                <div className="mt-5">{actions(post)}</div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">
            No hay publicaciones
            {search || status !== 'all' || type !== 'all'
              ? ' con estos filtros'
              : ' todavía'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Puedes cambiar los filtros o empezar una nueva historia.
          </p>
        </div>
      )}
      {!query.isError && (
        <BlogPagination
          meta={query.data?.meta}
          page={page}
          onPage={(value) => update({ blog_page: value })}
          busy={query.isFetching}
        />
      )}
      {editor && (
        <PostEditor postId={editor.id} admin={admin} onClose={closeEditor} />
      )}
      <Dialog
        open={!!previewId}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
      >
        <DialogContent
          {...previewFocus}
          closeLabel="Cerrar detalle"
          className="max-h-[94dvh] overflow-y-auto sm:max-w-5xl"
        >
          <DialogTitle>Detalle de la publicación</DialogTitle>
          <DialogDescription>
            Contenido completo y archivos de la publicación.
          </DialogDescription>
          {privatePost.isLoading ? (
            <BlogLoading />
          ) : privatePost.isError ? (
            <BlogError retry={() => void privatePost.refetch()} />
          ) : (
            privatePost.data && (
              <PostPreview
                post={privatePost.data.data}
                privateView={privatePost.data.data.status !== 'published'}
              />
            )
          )}
        </DialogContent>
      </Dialog>
      <BlogActionDialog action={action} onClose={() => setAction(null)} />
    </section>
  );
}
