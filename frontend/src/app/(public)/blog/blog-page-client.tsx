'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, LoaderCircle, Search, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import type { ApiListResponse } from '@/types/api';
import type { BlogCategory, BlogListResponse, BlogTag, Post, PostType } from '@/types/blog';

const heroImage = '/assets/imagenes/240518846_4193049004078113_944283279498408299_n.jpg';

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

function postLabel(type: PostType) {
  return type === 'experience' ? 'Experiencia' : 'Articulo';
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="group overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.featured_image ? (
          <img src={post.featured_image} alt={post.title} className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-cyan-900 via-neutral-900 to-emerald-900" />
        )}
      </Link>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={post.type === 'experience' ? 'border-cyan-200 bg-cyan-50 text-cyan-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}>
            {postLabel(post.type)}
          </Badge>
          <span>{formatDate(post.published_at ?? post.created_at)}</span>
          {post.comments_count !== undefined ? <span>{post.comments_count} comentario(s)</span> : null}
        </div>
        <h2 className="mt-3 line-clamp-2 text-xl font-semibold tracking-normal text-neutral-950">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">
          {post.summary || post.excerpt || 'Una historia desde Playa Terco.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <span>{post.author?.name ?? 'Cabanas Playa Terco'}</span>
          {post.travel_style ? <span>{post.travel_style}</span> : null}
          {post.media_count > 0 ? <span>{post.media_count} medio(s)</span> : null}
        </div>
      </div>
    </article>
  );
}

export function BlogPageClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<PostType | 'all'>('all');
  const [category, setCategory] = useState('all');
  const [tag, setTag] = useState('all');

  const postsQuery = useQuery({
    queryKey: ['posts', page, search, type, category, tag],
    queryFn: () =>
      api.get<BlogListResponse>(
        `/posts${buildQuery({
          page,
          per_page: 9,
          search,
          type: type === 'all' ? undefined : type,
          category: category === 'all' ? undefined : category,
          tag: tag === 'all' ? undefined : tag,
        })}`,
      ),
  });

  const categoriesQuery = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => api.get<ApiListResponse<BlogCategory>>('/categories'),
  });

  const tagsQuery = useQuery({
    queryKey: ['blog-tags'],
    queryFn: () => api.get<ApiListResponse<BlogTag>>('/tags'),
  });

  const posts = useMemo(() => postsQuery.data?.data ?? [], [postsQuery.data?.data]);
  const meta = postsQuery.data?.meta;
  const lastPage = meta?.last_page ?? 1;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,28,28,0.94),rgba(4,28,28,0.66),rgba(4,28,28,0.28))]" />
        <div className="container relative mx-auto px-4 py-16 sm:py-20">
          <Badge className="mb-5 bg-cyan-400 text-cyan-950 hover:bg-cyan-300">Blog de viajeros</Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-normal sm:text-5xl">
            Experiencias, guias y relatos desde Playa Terco
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-cyan-50">
            Historias de turistas registrados y articulos del equipo para preparar mejor tu visita al Pacifico.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_150px_150px_150px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por titulo, lugar o recomendacion"
                  className="pl-9"
                />
              </div>
              <Select value={type} onValueChange={(value) => {
                setType(value as PostType | 'all');
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="experience">Experiencias</SelectItem>
                  <SelectItem value="article">Articulos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Categorias</SelectItem>
                  {(categoriesQuery.data?.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.slug}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tag} onValueChange={(value) => {
                setTag(value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Etiqueta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Etiquetas</SelectItem>
                  {(tagsQuery.data?.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.slug}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Publicaciones</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-neutral-950">Ultimas historias</h2>
            </div>
            {postsQuery.isFetching ? <LoaderCircle className="h-5 w-5 animate-spin text-cyan-700" /> : null}
          </div>

          {postsQuery.isError ? (
            <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
              No pudimos cargar el blog ahora.
            </div>
          ) : posts.length > 0 ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border bg-white p-8 text-center">
              <Tag className="mx-auto h-10 w-10 text-cyan-700" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-neutral-950">No hay publicaciones con estos filtros</h3>
              <p className="mt-2 text-sm text-neutral-600">Prueba cambiando la busqueda o el tipo de contenido.</p>
            </div>
          )}

          {lastPage > 1 ? (
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {page} de {lastPage}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((value) => Math.min(lastPage, value + 1))}>
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
