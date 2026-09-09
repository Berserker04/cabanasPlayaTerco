import type { Post, PostMedia, PostStatus } from '../types/blog';

export const postStatusLabels: Record<PostStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};
export const commentStatusLabels: Record<string, string> = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
};
export const imageSizes = {
  small: 'Pequeña',
  medium: 'Mediana',
  wide: 'Ancha',
} as const;
export const imageAlignments = {
  left: 'Izquierda',
  center: 'Centro',
  right: 'Derecha',
} as const;

export function blogDate(value?: string | null, includeTime = false) {
  if (!value) return 'Sin publicar';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? { hour: '2-digit' as const, minute: '2-digit' as const }
      : {}),
  }).format(date);
}

export function blogPlainText(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160|#xA0);/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\s\u200B]+/g, ' ')
    .trim();
}

export function validBlogLink(value: string): string | null {
  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function mediaUploadError(
  file: Pick<File, 'type' | 'size'>,
  count: number,
): string | null {
  if (count >= 20) return 'Cada blog puede tener hasta 20 archivos.';
  const images = ['image/jpeg', 'image/png', 'image/webp'];
  const videos = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (![...images, ...videos].includes(file.type))
    return 'Usa imágenes JPG, PNG o WebP, o videos MP4, MOV o WebM.';
  const video = videos.includes(file.type);
  if (file.size > (video ? 150 : 10) * 1024 * 1024)
    return video
      ? 'El video no puede superar 150 MB.'
      : 'La imagen no puede superar 10 MB.';
  return null;
}

export function additionalPostMedia(
  post: Pick<Post, 'body' | 'media' | 'featured_image'>,
): PostMedia[] {
  const decoded = (post.body ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
  const sources = new Set(
    [
      ...decoded.matchAll(
        /<(?:img|video|source)\b[^>]*?\bsrc=["']([^"']+)["']/gi,
      ),
    ].map((match) => mediaUrlKey(match[1])),
  );
  return (post.media ?? []).filter(
    (item) =>
      mediaUrlKey(item.url) !== mediaUrlKey(post.featured_image) &&
      !sources.has(mediaUrlKey(item.url)),
  );
}

export function mediaUrlKey(url?: string | null): string {
  try {
    return decodeURI(url ?? '');
  } catch {
    return url ?? '';
  }
}

// This decorates HTML already produced by Tiptap or sanitized by the API.
// Keep accessibility in the markup so rerenders cannot remove keyboard access.
export function accessibleBlogHtml(html: string): string {
  return html.replace(/<img\b([^>]*?)>/gi, (_match, attributes: string) => {
    const alt =
      attributes.match(/\balt=(["'])(.*?)\1/i)?.[2] || 'Foto del blog';
    const clean = attributes
      .replace(/\/\s*$/, '')
      .replace(/\s+(?:role|tabindex|loading|aria-label)=(["']).*?\1/gi, '');
    return `<img${clean} role="button" tabindex="0" loading="lazy" aria-label="Ampliar imagen: ${alt.replace(/"/g, '&quot;').replace(/</g, '&lt;')}">`;
  });
}

export function blogQuery(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '' && value !== 'all')
      params.set(key, String(value));
  }
  return params.toString() ? `?${params}` : '';
}

export function safeBlogReturn(value: string | null): string {
  if (!value) return '/blog';
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin === 'https://local.invalid' && url.pathname === '/blog')
      return url.pathname + url.search;
  } catch {
    /* Use the public list. */
  }
  return '/blog';
}
