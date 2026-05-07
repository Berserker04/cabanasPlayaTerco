'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import type { ApiResponse } from '@/types/api';
import type { Comment, Post } from '@/types/blog';

function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply: (comment: Comment) => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-950">{comment.author_name ?? comment.user?.name ?? 'Turista'}</p>
          <p className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => onReply(comment)}>
          Responder
        </Button>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">{comment.body}</p>
      {(comment.replies ?? []).length > 0 ? (
        <div className="mt-4 space-y-3 border-l pl-4">
          {(comment.replies ?? []).map((reply) => (
            <div key={reply.id} className="rounded-md bg-stone-50 p-3">
              <p className="text-sm font-medium text-neutral-950">{reply.author_name ?? reply.user?.name ?? 'Turista'}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-neutral-700">{reply.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PostDetailClient({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const postQuery = useQuery({
    queryKey: ['post', slug],
    queryFn: () => api.get<ApiResponse<Post>>(`/posts/${slug}`),
    retry: 1,
  });

  const post = postQuery.data?.data;

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!post) {
        throw new Error('missing-post');
      }

      await fetchCsrfCookie();
      return api.post<ApiResponse<Comment>>(`/posts/${post.id}/comments`, {
        body: body.trim(),
        parent_id: replyTo?.id ?? null,
      });
    },
    onSuccess: (response) => {
      setBody('');
      setReplyTo(null);
      toast.success(response.message ?? 'Comentario publicado.');
      void queryClient.invalidateQueries({ queryKey: ['post', slug] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      toast.error('No pudimos publicar el comentario', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    },
  });

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (body.trim().length < 3) {
      toast.error('Escribe un comentario un poco mas completo.');
      return;
    }

    commentMutation.mutate();
  }

  if (postQuery.isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <LoaderCircle className="h-6 w-6 animate-spin text-cyan-700" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Button asChild variant="outline">
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4" />
            Volver al blog
          </Link>
        </Button>
        <div className="mt-8 rounded-lg border bg-white p-8 text-center">No encontramos esta publicacion.</div>
      </div>
    );
  }

  const comments = post.comments ?? [];

  return (
    <article className="bg-stone-50">
      <section className="bg-white">
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/blog">
              <ArrowLeft className="h-4 w-4" />
              Volver al blog
            </Link>
          </Button>
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={post.type === 'experience' ? 'border-cyan-200 bg-cyan-50 text-cyan-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}>
                {post.type_label}
              </Badge>
              {post.travel_style ? <Badge variant="outline">{post.travel_style}</Badge> : null}
              <span className="text-sm text-muted-foreground">{formatDate(post.published_at ?? post.created_at)}</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal text-neutral-950 sm:text-5xl">{post.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-600">
              {post.summary || post.excerpt || 'Una historia compartida desde Playa Terco.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Por {post.author?.name ?? 'Cabanas Playa Terco'}</span>
              {post.visit_date ? <span>Visita: {formatDate(post.visit_date)}</span> : null}
            </div>
          </div>
        </div>
      </section>

      {post.featured_image ? (
        <section className="bg-white">
          <div className="container mx-auto px-4 pb-8">
            <img src={post.featured_image} alt={post.title} className="mx-auto aspect-[16/8] w-full max-w-5xl rounded-lg object-cover shadow-sm" />
          </div>
        </section>
      ) : null}

      <section className="py-10">
        <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 rounded-lg border bg-white p-5 shadow-sm sm:p-8">
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.body ?? '' }} />
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Detalles</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Autor</dt>
                  <dd className="text-right font-medium">{post.author?.name ?? 'Cabanas Playa Terco'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Comentarios</dt>
                  <dd className="font-medium">{comments.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Multimedia</dt>
                  <dd className="font-medium">{post.media_count}</dd>
                </div>
              </dl>
              {(post.tags ?? []).length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {(post.tags ?? []).map((tag) => (
                    <Badge key={tag.id} variant="outline">{tag.name}</Badge>
                  ))}
                </div>
              ) : null}
            </div>

            {(post.media ?? []).length > 0 ? (
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Galeria</p>
                <div className="mt-4 grid gap-3">
                  {(post.media ?? []).map((item) => (
                    item.type === 'video' ? (
                      <video key={item.id} src={item.url} controls className="aspect-video w-full rounded-md bg-neutral-950 object-cover" />
                    ) : (
                      <img key={item.id} src={item.url} alt={item.alt ?? post.title} className="aspect-video w-full rounded-md object-cover" />
                    )
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="pb-12">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-cyan-700" />
            <h2 className="text-2xl font-bold tracking-normal text-neutral-950">Comentarios</h2>
          </div>

          {isLoading ? null : isAuthenticated ? (
            <form onSubmit={submitComment} className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
              {replyTo ? (
                <div className="mb-3 flex items-center justify-between rounded-md bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
                  Respondiendo a {replyTo.author_name}
                  <Button type="button" size="xs" variant="ghost" onClick={() => setReplyTo(null)}>
                    Quitar
                  </Button>
                </div>
              ) : null}
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} placeholder="Comparte una pregunta, recomendacion o recuerdo..." />
              <Button type="submit" className="mt-3 bg-cyan-700 text-white hover:bg-cyan-800" disabled={commentMutation.isPending}>
                {commentMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Comentar
              </Button>
            </form>
          ) : (
            <div className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
              <p className="text-sm text-neutral-600">Inicia sesion para comentar esta experiencia.</p>
              <Button asChild className="mt-3 bg-cyan-700 text-white hover:bg-cyan-800">
                <Link href={`/login?next=/blog/${post.slug}`}>Iniciar sesion</Link>
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} onReply={setReplyTo} />
              ))
            ) : (
              <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
                Se el primero en comentar este blog.
              </div>
            )}
          </div>
        </div>
      </section>
    </article>
  );
}
