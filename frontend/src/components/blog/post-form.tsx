'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import type { Editor } from '@tiptap/core';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  FileText,
  ImagePlus,
  LoaderCircle,
  Save,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RichTextEditor,
  removeEditorMedia,
  updateEditorAlt,
} from './rich-text-editor';
import { PostPreview } from './blog-content';
import { BlogStatus } from './blog-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useConfirm } from '@/providers/confirmation-provider';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import {
  blogDate,
  blogPlainText,
  mediaUploadError,
  mediaUrlKey,
} from '@/lib/blog-utils';
import type {
  BlogCategory,
  Post,
  PostMedia,
  PostStatus,
  PostType,
} from '@/types/blog';

export type PostFormPayload = {
  title: string;
  summary: string | null;
  excerpt: string | null;
  body: string;
  featured_image?: string | null;
  cover_media_id?: number | null;
  visit_date: string | null;
  travel_style: string | null;
  media_ids: number[];
  media_alt: Record<number, string | null>;
  tag_names: string[];
  category_ids: number[];
  status: PostStatus;
  type: PostType;
  meta_title?: string | null;
  meta_description?: string | null;
};

type Props = {
  initialPost?: Post | null;
  admin?: boolean;
  onSave: (payload: PostFormPayload, id?: number) => Promise<Post>;
  onClose: () => void;
  registerClose: (handler: () => Promise<void>) => void;
};

