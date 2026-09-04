import { Suspense } from 'react';

import { AvailabilityAdmin } from './availability-admin';

export default function AdminAvailabilityPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando disponibilidad...</div>}>
      <AvailabilityAdmin />
    </Suspense>
  );
}
