import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contáctanos para reservas o información.',
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Contacto</h1>
      <p className="text-muted-foreground">Envíanos un mensaje y te responderemos pronto.</p>
      {/* TODO: Contact form using ContactRequest schema */}
    </div>
  );
}
