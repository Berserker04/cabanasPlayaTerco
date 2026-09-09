'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ConfirmationContext = createContext<
  ((message: string) => Promise<boolean>) | null
>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolve = useRef<((answer: boolean) => void) | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirm = useCallback(
    (text: string) =>
      new Promise<boolean>((done) => {
        resolve.current?.(false);
        resolve.current = done;
        setMessage(text);
      }),
    [],
  );
  function finish(answer: boolean) {
    const done = resolve.current;
    resolve.current = null;
    setMessage(null);
    done?.(answer);
  }
  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <Dialog
        open={message !== null}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <DialogContent
          className="max-h-[85dvh] overflow-y-auto"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelButton.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Confirmar acción</DialogTitle>
            <DialogDescription className="break-words text-base leading-6">
              {message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              ref={cancelButton}
              variant="outline"
              onClick={() => finish(false)}
            >
              Cancelar
            </Button>
            <Button onClick={() => finish(true)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error('ConfirmationProvider is required');
  return confirm;
}
