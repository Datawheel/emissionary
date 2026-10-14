'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** Fired once a player exists, so a link that had nothing to bind to can retry. */
export const PLAYER_READY_EVENT = 'emy:player-ready';
/** The OEC link changed the player (id or name): lists loaded earlier are stale. */
export const OEC_LINKED_EVENT = 'emy:oec-linked';
/** The OEC handshake is over (linked, guest, failed or no parent): identity prompts may show. */
export const OEC_SETTLED_EVENT = 'emy:oec-settled';

declare global {
  interface Window {
    __emyOecSettled?: boolean;
  }
}

const DEV_PARENT = process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : [];
/** Give up waiting for the parent after this long and treat the visitor as a guest. */
const HANDSHAKE_TIMEOUT_MS = 2500;
/** Let router.refresh() land before releasing prompts that depend on the player's name. */
const REFRESH_SETTLE_MS = 600;

function isOecOrigin(origin: string, extraParents: string[]): boolean {
  if (DEV_PARENT.includes(origin) || extraParents.includes(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && (hostname === 'oec.world' || hostname.endsWith('.oec.world'));
  } catch {
    return false;
  }
}

function settle() {
  if (window.__emyOecSettled) return;
  window.__emyOecSettled = true;
  window.dispatchEvent(new Event(OEC_SETTLED_EVENT));
}

/**
 * Embedded in oec.world, asks the parent for the signed-in OEC session and
 * binds it to the current player (POST /api/player/oec), so the leaderboard
 * shows the OEC name. Renders nothing; outside an iframe, or when the visitor
 * is a guest, the game simply stays anonymous.
 */
export default function OecSessionLink({ extraParents = [] }: { extraParents?: string[] }) {
  const router = useRouter();
  const token = useRef<string | null>(null);
  const pending = useRef(false);
  const refreshed = useRef(false);

  // a string dependency: the array prop is a new object after every router.refresh()
  const parentsKey = extraParents.join(',');

  useEffect(() => {
    const extraParents = parentsKey ? parentsKey.split(',') : [];
    if (window === window.top) {
      settle();
      return;
    }

    let parentOrigin: string | null = null;
    try {
      const ref = new URL(document.referrer).origin;
      if (isOecOrigin(ref, extraParents)) parentOrigin = ref;
    } catch {
      /* no referrer: fall back to the known origins below */
    }
    const targets = parentOrigin ? [parentOrigin] : [...DEV_PARENT, ...extraParents, 'https://oec.world'];
    const askParent = () =>
      targets.forEach((origin) => window.parent.postMessage({ type: 'requestSession', game: 'emissionary' }, origin));
    const timeout = window.setTimeout(settle, HANDSHAKE_TIMEOUT_MS);

    async function link() {
      if (!token.current) return settle();
      const res = await fetch('/api/player/oec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.current }),
      }).catch(() => null);
      if (!res) return settle();
      if (res.status === 401) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        if (body?.code === 'token_expired' && !refreshed.current) {
          refreshed.current = true;
          token.current = null;
          askParent();
          return;
        }
        return settle();
      }
      if (!res.ok) return settle();
      const body = (await res.json()) as { linked: boolean; pending?: boolean; updated?: boolean };
      pending.current = Boolean(body.pending);
      if (body.linked && body.updated) {
        // the player or its name changed: re-render server data and reload open lists
        router.refresh();
        window.dispatchEvent(new Event(OEC_LINKED_EVENT));
        window.setTimeout(settle, REFRESH_SETTLE_MS);
      } else {
        settle();
      }
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent || !isOecOrigin(event.origin, extraParents)) return;
      const data = event.data as { type?: string; session?: { token?: string | null } | null } | null;
      if (data?.type !== 'session') return;
      token.current = data.session?.token ?? null;
      void link();
    }

    function onPlayerReady() {
      if (pending.current) void link();
    }

    window.addEventListener('message', onMessage);
    window.addEventListener(PLAYER_READY_EVENT, onPlayerReady);
    askParent();
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      window.removeEventListener(PLAYER_READY_EVENT, onPlayerReady);
    };
  }, [router, parentsKey]);

  return null;
}
