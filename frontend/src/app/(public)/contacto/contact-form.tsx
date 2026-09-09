'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
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
import { ApiError, api } from '@/lib/api';
import {
  localDateIso,
  addLocalDays,
  type StayContext,
} from '@/lib/stay-context';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { SITE_NAME, WHATSAPP_URL } from '@/lib/constants';
import {
  contactSchema,
  type ContactFormInput,
  type ContactInput,
} from '@/lib/validations';
import type { ApiResponse } from '@/types/api';
import type { PublicCabin as Cabin } from '@/types/cabin';

type ContactResponse = {
  data: {
    id: number;
    name: string;
    email: string;
  };
  message?: string;
  meta?: {
    email_sent?: boolean;
  };
};

const defaultValues: ContactFormInput = {
  name: '',
  email: '',
  phone: '',
  message: '',
  check_in: '',
  check_out: '',
  guests_count: '',
  cabin_id: '',
  cabin_type_id: '',
};

function cleanPayload(data: ContactInput) {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined && value !== '',
    ),
  );
}

function buildWhatsappHref(
  values: Partial<ContactFormInput>,
  cabinName?: string,
) {
  const lines = [`Hola, quiero cotizar una estadía en ${SITE_NAME}.`];

  if (values.name) {
    lines.push(`Mi nombre es ${values.name}.`);
  }

  if (values.check_in && values.check_out) {
    lines.push(`Fechas: ${values.check_in} a ${values.check_out}.`);
  }

  if (values.guests_count) {
    lines.push(`Huéspedes: ${values.guests_count}.`);
  }

  if (cabinName) {
    lines.push(`Cabaña: ${cabinName}.`);
  }

  if (values.message) {
    lines.push(`Mensaje: ${values.message}`);
  }

  return `${WHATSAPP_URL}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function ErrorMessage({ error }: { error?: { message?: string } }) {
  if (!error?.message) {
    return null;
  }

  return (
    <p role="alert" className="text-xs leading-5 text-destructive">
      {error.message}
    </p>
  );
}

export function ContactForm({
  initialContext = {},
}: {
  initialContext?: StayContext;
}) {
  const [receipt, setReceipt] = useState('');
  const form = useForm<ContactFormInput, unknown, ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      ...defaultValues,
      check_in: initialContext.check_in ?? '',
      check_out: initialContext.check_out ?? '',
      guests_count: initialContext.guests ?? '',
      cabin_id: initialContext.cabin_id ?? '',
    },
    mode: 'onBlur',
  });

  const cabinsQuery = useQuery({
    queryKey: ['contact-cabins'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: () => api.get<ApiResponse<Cabin[]>>('/cabins'),
    retry: 1,
  });

  const cabins = useMemo(
    () => cabinsQuery.data?.data ?? [],
    [cabinsQuery.data?.data],
  );
  const watchedValues = useWatch({ control: form.control });
  const values: ContactFormInput = { ...defaultValues, ...watchedValues };

  const selectedCabinName = useMemo(() => {
    return cabins.find((cabin) => cabin.id === Number(values.cabin_id))?.name;
  }, [cabins, values.cabin_id]);

  const whatsappHref = buildWhatsappHref(values, selectedCabinName);

  const contactMutation = useMutation({
    mutationFn: (data: ContactInput) =>
      api.post<ContactResponse>('/contact', cleanPayload(data)),
    onSuccess: (response) => {
      setReceipt(
        response.message ?? 'Solicitud recibida. Te contactaremos pronto.',
      );
      form.reset(form.getValues());

      if (response.meta?.email_sent === false) {
        toast.warning('Solicitud recibida', {
          description: response.message,
        });
        return;
      }

      toast.success('Solicitud enviada', {
        description: response.message ?? 'Te contactaremos pronto.',
      });
    },
    onError: (error) => {
      setReceipt('');
      if (error instanceof ApiError) {
        if (error.errors?.cabin_id) void cabinsQuery.refetch();
        Object.entries(error.errors ?? {}).forEach(([field, messages]) => {
          form.setError(field as keyof ContactInput, {
            type: 'server',
            message: messages[0],
          });
        });

        toast.error('No pudimos enviar la solicitud', {
          description: error.message,
        });
        return;
      }

      toast.error('No pudimos enviar la solicitud', {
        description: 'Inténtalo de nuevo o escríbenos por WhatsApp.',
      });
    },
  });

  useUnsavedChanges(form.formState.isDirty && !contactMutation.isPending);
  const cabinUnavailable = Boolean(
    values.cabin_id && cabinsQuery.isSuccess && !selectedCabinName,
  );
  const onSubmit = form.handleSubmit((data) => {
    if (contactMutation.isPending) return;
    if (cabinUnavailable) {
      form.setError('cabin_id', {
        message:
          'La cabaña ya no está publicada. Selecciona otra o deja la cabaña por definir.',
      });
      return;
    }
    contactMutation.mutate(data);
  });

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="rounded-lg border bg-white p-5 shadow-sm sm:p-6"
    >
      {receipt && (
        <p
          role="status"
          className="mb-5 rounded-lg bg-emerald-50 p-4 text-emerald-900"
        >
          {receipt}
        </p>
      )}
      <fieldset disabled={contactMutation.isPending} className="min-w-0">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Nombre completo</Label>
            <Input
              id="contact-name"
              autoComplete="name"
              placeholder="Tu nombre"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
            <ErrorMessage error={form.formState.errors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Correo electrónico</Label>
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register('email')}
            />
            <ErrorMessage error={form.formState.errors.email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Teléfono o WhatsApp</Label>
            <Input
              id="contact-phone"
              type="tel"
              autoComplete="tel"
              placeholder="314 742 7806"
              aria-invalid={Boolean(form.formState.errors.phone)}
              {...form.register('phone')}
            />
            <ErrorMessage error={form.formState.errors.phone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-guests">Huéspedes</Label>
            <Input
              id="contact-guests"
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              placeholder="2"
              aria-invalid={Boolean(form.formState.errors.guests_count)}
              {...form.register('guests_count')}
            />
            <ErrorMessage error={form.formState.errors.guests_count} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-check-in">Llegada</Label>
            <Input
              id="contact-check-in"
              type="date"
              min={localDateIso()}
              aria-invalid={Boolean(form.formState.errors.check_in)}
              {...form.register('check_in')}
            />
            <ErrorMessage error={form.formState.errors.check_in} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-check-out">Salida</Label>
            <Input
              id="contact-check-out"
              type="date"
              min={
                values.check_in
                  ? addLocalDays(values.check_in, 1)
                  : addLocalDays(localDateIso(), 1)
              }
              aria-invalid={Boolean(form.formState.errors.check_out)}
              {...form.register('check_out')}
            />
            <ErrorMessage error={form.formState.errors.check_out} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-cabin">Cabaña preferida</Label>
            <Select
              value={values.cabin_id ? String(values.cabin_id) : 'any'}
              onValueChange={(value) => {
                form.setValue('cabin_id', value === 'any' ? '' : value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger id="contact-cabin" className="w-full">
                <SelectValue placeholder="Cabaña por definir" />
              </SelectTrigger>
              <SelectContent>
                {cabinUnavailable && (
                  <SelectItem value={String(values.cabin_id)} disabled>
                    Cabaña ya no publicada
                  </SelectItem>
                )}
                <SelectItem value="any">Cabaña por definir</SelectItem>
                {cabins.map((cabin) => (
                  <SelectItem key={cabin.id} value={String(cabin.id)}>
                    {cabin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cabinsQuery.isError ? (
              <p className="text-xs leading-5 text-muted-foreground">
                No pudimos cargar las cabañas ahora.{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void cabinsQuery.refetch()}
                >
                  Reintentar
                </button>
              </p>
            ) : null}
            {cabinUnavailable && (
              <p role="alert" className="text-sm text-destructive">
                La cabaña elegida ya no está publicada. Elige otra o selecciona
                «Cabaña por definir». Tus datos se conservan.
              </p>
            )}
            <ErrorMessage error={form.formState.errors.cabin_id} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-message">Mensaje</Label>
            <Textarea
              id="contact-message"
              rows={6}
              maxLength={2000}
              placeholder="Cuéntanos fechas aproximadas, tipo de viaje o dudas para preparar una mejor respuesta."
              aria-invalid={Boolean(form.formState.errors.message)}
              {...form.register('message')}
            />
            <div className="flex items-center justify-between gap-3">
              <ErrorMessage error={form.formState.errors.message} />
              <span className="ml-auto text-xs text-muted-foreground">
                {values.message?.length ?? 0}/2000
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            size="lg"
            disabled={contactMutation.isPending}
            className="bg-cyan-700 text-white hover:bg-cyan-800"
          >
            {contactMutation.isPending ? (
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Enviar solicitud
          </Button>
          <Button type="button" size="lg" variant="outline" asChild>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </a>
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
