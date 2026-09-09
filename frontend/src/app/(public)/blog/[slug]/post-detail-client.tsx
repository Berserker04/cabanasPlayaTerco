'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import { blogDate, safeBlogReturn } from '@/lib/blog-utils';
import { invalidateBlog } from '@/lib/blog-queries';
import { PostPreview } from '@/components/blog/blog-content';
import { BlogError, BlogLoading } from '@/components/blog/blog-ui';
import type { ApiResponse } from '@/types/api';
import type { Comment, Post } from '@/types/blog';

export function PostDetailClient({ slug }: { slug: string }) {
  const client = useQueryClient();
  const params = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [error, setError] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const postQuery = useQuery({
    queryKey: ['post', slug],
    queryFn: () => api.get<ApiResponse<Post>>(`/posts/${slug}`),
    retry: 1,
  });
  const post = postQuery.data?.data;
  const commentMutation = useMutation({
    mutationFn: async () => {
      await fetchCsrfCookie();
      return api.post<ApiResponse<Comment>>(`/posts/${post!.id}/comments`, {
        body: body.trim(),
        parent_id: replyTo?.id ?? null,
      });
    },
    onSuccess: async () => {
      setBody('');
      setReplyTo(null);
      setError('');
      toast.success('Comentario publicado.');
      await invalidateBlog(client);
    },
    onError: (error) =>
      setError(
        error instanceof ApiError
          ? Object.values(error.errors ?? {})
              .flat()
              .join(' ') || error.message
          : 'No pudimos publicar. Conservamos tu comentario para que reintentes.',
      ),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (commentMutation.isPending) return;
    if (body.trim().length < 3) {
      setError('Escribe al menos 3 caracteres.');
      input.current?.focus();
      return;
    }
    setError('');
    commentMutation.mutate();
  }
  function reply(comment: Comment) {
    setReplyTo(comment);
    input.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    input.current?.focus({ preventScroll: true });
  }
  const back = (
    <Button asChild variant="ghost">
      <Link href={safeBlogReturn(params.get('from'))}>
        <ArrowLeft />
        Volver al blog
      </Link>
    </Button>
  );
  if (postQuery.isLoading)
    return (
      <div className="mx-auto max-w-5xl p-6">
        <BlogLoading />
      </div>
    );
  if (!post)
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-12">
        {back}
        {postQuery.error instanceof ApiError &&
        postQuery.error.status === 404 ? (
          <p className="rounded-lg border p-8 text-center">
            Esta publicación no existe o ya no está disponible.
          </p>
        ) : (
          <BlogError
            retry={() => void postQuery.refetch()}
            message="No pudimos cargar esta publicación. Intenta de nuevo."
          />
        )}
      </div>
    );
  const comments = post.comments ?? [];
  const count =
    post.comments_count ??
    comments.reduce((n, comment) => n + 1 + (comment.replies?.length ?? 0), 0);
  return (
    <div className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {back}
        <div className="mt-6 rounded-xl border bg-white p-4 sm:p-8">
          <PostPreview post={post} />
        </div>
        <section
          className="mx-auto mt-10 max-w-[760px] space-y-5 pb-8"
          aria-labelledby="comments-heading"
        >
          <h2
            id="comments-heading"
            className="flex items-center gap-2 text-2xl font-bold"
          >
            <MessageCircle className="size-5 text-cyan-700" />
            Comentarios <span className="text-neutral-500">({count})</span>
          </h2>
          {!isLoading &&
            (isAuthenticated ? (
              <form
                onSubmit={submit}
                className="space-y-3 rounded-lg border bg-white p-4 sm:p-5"
              >
                {replyTo && (
                  <div className="rounded-md border-l-4 border-cyan-600 bg-cyan-50 p-3 text-sm text-cyan-950">
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        Respondiendo a{' '}
                        {replyTo.author_name || replyTo.user?.name}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={commentMutation.isPending}
                        onClick={() => setReplyTo(null)}
                      >
                        Cancelar respuesta
                      </Button>
                    </div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-line break-words">
                      {replyTo.body}
                    </p>
                  </div>
                )}
                <Label htmlFor="blog-comment">
                  {replyTo ? 'Tu respuesta' : 'Comparte un comentario'}
                </Label>
                <Textarea
                  ref={input}
                  id="blog-comment"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  disabled={commentMutation.isPending}
                  aria-invalid={!!error}
                  aria-describedby="blog-comment-error"
                  placeholder="Una pregunta, recomendación o recuerdo de tu visita…"
                />
                {error && (
                  <p
                    id="blog-comment-error"
                    role="alert"
                    className="text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Tu comentario se publicará inmediatamente.
                  </p>
                  <Button
                    disabled={commentMutation.isPending}
                    className="bg-cyan-700 text-white hover:bg-cyan-800"
                  >
                    {commentMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Send />
                    )}
                    {replyTo ? 'Publicar respuesta' : 'Comentar'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-lg border bg-white p-5">
                <p className="text-sm text-neutral-600">
                  Inicia sesión para comentar o responder.
                </p>
                <Button asChild className="mt-3">
                  <Link
                    href={`/login?next=${encodeURIComponent('/blog/' + post.slug + '#comments-heading')}`}
                  >
                    Iniciar sesión
                  </Link>
                </Button>
              </div>
            ))}
          {comments.length ? (
            comments.map((comment) => (
              <article
                key={comment.id}
                id={`comentario-${comment.id}`}
                className="scroll-mt-24 rounded-lg border bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {comment.author_name || comment.user?.name || 'Viajero'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {blogDate(comment.created_at, true)}
                    </p>
                  </div>
                  {isAuthenticated && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => reply(comment)}
                    >
                      Responder
                    </Button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-7">
                  {comment.body}
                </p>
                {!!comment.replies?.length && (
                  <div className="mt-4 space-y-3 border-l-2 border-cyan-100 pl-3 sm:pl-5">
                    {comment.replies.map((response) => (
                      <div
                        key={response.id}
                        id={`comentario-${response.id}`}
                        className="scroll-mt-24 rounded-md bg-stone-50 p-3"
                      >
                        <p className="text-sm font-medium">
                          {response.author_name ||
                            response.user?.name ||
                            'Viajero'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {blogDate(response.created_at, true)}
                        </p>
                        <p className="mt-2 whitespace-pre-line break-words text-sm leading-7">
                          {response.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))
          ) : (
            <p className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
              Sé el primero en comentar esta historia.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
