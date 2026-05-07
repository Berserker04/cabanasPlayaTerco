import type { Metadata } from 'next';
import { AvailabilitySearch } from './availability-search';

export const metadata: Metadata = {
  title: 'Disponibilidad',
  description: 'Consulta la disponibilidad de nuestras cabañas en Playa Terco.',
};

export default function AvailabilityPage() {
  return <AvailabilitySearch />;
}
