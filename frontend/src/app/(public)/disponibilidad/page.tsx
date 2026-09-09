import { stayFromSearchParams, type StaySearchParams } from '@/lib/stay-context';
import type { Metadata } from 'next';
import { AvailabilitySearch } from './availability-search';

export const metadata: Metadata = {
  title: 'Disponibilidad',
  description: 'Consulta la disponibilidad de nuestras cabañas en Playa Terco.',
};

export default async function AvailabilityPage({ searchParams }: { searchParams: StaySearchParams }) {
  const context = await stayFromSearchParams(searchParams);
  return <AvailabilitySearch initialContext={context} />;
}