export function PostForm({
  initialPost,
  admin = false,
  onSave,
  onClose,
  registerClose,
}: Props) {
  const confirm = useConfirm();
  const [saved, setSaved] = useState(initialPost ?? null);
  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [body, setBody] = useState(initialPost?.body ?? '');
  const [summary, setSummary] = useState(initialPost?.summary ?? '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? '');
  const [visitDate, setVisitDate] = useState(
    initialPost?.visit_date?.slice(0, 10) ?? '',
  );
  const [travelStyle, setTravelStyle] = useState(
    initialPost?.travel_style ?? '',
  );
  const [tags, setTags] = useState(
    initialPost?.tags?.map((t) => t.name).join(', ') ?? '',
  );
  const [categoryIds, setCategoryIds] = useState(
    initialPost?.categories?.map((c) => c.id) ?? [],
  );
  const [metaTitle, setMetaTitle] = useState(initialPost?.meta_title ?? '');
  const [metaDescription, setMetaDescription] = useState(
    initialPost?.meta_description ?? '',
  );
  const [type, setType] = useState<PostType>(
    initialPost?.type ?? (admin ? 'article' : 'experience'),
  );
  const [media, setMedia] = useState<PostMedia[]>(initialPost?.media ?? []);
  const [coverId, setCoverId] = useState<number | null>(
    initialPost?.cover_media_id ??
      initialPost?.media?.find((m) => m.url === initialPost.featured_image)
        ?.id ??
      null,
  );
  const [legacyCover, setLegacyCover] = useState(
    initialPost?.featured_image &&
      !initialPost?.media?.some((m) => m.url === initialPost.featured_image)
      ? initialPost.featured_image
      : null,
  );
  const [dirty, setDirty] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState('');
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(
    initialPost?.updated_at ?? null,
  );
  const [failedUpload, setFailedUpload] = useState<{
    file: File;
    intent: 'cover' | 'insert' | 'library';
  } | null>(null);
  const editor = useRef<Editor | null>(null);
  const operation = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLElement>(null);
  const uploadIntent = useRef<'cover' | 'insert' | 'library'>('library');
  const temporary = useRef(new Set<number>());
  const status = saved?.status ?? 'draft';
  const cover = media.find((item) => item.id === coverId);
  const coverUrl = cover?.url || legacyCover;
  const categories = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => api.get<{ data: BlogCategory[] }>('/categories'),
    enabled: admin,
  });
  const ready = useCallback((instance: Editor) => {
    editor.current = instance;
  }, []);
  const changeBody = useCallback((html: string) => {
    setBody(html);
    setDirty(true);
  }, []);
  const altChanged = useCallback((url: string, alt: string) => {
    setMedia((current) =>
      current.map((item) =>
        mediaUrlKey(item.url) === mediaUrlKey(url) ? { ...item, alt } : item,
      ),
    );
    setDirty(true);
  }, []);

  const cleanup = useCallback(async () => {
    if (!temporary.current.size) return;
    await fetchCsrfCookie();
    const ids = [...temporary.current];
    const results = await Promise.allSettled(
      ids.map((id) => api.delete(`/me/posts/media/${id}`)),
    );
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') temporary.current.delete(ids[index]);
    });
    if (results.some((result) => result.status === 'rejected'))
      throw new Error(
        'No pudimos retirar todas las cargas temporales. Intenta cerrar de nuevo.',
      );
  }, []);

  const prepareToLeave = useCallback(async () => {
    if (operation.current) return false;
    if (
      dirty &&
      !(await confirm(
        'Tienes cambios sin guardar. ¿Salir y descartar estos cambios y las cargas nuevas?',
      ))
    )
      return false;
    operation.current = true;
    setBusy(true);
    setBusyText('Cerrando…');
    try {
      await cleanup();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No pudimos cerrar el editor.',
      );
      return false;
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }, [dirty, confirm, cleanup]);
  useUnsavedChanges(dirty || busy, prepareToLeave);
  const requestClose = useCallback(async () => {
    if (await prepareToLeave()) onClose();
  }, [prepareToLeave, onClose]);
  useEffect(() => {
    registerClose(requestClose);
  }, [registerClose, requestClose]);

  function focusError(values: Record<string, string>) {
    setPreview(false);
    setErrors(values);
    requestAnimationFrame(() => {
      const key = Object.keys(values)[0];
      const target =
        form.current?.querySelector<HTMLElement>(`[data-field="${key}"]`) ??
        form.current?.querySelector<HTMLElement>('[data-field="form"]');
      const details = target?.closest('details');
      if (details) details.open = true;
      target?.scrollIntoView({ block: 'center' });
      if (key === 'body') editor.current?.commands.focus();
      else target?.focus();
    });
  }

  function insert(item: PostMedia) {
    if (!editor.current) return;
    if (item.type === 'image')
      editor.current
        .chain()
        .focus()
        .insertContent([
          {
            type: 'image',
            attrs: {
              src: item.url,
              alt: item.alt || '',
              size: 'medium',
              align: 'center',
            },
          },
          { type: 'paragraph' },
        ])
        .run();
    else
      editor.current
        .chain()
        .focus()
        .insertContent([
          { type: 'video', attrs: { src: item.url } },
          { type: 'paragraph' },
        ])
        .run();
  }

  async function upload(file: File, intent: 'cover' | 'insert' | 'library') {
    if (operation.current) return;
    const problem = mediaUploadError(file, media.length);
    if (problem || (intent === 'cover' && !file.type.startsWith('image/'))) {
      focusError({
        media_ids: problem || 'La portada debe ser una imagen.',
      });
      return;
    }
    operation.current = true;
    setBusy(true);
    setBusyText(`Subiendo ${file.name}…`);
    setFailedUpload(null);
    setErrors((current) => ({ ...current, media_ids: '' }));
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('alt', '');
      await fetchCsrfCookie();
      const result = await api.post<{ data: PostMedia }>(
        '/me/posts/media',
        payload,
      );
      temporary.current.add(result.data.id);
      setMedia((current) => [...current, result.data]);
      setDirty(true);
      if (intent === 'cover') {
        setCoverId(result.data.id);
        setLegacyCover(null);
      }
      if (intent === 'insert') insert(result.data);
    } catch (error) {
      setFailedUpload({ file, intent });
      focusError({
        media_ids:
          error instanceof ApiError
            ? Object.values(error.errors ?? {})
                .flat()
                .join(' ') || error.message
            : 'No pudimos subir el archivo. Revisa tu conexión y reintenta.',
      });
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  function pick(intent: 'cover' | 'insert' | 'library') {
    uploadIntent.current = intent;
    if (fileInput.current) {
      fileInput.current.accept =
        intent === 'cover'
          ? 'image/jpeg,image/png,image/webp'
          : 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm';
      fileInput.current.click();
    }
  }
  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void upload(file, uploadIntent.current);
  }

  async function remove(item: PostMedia) {
    if (operation.current) return;
    if (
      !(await confirm(
        '¿Retirar este archivo del blog? Se quitará también del contenido y de la portada si está en uso. El cambio se aplicará al guardar.',
      ))
    )
      return;
    removeEditorMedia(editor.current, item.url);
    setMedia((current) => current.filter((m) => m.id !== item.id));
    if (coverId === item.id) setCoverId(null);
    setDirty(true);
  }

  async function submit(nextStatus: PostStatus) {
    if (operation.current) return;
    const fieldErrors: Record<string, string> = {};
    if (title.trim().length < (nextStatus === 'published' ? 5 : 1))
      fieldErrors.title =
        nextStatus === 'published'
          ? 'Escribe al menos 5 caracteres para publicar.'
          : 'Escribe un título para guardar.';
    if (
      nextStatus === 'published' &&
      (editor.current?.getText().trim().length ?? blogPlainText(body).length) <
        20
    )
      fieldErrors.body =
        'Escribe al menos 20 caracteres de contenido para publicar.';
    const names = [
      ...new Set(
        tags
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    ];
    if (names.length > 12 || names.some((name) => name.length > 40))
      fieldErrors.tag_names = 'Usa hasta 12 etiquetas de máximo 40 caracteres.';
    if (Object.keys(fieldErrors).length) {
      focusError(fieldErrors);
      return;
    }
    operation.current = true;
    setBusy(true);
    setBusyText('Guardando…');
    try {
      if (
        nextStatus === 'published' &&
        !(await confirm(
          status === 'published'
            ? `¿Guardar los cambios de «${title.trim()}»? Se verán inmediatamente en la publicación.`
            : `¿Publicar «${title.trim()}»? Cualquier visitante podrá leer el contenido y ver sus archivos.`,
        ))
      )
        return;
      const payload: PostFormPayload = {
        title: title.trim(),
        summary: summary.trim() || null,
        excerpt: excerpt.trim() || null,
        body: editor.current?.getHTML() ?? body,
        status: nextStatus,
        type,
        visit_date: type === 'experience' ? visitDate || null : null,
        travel_style: type === 'experience' ? travelStyle.trim() || null : null,
        ...(legacyCover
          ? { featured_image: legacyCover }
          : { cover_media_id: coverId }),
        media_ids: media.map((item) => item.id),
        media_alt: Object.fromEntries(media.map((item) => [item.id, item.alt])),
        tag_names: names,
        category_ids: categoryIds,
        ...(admin
          ? {
              meta_title: metaTitle.trim() || null,
              meta_description: metaDescription.trim() || null,
            }
          : {}),
      };
      const result = await onSave(payload, saved?.id);
      result.media?.forEach((item) => temporary.current.delete(item.id));
      setSaved(result);
      // Start a fresh undo history so removed files cannot be restored after saving.
      setEditorRevision((revision) => revision + 1);
      setTitle(result.title);
      setBody(result.body ?? '');
      setSummary(result.summary ?? '');
      setExcerpt(result.excerpt ?? '');
      setMetaTitle(result.meta_title ?? '');
      setMetaDescription(result.meta_description ?? '');
      setMedia(result.media ?? []);
      setCoverId(result.cover_media_id ?? null);
      setDirty(false);
      setErrors({});
      setSavedAt(result.updated_at ?? new Date().toISOString());
      toast.success(
        nextStatus === 'draft' ? 'Borrador guardado.' : 'Cambios guardados.',
      );
      try {
        await cleanup();
      } catch {
        toast.message(
          'Guardado. Quedan cargas descartadas por limpiar; se reintentará al cerrar.',
        );
      }
    } catch (error) {
      const values =
        error instanceof ApiError && error.errors
          ? Object.fromEntries(
              Object.entries(error.errors).map(([key, messages]) => [
                key.split('.')[0],
                messages.join(' '),
              ]),
            )
          : {
              form:
                error instanceof Error
                  ? error.message
                  : 'No pudimos guardar. Intenta de nuevo.',
            };
      focusError(values);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  const previewPost = {
    ...saved,
    title,
    summary,
    excerpt,
    body,
    featured_image: coverUrl,
    type,
    status,
    media,
    visit_date: visitDate,
    travel_style: travelStyle,
    tags: tags
      .split(',')
      .filter((t) => t.trim())
      .map((name, id) => ({
        id,
        name: name.trim(),
        slug: name.trim(),
        description: null,
      })),
  } as Post;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const error = (key: string) =>
    errors[key] ? (
      <p id={`blog-error-${key}`} role="alert" className="text-sm text-red-700">
        {errors[key]}
      </p>
    ) : null;
  return (
    <form
      ref={form}
      className="flex h-full min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(status);
      }}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b bg-white px-4 py-4 sm:px-6">
        <div className="min-w-0 space-y-2">
          <DialogTitle>
            {saved
              ? 'Editar publicación'
              : admin
                ? 'Crear artículo'
                : 'Crear blog de experiencia'}
          </DialogTitle>
          <DialogDescription>
            {status === 'archived'
              ? 'Archivado por administración. Puedes editarlo; seguirá sin estar visible.'
              : status === 'published'
                ? 'Los cambios se harán públicos al guardar.'
                : 'Guarda tus avances y publica cuando tu historia esté lista.'}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <BlogStatus status={status} />
            <span role="status" className="break-all">
              {busy
                ? busyText
                : dirty
                  ? 'Cambios sin guardar'
                  : savedAt
                    ? `Guardado: ${blogDate(savedAt, true)}`
                    : 'Puedes guardar un borrador'}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cerrar editor"
          disabled={busy}
          onClick={() => void requestClose()}
        >
          <X />
        </Button>
      </header>
      <div
        className="flex shrink-0 gap-2 border-b bg-white px-4 py-2"
        role="group"
        aria-label="Modo del editor"
      >
        <Button
          type="button"
          size="sm"
          variant={!preview ? 'secondary' : 'ghost'}
          aria-pressed={!preview}
          onClick={() => setPreview(false)}
        >
          <FileText />
          Escribir
        </Button>
        <Button
          type="button"
          size="sm"
          variant={preview ? 'secondary' : 'ghost'}
          aria-pressed={preview}
          onClick={() => setPreview(true)}
        >
          <Eye />
          Vista previa
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-stone-50 p-4 sm:p-6">
        {preview && (
          <div className="rounded-lg border bg-white p-4 sm:p-8">
            <PostPreview post={previewPost} privateView />
          </div>
        )}
        <div hidden={preview}>
          <div tabIndex={-1} data-field="form" className="mb-3">
            {error('form')}
            {error('status')}
          </div>
          <fieldset
            disabled={busy}
            className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
          >
            <div className="min-w-0 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="blog-title">
                  Título{' '}
                  <span className="text-muted-foreground">(obligatorio)</span>
                </Label>
                <Input
                  id="blog-title"
                  data-field="title"
                  value={title}
                  maxLength={255}
                  aria-invalid={!!errors.title}
                  aria-describedby="blog-error-title"
                  placeholder="Un recuerdo que vale la pena compartir"
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                />
                {error('title')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-summary">
                  Resumen{' '}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="blog-summary"
                  data-field="summary"
                  value={summary}
                  maxLength={1200}
                  rows={3}
                  placeholder="Adelanta lo mejor de tu historia. Si lo dejas vacío, lo generaremos desde el contenido."
                  onChange={(e) => {
                    setSummary(e.target.value);
                    setDirty(true);
                  }}
                />
                {error('summary')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-body">Contenido</Label>
                <div
                  tabIndex={-1}
                  data-field="body"
                  aria-describedby="blog-error-body"
                >
                  <RichTextEditor
                    key={editorRevision}
                    value={body}
                    onChange={changeBody}
                    onReady={ready}
                    disabled={busy}
                    onAltChange={altChanged}
                    onUpload={() => pick('insert')}
                    onLibrary={() => {
                      library.current?.scrollIntoView({
                        block: 'start',
                        behavior: 'smooth',
                      });
                      library.current?.focus();
                    }}
                  />
                </div>
                {error('body')}
                <p className="text-xs text-muted-foreground">
                  Selecciona una imagen para cambiar su tamaño, alineación o
                  descripción. {blogPlainText(body).length} caracteres de texto.
                </p>
              </div>
            </div>
            <aside className="min-w-0 space-y-5">
              {admin && (
                <label className="grid gap-2 text-sm font-medium">
                  Tipo de publicación
                  <select
                    className="h-10 w-full rounded-md border bg-white px-3"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as PostType);
                      setDirty(true);
                    }}
                  >
                    <option value="article">Artículo</option>
                    <option value="experience">Experiencia</option>
                  </select>
                </label>
              )}
              <section className="space-y-3 rounded-lg border bg-white p-4">
                <h3 className="font-semibold">Portada</h3>
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={cover?.alt || 'Portada seleccionada'}
                    className="max-h-44 w-full rounded-md object-contain"
                  />
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Elige una foto para presentar tu historia en el listado.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => pick('cover')}
                >
                  <ImagePlus />
                  {coverUrl ? 'Cambiar portada' : 'Subir portada'}
                </Button>
                {coverUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setCoverId(null);
                      setLegacyCover(null);
                      setDirty(true);
                    }}
                  >
                    Quitar portada
                  </Button>
                )}
                {error('cover_media_id')}
                {error('featured_image')}
              </section>
              {type === 'experience' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="blog-visit-date">Fecha de visita</Label>
                    <Input
                      id="blog-visit-date"
                      data-field="visit_date"
                      type="date"
                      max={today}
                      value={visitDate}
                      onChange={(e) => {
                        setVisitDate(e.target.value);
                        setDirty(true);
                      }}
                    />
                    {error('visit_date')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blog-travel-style">Tipo de viaje</Label>
                    <Input
                      id="blog-travel-style"
                      data-field="travel_style"
                      maxLength={80}
                      value={travelStyle}
                      placeholder="Familia, pareja, amigos…"
                      onChange={(e) => {
                        setTravelStyle(e.target.value);
                        setDirty(true);
                      }}
                    />
                    {error('travel_style')}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="blog-tags">Etiquetas</Label>
                <Input
                  id="blog-tags"
                  data-field="tag_names"
                  value={tags}
                  placeholder="playa, descanso, familia"
                  onChange={(e) => {
                    setTags(e.target.value);
                    setDirty(true);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Hasta 12, separadas por comas.
                </p>
                {error('tag_names')}
              </div>
              <details className="rounded-lg border bg-white p-4">
                <summary className="cursor-pointer font-medium">
                  Opciones adicionales
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="blog-excerpt">Extracto del listado</Label>
                    <Textarea
                      id="blog-excerpt"
                      data-field="excerpt"
                      rows={3}
                      maxLength={500}
                      value={excerpt}
                      onChange={(e) => {
                        setExcerpt(e.target.value);
                        setDirty(true);
                      }}
                    />
                    {error('excerpt')}
                  </div>
                  {admin && (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Categorías</p>
                        {categories.isError ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void categories.refetch()}
                          >
                            Reintentar categorías
                          </Button>
                        ) : categories.isLoading ? (
                          <p className="text-sm">Cargando…</p>
                        ) : categories.data?.data.length ? (
                          categories.data.data.map((category) => (
                            <label
                              key={category.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={categoryIds.includes(category.id)}
                                onChange={(e) => {
                                  setCategoryIds((ids) =>
                                    e.target.checked
                                      ? [...ids, category.id]
                                      : ids.filter((id) => id !== category.id),
                                  );
                                  setDirty(true);
                                }}
                              />
                              {category.name}
                            </label>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No hay categorías disponibles.
                          </p>
                        )}
                        {error('category_ids')}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="blog-meta-title">
                          Título para buscadores
                        </Label>
                        <Input
                          id="blog-meta-title"
                          data-field="meta_title"
                          value={metaTitle}
                          maxLength={255}
                          onChange={(e) => {
                            setMetaTitle(e.target.value);
                            setDirty(true);
                          }}
                        />
                        {error('meta_title')}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="blog-meta-description">
                          Descripción para buscadores
                        </Label>
                        <Textarea
                          id="blog-meta-description"
                          data-field="meta_description"
                          value={metaDescription}
                          maxLength={500}
                          onChange={(e) => {
                            setMetaDescription(e.target.value);
                            setDirty(true);
                          }}
                        />
                        {error('meta_description')}
                      </div>
                    </>
                  )}
                </div>
              </details>
            </aside>
          </fieldset>
          <section
            ref={library}
            tabIndex={-1}
            data-field="media_ids"
            className="mt-6 space-y-4 rounded-lg border bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  Biblioteca de esta publicación{' '}
                  <span className="text-muted-foreground">
                    ({media.length}/20)
                  </span>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Imágenes hasta 10 MB · Videos hasta 150 MB. Los archivos
                  adicionales aparecen en la galería.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={busy || media.length >= 20}
                onClick={() => pick('library')}
              >
                <Upload />
                Subir archivo
              </Button>
            </div>
            {error('media_ids')}
            {error('media_alt')}
            {failedUpload && (
              <Button
                type="button"
                variant="outline"
                className="h-auto whitespace-normal break-all text-left"
                disabled={busy}
                onClick={() =>
                  void upload(failedUpload.file, failedUpload.intent)
                }
              >
                Reintentar carga de {failedUpload.file.name}
              </Button>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="min-w-0 space-y-3 rounded-lg border p-3"
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.alt || 'Imagen de la biblioteca'}
                      className="h-32 w-full rounded object-contain"
                    />
                  ) : (
                    <video
                      src={item.url}
                      controls
                      preload="metadata"
                      className="h-32 w-full rounded bg-neutral-950 object-contain"
                    />
                  )}
                  <label className="grid gap-1 text-xs">
                    Descripción del archivo
                    <Input
                      aria-label={`Descripción del archivo ${item.id}`}
                      value={item.alt || ''}
                      maxLength={255}
                      disabled={busy}
                      onChange={(e) => {
                        altChanged(item.url, e.target.value);
                        updateEditorAlt(
                          editor.current,
                          item.url,
                          e.target.value,
                        );
                      }}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => insert(item)}
                    >
                      Insertar
                    </Button>
                    {item.type === 'image' && (
                      <Button
                        type="button"
                        size="sm"
                        variant={coverId === item.id ? 'secondary' : 'outline'}
                        disabled={busy || coverId === item.id}
                        onClick={() => {
                          setCoverId(item.id);
                          setLegacyCover(null);
                          setDirty(true);
                        }}
                      >
                        {coverId === item.id ? 'Es portada' : 'Usar de portada'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        removeEditorMedia(editor.current, item.url);
                      }}
                    >
                      Quitar del contenido
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-700"
                      disabled={busy}
                      onClick={() => void remove(item)}
                    >
                      Retirar archivo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {!media.length && (
              <p className="py-3 text-sm text-muted-foreground">
                Aún no has añadido archivos. También puedes publicar solo texto.
              </p>
            )}
          </section>
        </div>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-white px-4 py-3 sm:px-6">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void requestClose()}
        >
          Cerrar
        </Button>
        <div className="flex flex-wrap gap-2">
          {status === 'draft' && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void submit('draft')}
            >
              <Save />
              Guardar borrador
            </Button>
          )}
          <Button
            type="button"
            className="bg-cyan-700 text-white hover:bg-cyan-800"
            disabled={busy}
            onClick={() =>
              void submit(status === 'draft' ? 'published' : status)
            }
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : status === 'draft' ? (
              <Send />
            ) : (
              <Save />
            )}
            {status === 'draft' ? 'Publicar' : 'Guardar cambios'}
          </Button>
        </div>
      </footer>
      <input ref={fileInput} type="file" className="hidden" onChange={onFile} />
    </form>
  );
}
