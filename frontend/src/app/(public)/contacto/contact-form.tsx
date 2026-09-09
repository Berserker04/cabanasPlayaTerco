'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LoaderCircle, MessageCircle, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUpdateContactQuote } from './contact-quote-context';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api, fetchCsrfCookie } from '@/lib/api';
import {
  localDateIso,
  addLocalDays,
  type StayContext,
} from '@/lib/stay-context';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { buildQuoteWhatsAppHref } from '@/lib/cabin-utils';
import {
  DEFAULT_QUOTE_MESSAGE,
  QUOTE_NOTICE,
  generalQuotePayload,
} from '@/lib/general-quote';
import {
  contactSchema,
  type ContactFormInput,
  type ContactInput,
} from '@/lib/validations';

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
};

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
  'use no memo'; // React Hook Form must register fields again after reset.

  const [receipt, setReceipt] = useState('');
  const form = useForm<ContactFormInput, unknown, ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      ...defaultValues,
      check_in: initialContext.check_in ?? '',
      check_out: initialContext.check_out ?? '',
      guests_count: initialContext.guests ?? '',
      message: DEFAULT_QUOTE_MESSAGE,
    },
    mode: 'onBlur',
  });

  const watchedValues = useWatch({ control: form.control });
  const values: ContactFormInput = { ...defaultValues, ...watchedValues };
  const updateContactQuote = useUpdateContactQuote();
  const quoteGuests = values.guests_count
    ? String(values.guests_count)
    : undefined;
  useEffect(() => {
    updateContactQuote?.({
      check_in: values.check_in,
      check_out: values.check_out,
      guests: quoteGuests,
      name: values.name,
      message: values.message,
    });
  }, [
    updateContactQuote,
    values.check_in,
    values.check_out,
    quoteGuests,
    values.name,
    values.message,
  ]);

  const whatsappHref = buildQuoteWhatsAppHref({
    check_in: values.check_in,
    check_out: values.check_out,
    guests: values.guests_count ? String(values.guests_count) : undefined,
    name: values.name,
    message: values.message,
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactInput) => {
      await fetchCsrfCookie();
      return api.post<ContactResponse>('/contact', generalQuotePayload(data));
    },
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
  const onSubmit = form.handleSubmit((data) => {
    if (!contactMutation.isPending) contactMutation.mutate(data);
  });

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="rounded-lg border bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="mb-5 text-sm leading-6 text-neutral-700">{QUOTE_NOTICE}</p>
      {receipt && (
        <p
          role="status"
          className="mb-5 rounded-lg bg-emerald-50 p-4 text-emerald-900"
        >
          {receipt}
        </p>
      )}
      {contactMutation.isError && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-900">
          No pudimos enviar la solicitud. Conservamos tus datos para que puedas
          corregirlos o volver a intentarlo.
        </p>
      )}
      <fieldset disabled={contactMutation.isPending} className="min-w-0">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Nombre completo</Label>
            <Input
              className="h-11 text-base md:text-base"
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
              className="h-11 text-base md:text-base"
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
              className="h-11 text-base md:text-base"
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
              className="h-11 text-base md:text-base"
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
              className="h-11 text-base md:text-base"
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
              className="h-11 text-base md:text-base"
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
            className="min-h-11 h-auto whitespace-normal bg-cyan-700 text-white hover:bg-cyan-800"
          >
            {contactMutation.isPending ? (
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Solicitar cotización
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="min-h-11 h-auto whitespace-normal"
            asChild
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Cotizar por WhatsApp
            </a>
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
