'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/providers/confirmation-provider';

type TraverseEvent = Event & {
  navigationType: string;
  canIntercept: boolean;
  destination: { key: string };
};
type BrowserNavigation = EventTarget & { traverseTo: (key: string) => unknown };

export function useUnsavedChanges(
  dirty: boolean,
  beforeLeave?: () => Promise<boolean>,
) {
  const router = useRouter();
  const confirm = useConfirm();
  useEffect(() => {
    if (!dirty) return;
    const canLeave = () =>
      beforeLeave
        ? beforeLeave()
        : confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?');
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = async (event: MouseEvent) => {
      const anchor = (
        event.target as Element | null
      )?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || event.defaultPrevented) return;
      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (await canLeave()) {
        const target = new URL(anchor.href);
        if (target.origin === window.location.origin)
          router.push(target.pathname + target.search + target.hash);
        else window.location.assign(target.href);
      }
    };
    // Guard browser Back/Forward on browsers with the Navigation API.
    const navigation = (window as Window & { navigation?: BrowserNavigation })
      .navigation;
    let approvedTraversal = false;
    const navigate = async (event: Event) => {
      const traversal = event as TraverseEvent;
      if (
        traversal.navigationType !== 'traverse' ||
        !traversal.canIntercept ||
        !event.cancelable
      )
        return;
      if (approvedTraversal) {
        approvedTraversal = false;
        return;
      }
      event.preventDefault();
      if (await canLeave()) {
        approvedTraversal = true;
        navigation?.traverseTo(traversal.destination.key);
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    navigation?.addEventListener('navigate', navigate);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
      navigation?.removeEventListener('navigate', navigate);
    };
  }, [dirty, beforeLeave, confirm, router]);
}
