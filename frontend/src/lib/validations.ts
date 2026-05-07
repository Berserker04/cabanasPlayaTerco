import { z } from 'zod';

const todayIso = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today.toISOString().slice(0, 10);
};

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
        .max(20, 'El máximo permitido es de 20 huéspedes'),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ContactFormInput = z.input<typeof contactSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
