'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { LoaderCircle, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/blog/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import type { Post, PostMedia, PostStatus, PostType } from '@/types/blog';

export type PostFormPayload = {
  title: string;
  excerpt: string | null;
  summary: string | null;
  body: string;
  featured_image?: string | null;
  cover_media_id?: number | null;
  visit_date: string | null;
  travel_style: string | null;
  media_ids: number[];
  tag_names: string[];
  type?: PostType;
  status?: PostStatus;
  published_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

type Props = {
  initialPost?: Post | null;
  showAdminFields?: boolean;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (payload: PostFormPayload) => void;
  onCancel?: () => void;
};

function tagsToText(post?: Post | null) {
  return (post?.tags ?? []).map((tag) => tag.name).join(', ');
}

function maxDateToday() {
  return new Date().toISOString().slice(0, 10);
}

export function PostForm({
  initialPost,
  showAdminFields = false,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const initialMedia = useMemo(() => initialPost?.media ?? [], [initialPost?.media]);
  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? '');
  const [summary, setSummary] = useState(initialPost?.summary ?? '');
  const [body, setBody] = useState(initialPost?.body ?? '');
  const [visitDate, setVisitDate] = useState(initialPost?.visit_date?.slice(0, 10) ?? '');
  const [travelStyle, setTravelStyle] = useState(initialPost?.travel_style ?? '');
  const [tags, setTags] = useState(tagsToText(initialPost));
  const [type, setType] = useState<PostType>(initialPost?.type ?? (showAdminFields ? 'article' : 'experience'));
  const [status, setStatus] = useState<PostStatus>(initialPost?.status ?? 'published');
  const [media, setMedia] = useState<PostMedia[]>(initialMedia);
  const [coverMediaId, setCoverMediaId] = useState<number | null>(() => {
    const cover = initialMedia.find((item) => item.url === initialPost?.featured_image) ?? initialMedia.find((item) => item.type === 'image');
    return cover?.id ?? null;
  });
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  async function uploadMedia(file: File): Promise<PostMedia> {
    if (media.length >= 20) {
      throw new Error('media-limit');
    }

    const payload = new FormData();
    payload.append('file', file);
    payload.append('alt', title || 'Multimedia del blog');

    await fetchCsrfCookie();
    const response = await api.post<{ data: PostMedia; message?: string }>('/me/posts/media', payload);
    setMedia((current) => [...current, response.data]);

    return response.data;
  }

  async function handleCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('La portada debe ser una imagen.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La portada no puede superar 10 MB.');
      return;
    }

    setIsUploadingCover(true);

    try {
      const uploaded = await uploadMedia(file);
      setCoverMediaId(uploaded.id);
      toast.success('Portada subida.');
    } catch (error) {
      toast.error('No pudimos subir la portada', {
        description: error instanceof ApiError ? error.message : 'Intentalo de nuevo.',
      });
    } finally {
      setIsUploadingCover(false);
    }
  }

  function removeMedia(mediaId: number) {
    setMedia((current) => current.filter((item) => item.id !== mediaId));
    setCoverMediaId((current) => (current === mediaId ? null : current));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    if (title.trim().length < 5) {
      toast.error('Escribe un titulo mas claro.');
      return;
    }

    if (trimmedBody.length < 20) {
      toast.error('El contenido debe tener al menos 20 caracteres.');
      return;
    }

    onSubmit({
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      summary: summary.trim() || null,
      body,
      featured_image: initialPost?.featured_image ?? null,
      cover_media_id: coverMediaId,
      visit_date: visitDate || null,
      travel_style: travelStyle.trim() || null,
      media_ids: media.map((item) => item.id),
      tag_names: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      type,
      status,
      published_at: status === 'published' ? initialPost?.published_at ?? new Date().toISOString() : initialPost?.published_at ?? null,
      meta_title: title.trim(),
      meta_description: summary.trim() || excerpt.trim() || null,
    });
  }

  const cover = media.find((item) => item.id === coverMediaId);
  const coverUrl = cover?.url ?? initialPost?.featured_image ?? null;

  return (
    <form onSubmit={submit} className="grid gap-5">
      {showAdminFields ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as PostType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="experience">Experiencia</SelectItem>
                <SelectItem value="article">Articulo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as PostStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="blog-title">Titulo</Label>
          <Input id="blog-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blog-visit-date">Fecha de visita</Label>
          <Input id="blog-visit-date" type="date" max={maxDateToday()} value={visitDate} onChange={(event) => setVisitDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blog-travel-style">Tipo de viaje</Label>
          <Input id="blog-travel-style" value={travelStyle} onChange={(event) => setTravelStyle(event.target.value)} placeholder="Familia, pareja, amigos..." />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-summary">Resumen destacado</Label>
        <Textarea id="blog-summary" rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={1200} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-excerpt">Extracto para tarjetas</Label>
        <Textarea id="blog-excerpt" rows={2} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} maxLength={500} />
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <Label htmlFor="blog-cover">Portada</Label>
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-stone-50 text-center text-sm text-muted-foreground transition hover:border-cyan-500 hover:bg-cyan-50/50">
            {coverUrl ? (
              <img src={coverUrl} alt={cover?.alt ?? 'Portada del blog'} className="h-full w-full rounded-lg object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 px-4">
                {isUploadingCover ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                Subir portada
              </span>
            )}
            <input id="blog-cover" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCover} />
          </label>
        </div>
        <div className="space-y-2">
          <Label>Contenido</Label>
          <RichTextEditor value={body} onChange={setBody} onUploadMedia={uploadMedia} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-tags">Etiquetas</Label>
        <Input id="blog-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="playa, descanso, familia" />
      </div>

      {media.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {media.map((item) => (
            <div key={item.id} className="rounded-lg border bg-white p-2">
              {item.type === 'video' ? (
                <video src={item.url} className="aspect-video w-full rounded-md bg-neutral-950 object-cover" controls />
              ) : (
                <img src={item.url} alt={item.alt ?? 'Multimedia del blog'} className="aspect-video w-full rounded-md object-cover" />
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <Button type="button" size="xs" variant={coverMediaId === item.id ? 'default' : 'outline'} disabled={item.type !== 'image'} onClick={() => setCoverMediaId(item.id)}>
                  Portada
                </Button>
                <Button type="button" size="icon-xs" variant="ghost" aria-label="Quitar archivo" onClick={() => removeMedia(item.id)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" className="bg-cyan-700 text-white hover:bg-cyan-800" disabled={isSubmitting || isUploadingCover}>
          {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
