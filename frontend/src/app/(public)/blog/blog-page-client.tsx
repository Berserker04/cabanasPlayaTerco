'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { blogDate, blogQuery } from '@/lib/blog-utils';
import {
  BlogError,
  BlogLoading,
  BlogPagination,
  useBlogFilters,
  useBlogSearch,
} from '@/components/blog/blog-ui';
import type { BlogCategory, BlogListResponse, BlogTag } from '@/types/blog';

const heroImage =
  '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg';
export function BlogPageClient() {
  const { params, update } = useBlogFilters();
  const { isAuthenticated } = useAuth();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') ?? '';
  const debounced = useBlogSearch(search);
  const type = params.get('type') ?? 'all';
  const category = params.get('category') ?? 'all';
  const tag = params.get('tag') ?? 'all';
  const query = useQuery({
    queryKey: ['posts', page, debounced, type, category, tag],
    queryFn: () =>
      api.get<BlogListResponse>(
        '/posts' +
          blogQuery({
            page,
            per_page: 9,
            search: debounced,
            type,
            category,
            tag,
          }),
      ),
  });
  const categories = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => api.get<{ data: BlogCategory[] }>('/categories'),
  });
  const tags = useQuery({
    queryKey: ['blog-tags'],
    queryFn: () => api.get<{ data: BlogTag[] }>('/tags'),
  });
  const last = query.data?.meta.last_page;
  useEffect(() => {
    if (last && page > last) update({ page: last });
  }, [last, page, update]);
  const from = '/blog' + blogQuery({ page, search, type, category, tag });
  const posts = query.data?.data ?? [];
  return (
    <>
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-neutral-950/75" />
        <div className="container relative mx-auto px-4 py-12 sm:py-16">
          <Badge className="mb-4 bg-cyan-300 text-cyan-950">
            Blog de viajeros
          </Badge>
          <h1 className="max-w-3xl text-3xl font-bold sm:text-5xl">
            Historias desde Playa Terco
          </h1>
          <p className="mt-5 max-w-2xl leading-8 text-cyan-50">
            Experiencias de viajeros y artículos del equipo para inspirar tu
            próxima visita al Pacífico.
          </p>
          <Button
            asChild
            className="mt-6 bg-white text-cyan-950 hover:bg-cyan-50"
          >
            <Link
              href={
                isAuthenticated
                  ? '/perfil?tab=blog'
                  : '/login?next=%2Fperfil%3Ftab%3Dblog'
              }
            >
              <Plus />
              Compartir mi experiencia
            </Link>
          </Button>
        </div>
      </section>
      <section className="bg-stone-50 py-8 sm:py-10">
        <div className="container mx-auto space-y-6 px-4">
          <div className="grid items-end gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_170px_170px_auto]">
            <div className="space-y-1">
              <Label htmlFor="public-blog-search">Buscar historias</Label>
              <Input
                id="public-blog-search"
                value={search}
                placeholder="Título, lugar o recomendación"
                onChange={(e) => update({ search: e.target.value, page: 1 })}
              />
            </div>
            <label className="grid gap-1 text-sm font-medium">
              Tipo
              <select
                className="h-10 rounded-md border bg-white px-3 font-normal"
                value={type}
                onChange={(e) => update({ type: e.target.value, page: 1 })}
              >
                <option value="all">Todos</option>
                <option value="experience">Experiencias</option>
                <option value="article">Artículos</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Categoría
              <select
                className="h-10 rounded-md border bg-white px-3 font-normal"
                value={category}
                disabled={categories.isLoading || categories.isError}
                onChange={(e) => update({ category: e.target.value, page: 1 })}
              >
                <option value="all">Todas</option>
                {categories.data?.data.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Etiqueta
              <select
                className="h-10 rounded-md border bg-white px-3 font-normal"
                value={tag}
                disabled={tags.isLoading || tags.isError}
                onChange={(e) => update({ tag: e.target.value, page: 1 })}
              >
                <option value="all">Todas</option>
                {tags.data?.data.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="ghost"
              onClick={() =>
                update({
                  search: null,
                  type: null,
                  category: null,
                  tag: null,
                  page: 1,
                })
              }
            >
              Limpiar
            </Button>
          </div>
          {(categories.isError || tags.isError) && (
            <BlogError
              message="No pudimos cargar todos los filtros."
              retry={() => {
                void categories.refetch();
                void tags.refetch();
              }}
            />
          )}
          <h2 className="text-2xl font-bold">Últimas historias</h2>
          {query.isLoading ? (
            <BlogLoading />
          ) : query.isError ? (
            <BlogError retry={() => void query.refetch()} />
          ) : posts.length ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => {
                const href = `/blog/${post.slug}?from=${encodeURIComponent(from)}`;
                return (
                  <article
                    key={post.id}
                    className="min-w-0 overflow-hidden rounded-lg border bg-white shadow-sm"
                  >
                    {post.featured_image && (
                      <Link href={href} tabIndex={-1} aria-hidden="true">
                        <img
                          src={post.featured_image}
                          alt=""
                          loading="lazy"
                          className="aspect-video w-full object-cover"
                        />
                      </Link>
                    )}
                    <div className="space-y-3 p-5">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {post.type === 'experience'
                            ? 'Experiencia'
                            : 'Artículo'}
                        </Badge>
                        <span>{blogDate(post.published_at)}</span>
                      </div>
                      <h3 className="break-words text-xl font-semibold">
                        <Link
                          className="hover:text-cyan-800 hover:underline"
                          href={href}
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="line-clamp-3 break-words text-sm leading-7 text-neutral-600">
                        {post.excerpt || post.summary}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {post.author?.name || 'Playa Terco'} ·{' '}
                        {post.comments_count ?? 0} comentarios
                      </p>
                      <Link
                        className="inline-block py-2 text-sm font-medium text-cyan-800 underline underline-offset-4"
                        href={href}
                      >
                        Leer historia
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-8 text-center">
              <h3 className="text-lg font-semibold">
                No hay historias con estos filtros
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Prueba otra búsqueda o limpia los filtros.
              </p>
            </div>
          )}
          {!query.isError && (
            <BlogPagination
              meta={query.data?.meta}
              page={page}
              onPage={(value) => update({ page: value })}
              busy={query.isFetching}
            />
          )}
        </div>
      </section>
    </>
  );
}
