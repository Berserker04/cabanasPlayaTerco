import type { ReviewStatus } from '../types/review';

export const MAX_REVIEW_IMAGES = 3;
export const MAX_REVIEW_IMAGE_BYTES = 10 * 1024 * 1024;
export const REVIEW_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function reviewEditNotice(status: ReviewStatus): string {
  return status === 'approved'
    ? 'Los cambios se verán de inmediato en tu reseña pública.'
    : 'Los cambios se guardarán. La reseña seguirá oculta hasta que el administrador la publique.';
}

export type ReviewValues = { rating: number; title: string; body: string };
export type ReviewErrors = Partial<
  Record<keyof ReviewValues | 'images' | 'form', string>
>;

export function validateReview(values: ReviewValues): ReviewErrors {
  const errors: ReviewErrors = {};
  if (
    !Number.isInteger(values.rating) ||
    values.rating < 1 ||
    values.rating > 5
  )
    errors.rating = 'Selecciona una calificación de 1 a 5 estrellas.';
  if (values.title.trim().length > 255)
    errors.title = 'El título no puede superar los 255 caracteres.';
  if (values.body.trim().length < 20)
    errors.body = 'Cuéntanos un poco más: escribe al menos 20 caracteres.';
  if (values.body.trim().length > 5000)
    errors.body = 'La reseña no puede superar los 5000 caracteres.';
  return errors;
}

export function validateReviewImages(
  files: readonly Pick<File, 'name' | 'size' | 'type'>[],
  currentCount = 0,
): string | null {
  if (currentCount + files.length > MAX_REVIEW_IMAGES) {
    const available = Math.max(0, MAX_REVIEW_IMAGES - currentCount);
    return `Máximo 3 fotos por reseña. Puedes añadir ${available} ${available === 1 ? 'foto más' : 'fotos más'}. No se añadió esta selección.`;
  }
  for (const file of files) {
    if (!REVIEW_IMAGE_TYPES.includes(file.type))
      return `${file.name}: usa una imagen JPG, PNG o WebP.`;
    if (file.size > MAX_REVIEW_IMAGE_BYTES)
      return `${file.name}: la imagen no puede superar los 10 MB.`;
    if (file.size === 0) return `${file.name}: el archivo está vacío.`;
  }
  return null;
}

export function reviewApiErrors(
  errors?: Record<string, string[]>,
): ReviewErrors {
  const result: ReviewErrors = {};
  for (const [key, messages] of Object.entries(errors ?? {})) {
    const field = key.startsWith('images') || key === 'file' ? 'images' : key;
    if (['rating', 'title', 'body', 'images'].includes(field) && messages[0])
      result[field as keyof ReviewErrors] ??= messages[0];
  }
  return result;
}

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: 'Pendiente de revisión',
  approved: 'Publicada',
  rejected: 'Rechazada',
};
export const reviewStatusClasses: Record<ReviewStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
};

export function formatReviewDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : '';
}

export function reviewPageAfterRemoval(page: number, itemsOnPage: number) {
  return itemsOnPage === 1 ? Math.max(1, page - 1) : page;
}
