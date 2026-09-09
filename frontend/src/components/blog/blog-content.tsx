'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  accessibleBlogHtml,
  additionalPostMedia,
  blogDate,
  mediaUrlKey,
} from '@/lib/blog-utils';
import { BlogStatus } from './blog-ui';
import type { Post } from '@/types/blog';

export function BlogContent({ html }: { html: string }) {
  const previousFocus = useRef<HTMLImageElement | null>(null);
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);
  const markup = useMemo(() => ({ __html: accessibleBlogHtml(html) }), [html]);
  function open(target: EventTarget) {
    if (target instanceof HTMLImageElement) {
      previousFocus.current = target;
      setImage({ src: target.src, alt: target.alt });
    }
  }
  return (
    <>
      <div
        className="blog-content"
        onClick={(event) => {
          if (event.target instanceof HTMLImageElement) {
            event.preventDefault();
            open(event.target);
          }
        }}
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLImageElement &&
            ['Enter', ' '].includes(event.key)
          ) {
            event.preventDefault();
            open(event.target);
          }
        }}
        dangerouslySetInnerHTML={markup}
      />
      <Dialog
        open={!!image}
        onOpenChange={(open) => {
          if (!open) setImage(null);
        }}
      >
        <DialogContent
          closeLabel="Cerrar imagen"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            previousFocus.current?.focus();
          }}
          className="max-h-[95dvh] max-w-[96vw] overflow-auto sm:max-w-6xl"
        >
          <DialogTitle className="pr-6">Imagen completa</DialogTitle>
          <DialogDescription>
            {image?.alt || 'Fotografía de la publicación'}
          </DialogDescription>
          {image && (
            <img
              src={image.src}
              alt={image.alt}
              className="mx-auto max-h-[75dvh] max-w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PostPreview({
  post,
  privateView = false,
}: {
  post: Post;
  privateView?: boolean;
}) {
  const extra = additionalPostMedia(post);
  return (
    <article className="mx-auto w-full max-w-[1000px] space-y-6">
      <header className="mx-auto max-w-[760px] space-y-4">
        {privateView && (
          <p className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
            Vista previa privada. Esto no publica ni guarda cambios.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <BlogStatus status={post.status} />
          <span className="text-sm text-muted-foreground">
            {post.type === 'experience' ? 'Experiencia' : 'Artículo'}
          </span>
        </div>
        <h1 className="break-words text-3xl font-bold text-neutral-950 sm:text-4xl">
          {post.title || 'Título de tu historia'}
        </h1>
        {(post.summary || post.excerpt) && (
          <p className="whitespace-pre-line break-words leading-7 text-neutral-600">
            {post.summary || post.excerpt}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Por {post.author?.name || 'Autor'}
          {post.published_at ? ` · ${blogDate(post.published_at)}` : ''}
        </p>
        {post.type === 'experience' && (
          <p className="text-sm text-muted-foreground">
            {[
              post.travel_style,
              post.visit_date ? `Visita: ${blogDate(post.visit_date)}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </header>
      {post.featured_image && (
        <BlogContent
          html={`<img data-size="wide" src="${escapeAttribute(post.featured_image)}" alt="${escapeAttribute(post.media?.find((item) => mediaUrlKey(item.url) === mediaUrlKey(post.featured_image))?.alt || post.title)}">`}
        />
      )}
      <div className="mx-auto max-w-[760px]">
        <BlogContent
          html={
            post.body || '<p>El contenido de tu historia aparecerá aquí.</p>'
          }
        />
      </div>
      {(post.tags ?? []).length > 0 && (
        <div className="mx-auto flex max-w-[760px] flex-wrap gap-2">
          {post.tags?.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full border px-3 py-1 text-sm text-neutral-600"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      {extra.length > 0 && (
        <section className="mx-auto max-w-[760px] space-y-4">
          <h2 className="text-xl font-semibold">Más recuerdos del viaje</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {extra.map((item) =>
              item.type === 'video' ? (
                <video
                  key={item.id}
                  src={item.url}
                  controls
                  preload="metadata"
                  className="max-h-[360px] w-full rounded-lg bg-neutral-950 object-contain"
                />
              ) : (
                <BlogContent
                  key={item.id}
                  html={`<img src="${escapeAttribute(item.url)}" alt="${escapeAttribute(item.alt || post.title)}">`}
                />
              ),
            )}
          </div>
        </section>
      )}
    </article>
  );
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
