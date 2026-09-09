import { z } from 'zod';

import { localDateIso } from '@/lib/stay-context';

const cabinStatuses = ['available', 'occupied', 'maintenance', 'inactive'] as const;

const integerString = (label: string, minimum: number, maximum = 50) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio`)
    .regex(/^\d+$/, `${label} debe ser un numero entero`)
    .refine((value) => Number(value) >= minimum, `${label} debe ser mayor o igual a ${minimum}`)
    .refine((value) => Number(value) <= maximum, `${label} no puede superar ${maximum}`);

const todayIso = localDateIso;

const optionalString = (schema: z.ZodString) =>
  z
    .union([z.literal(''), schema])
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const optionalNumber = (schema: z.ZodNumber) =>
  z
    .union([z.literal(''), z.coerce.number().pipe(schema)])
    .optional()
    .transform((value) => (value === '' ? undefined : value));

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  });

export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(255, 'El nombre no puede superar 255 caracteres'),
    email: z.string().trim().email('Email inválido').max(255, 'Email demasiado largo'),
    phone: optionalString(
      z.string().trim().regex(/^[0-9+\s().-]{7,30}$/, 'Teléfono inválido'),
    ),
    message: z
      .string()
      .trim()
      .min(10, 'El mensaje debe tener al menos 10 caracteres')
      .max(2000, 'El mensaje no puede superar 2000 caracteres'),
    check_in: optionalString(z.string()),
    check_out: optionalString(z.string()),
    guests_count: optionalNumber(
      z
        .number({ error: 'Indica un número de huéspedes válido' })
        .int('El número de huéspedes debe ser entero')
        .min(1, 'Debe haber al menos 1 huésped')
        .max(50, 'El máximo permitido es de 50 huéspedes'),
    ),
    cabin_id: optionalNumber(z.number().int().positive()),
    cabin_type_id: optionalNumber(z.number().int().positive()),
  })
  .superRefine((data, ctx) => {
    if (data.check_in && !data.check_out) {
      ctx.addIssue({
        code: 'custom',
        path: ['check_out'],
        message: 'Indica también la fecha de salida',
      });
    }

    if (!data.check_in && data.check_out) {
      ctx.addIssue({
        code: 'custom',
        path: ['check_in'],
        message: 'Indica también la fecha de llegada',
      });
    }

    if (data.check_in && data.check_in < todayIso()) {
      ctx.addIssue({
        code: 'custom',
        path: ['check_in'],
        message: 'La fecha de llegada debe ser hoy o posterior',
      });
    }

    if (data.check_in && data.check_out && data.check_out <= data.check_in) {
      ctx.addIssue({
        code: 'custom',
        path: ['check_out'],
        message: 'La fecha de salida debe ser posterior a la llegada',
      });
    }
  });

export const reviewSchema = z.object({
  rating: z.coerce.number().min(1, 'Mínimo 1 estrella').max(5, 'Máximo 5 estrellas'),
  title: z.string().max(255, 'El título no puede superar 255 caracteres').optional(),
  body: z.string().min(20, 'La reseña debe tener al menos 20 caracteres'),
});

export const cabinFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre es obligatorio')
      .max(255, 'El nombre no puede superar 255 caracteres'),
    status: z.enum(cabinStatuses),
    floor: z
      .string()
      .trim()
      .refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) <= 65535), 'El piso debe ser un entero entre 0 y 65535'),
    short_description: z
      .string()
      .trim()
      .max(500, 'El resumen no puede superar 500 caracteres'),
    description: z.string().trim(),
    min_guests: integerString('La capacidad mínima', 1),
    guest_capacity: integerString('La capacidad comoda', 1),
    max_guests: integerString('La capacidad maxima', 1),
    beds_count: integerString('La cantidad de camas', 0),
    bathrooms_count: integerString('La cantidad de banos', 0),
    map_slot: z.string().min(1, 'La ubicación en el mapa es obligatoria'),
    is_active: z.boolean(),
    sort_order: integerString('El orden', 0, 65535),
    notes: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    const comfortable = Number(data.guest_capacity);
    const maximum = Number(data.max_guests);

    if (comfortable > maximum || comfortable < Number(data.min_guests)) {
      ctx.addIssue({
        code: 'custom',
        path: ['guest_capacity'],
        message: 'La capacidad cómoda debe estar entre la mínima y la máxima',
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ContactFormInput = z.input<typeof contactSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type CabinFormInput = z.infer<typeof cabinFormSchema>;
