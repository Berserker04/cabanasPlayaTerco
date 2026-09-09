'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type GoogleAuthButtonProps = {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.97-3.39.97-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.86A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6 12 6Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({ loading, disabled, onClick }: GoogleAuthButtonProps) {
  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1 bg-neutral-200" />
        <span className="text-xs font-medium text-neutral-500">o continúa con</span>
        <Separator className="flex-1 bg-neutral-200" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-xl border-neutral-200 bg-white text-[15px] font-semibold text-neutral-800 shadow-sm hover:border-neutral-300 hover:bg-neutral-50 focus-visible:ring-cyan-700/20"
        disabled={disabled || loading}
        onClick={onClick}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
        {loading ? 'Conectando…' : 'Continuar con Google'}
      </Button>
    </>
  );
}
