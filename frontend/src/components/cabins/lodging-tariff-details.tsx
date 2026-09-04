import { Check, ChevronDown, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatCurrencyCOP } from '@/lib/cabin-utils';
import { cn } from '@/lib/utils';
import type { LodgingTariff } from '@/types/cabin';

type TariffTone = 'light' | 'dark';

interface LodgingTariffDetailsProps {
  tariff: LodgingTariff;
  defaultExpanded?: boolean;
  tone?: TariffTone;
  headerAccessory?: ReactNode;
  className?: string;
}

const toneStyles = {
  light: {
    title: 'text-neutral-950',
    price: 'text-neutral-950',
    secondary: 'text-neutral-600',
    description: 'text-neutral-600',
    divider: 'border-neutral-200',
    toggle: 'text-cyan-800 hover:bg-cyan-50 focus-visible:ring-cyan-700/40',
    sectionTitle: 'text-neutral-950',
    includeItem: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    includeIcon: 'text-emerald-700',
    excludeItem: 'border-stone-200 bg-stone-100 text-neutral-800',
    excludeIcon: 'text-neutral-600',
    note: 'border-amber-200 bg-amber-50 text-amber-950',
    noteIcon: 'text-amber-700',
  },
  dark: {
    title: 'text-cyan-50',
    price: 'text-white',
    secondary: 'text-cyan-100',
    description: 'text-cyan-50',
    divider: 'border-white/15',
    toggle: 'text-cyan-100 hover:bg-white/10 focus-visible:ring-cyan-100/50',
    sectionTitle: 'text-white',
    includeItem: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-50',
    includeIcon: 'text-emerald-300',
    excludeItem: 'border-white/15 bg-white/5 text-cyan-50',
    excludeIcon: 'text-cyan-200',
    note: 'border-amber-200/25 bg-amber-200/10 text-amber-50',
    noteIcon: 'text-amber-200',
  },
} satisfies Record<TariffTone, Record<string, string>>;

export function LodgingTariffDetails({
  tariff,
  defaultExpanded = false,
  tone = 'light',
  headerAccessory,
  className,
}: LodgingTariffDetailsProps) {
  const styles = toneStyles[tone];
  const hasAdditionalDetails =
    tariff.includes.length > 0 || tariff.excludes.length > 0 || Boolean(tariff.public_notes);

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn('break-words text-sm font-semibold', styles.title)}>{tariff.title}</h3>
          <p className={cn('mt-2 break-words text-2xl font-bold', styles.price)}>
            {formatCurrencyCOP(tariff.price_cop)}
          </p>
          <p className={cn('break-words text-sm', styles.secondary)}>{tariff.unit_label}</p>
        </div>
        {headerAccessory ? <div className="flex shrink-0 flex-wrap justify-end gap-2">{headerAccessory}</div> : null}
      </div>

      {tariff.description ? (
        <p className={cn('mt-3 break-words text-sm leading-6', styles.description)}>{tariff.description}</p>
      ) : null}

      {hasAdditionalDetails ? (
        <details className="group mt-4" open={defaultExpanded || undefined}>
          <summary
            className={cn(
              'flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm font-semibold outline-none transition [&::-webkit-details-marker]:hidden',
              'focus-visible:ring-2',
              styles.toggle,
            )}
          >
            <span>
              <span className="group-open:hidden">Ver detalles</span>
              <span className="hidden group-open:inline">Ocultar detalles</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>

          <div className={cn('mt-3 space-y-4 border-t pt-4', styles.divider)}>
            {tariff.includes.length > 0 ? (
              <section>
                <h4 className={cn('text-sm font-semibold', styles.sectionTitle)}>Incluye</h4>
                <ul className="mt-2 space-y-2">
                  {tariff.includes.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className={cn('flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-5', styles.includeItem)}
                    >
                      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', styles.includeIcon)} aria-hidden="true" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {tariff.excludes.length > 0 ? (
              <section>
                <h4 className={cn('text-sm font-semibold', styles.sectionTitle)}>No incluye</h4>
                <ul className="mt-2 space-y-2">
                  {tariff.excludes.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className={cn('flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-5', styles.excludeItem)}
                    >
                      <X className={cn('mt-0.5 h-4 w-4 shrink-0', styles.excludeIcon)} aria-hidden="true" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {tariff.public_notes ? (
              <section className={cn('rounded-md border p-3', styles.note)}>
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <Info className={cn('h-4 w-4 shrink-0', styles.noteIcon)} aria-hidden="true" />
                  Nota pública
                </h4>
                <p className="mt-2 break-words text-sm leading-6">{tariff.public_notes}</p>
              </section>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
