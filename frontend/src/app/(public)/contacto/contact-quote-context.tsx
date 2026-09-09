'use client';

import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { buildQuoteWhatsAppHref } from '@/lib/cabin-utils';

type QuoteValues = Parameters<typeof buildQuoteWhatsAppHref>[0];
const ValuesContext = createContext<QuoteValues>({});
const UpdateContext = createContext<Dispatch<
  SetStateAction<QuoteValues>
> | null>(null);

export function ContactQuoteProvider({
  initialValues,
  children,
}: {
  initialValues: QuoteValues;
  children: ReactNode;
}) {
  const [values, setValues] = useState(initialValues);
  return (
    <UpdateContext.Provider value={setValues}>
      <ValuesContext.Provider value={values}>{children}</ValuesContext.Provider>
    </UpdateContext.Provider>
  );
}

export function useUpdateContactQuote() {
  return useContext(UpdateContext);
}

/** Every WhatsApp entry point on Contact uses the latest editable form values. */
export function ContactMethodLink({
  whatsapp = false,
  ...props
}: ComponentProps<'a'> & { whatsapp?: boolean }) {
  const values = useContext(ValuesContext);
  return (
    <a
      {...props}
      href={whatsapp ? buildQuoteWhatsAppHref(values) : props.href}
    />
  );
}
