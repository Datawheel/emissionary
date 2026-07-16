'use client';

import { useState } from 'react';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { generateName } from '@/lib/names';

const DISMISS_KEY = 'emy_name_prompt_dismissed';

export function namePromptDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The single, dismissible identity prompt (spec §10): shown once after the
 * trigger point; dismissing keeps the player anonymous and it never modals again.
 */
export default function NamePrompt({
  lang,
  onDone,
}: {
  lang: Lang;
  onDone: (name: string | null) => void;
}) {
  const [name, setName] = useState(() => generateName());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/player/name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json()) as { name: string; discriminator: number | null };
      onDone(data.discriminator ? `${data.name}#${data.discriminator}` : data.name);
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? 'error');
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    onDone(null);
  }

  return (
    <section className="card" role="dialog" aria-label={t('claim_leaderboard', lang)}>
      <h2 style={{ fontSize: '1.05rem', marginBottom: 8 }}>🏆 {t('claim_leaderboard', lang)}</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="card"
          style={{ flex: 1, fontSize: '1rem', padding: '10px 12px' }}
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          aria-label={t('name_placeholder', lang)}
        />
        <button
          className="header-btn"
          style={{ background: 'var(--paper)', border: '1px solid var(--line)', minHeight: 44 }}
          onClick={() => setName(generateName())}
        >
          🎲 {t('regenerate', lang)}
        </button>
      </div>
      {error && (
        <p className="muted" style={{ color: 'var(--alert)', marginTop: 6 }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          className="primary"
          style={{ flex: 1, minHeight: 48, borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)', fontWeight: 700 }}
          disabled={busy}
          onClick={() => void save()}
        >
          {t('save_name', lang)}
        </button>
        <button className="muted" style={{ minHeight: 48 }} onClick={dismiss}>
          {t('keep_anonymous', lang)}
        </button>
      </div>
    </section>
  );
}
