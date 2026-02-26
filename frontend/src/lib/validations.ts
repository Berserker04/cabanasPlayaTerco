import { z } from 'zod';

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

export const contactSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  guests_count: z.coerce.number().min(1).max(20).optional(),
  cabin_type_id: z.coerce.number().optional(),
});

export const reviewSchema = z.object({
  author_name: z.string().min(2, 'Nombre requerido'),
  author_email: z.string().email('Email inválido').optional().or(z.literal('')),
  rating: z.coerce.number().min(1, 'Mínimo 1 estrella').max(5, 'Máximo 5 estrellas'),
  title: z.string().optional(),
  body: z.string().min(20, 'La reseña debe tener al menos 20 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
