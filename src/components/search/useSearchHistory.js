import { useCallback, useState } from 'react';

const entryText = (entry) => {
  if (entry == null) return '';
  if (typeof entry === 'string') return entry;
  return (entry.value ?? entry.label ?? '').toString();
};

const entryKey = (entry) => {
  if (entry && typeof entry === 'object' && entry.id) {
    return `id:${entry.id}`;
  }
  return `text:${entryText(entry).trim().toLowerCase()}`;
};

const normalizeEntry = (entry) => {
  const text = entryText(entry).trim();
  if (!text) return null;
  if (typeof entry === 'string') return text;
  return {
    id: entry.id,
    label: entry.label ?? text,
    sublabel: entry.sublabel,
    value: entry.value ?? text,
    icon: entry.icon,
    avatarSrc: entry.avatarSrc ?? entry.avatarUrl ?? entry.src,
    /* Preserve the colorful pill stack (Figma 3345:2981 — queue + HN
       badges) so rows pushed into history keep their rich layout when
       re-rendered later. Plain-string history items still work. */
    badges: Array.isArray(entry.badges) ? entry.badges : undefined,
  };
};

/* Tiny hook for the recent-search list <PrimarySearch> consumes via its
   `history` prop. Persists to localStorage so the list survives reloads,
   dedupes case-insensitively (latest first), and caps the count so the
   dropdown doesn't grow into a scrollable list.

   Usage:
     const search = useSearchHistory('mih:primarysearch-history:opd-queue');
     <PrimarySearch
       history={search.history}
       onHistoryClear={search.history.length > 0 ? search.clear : undefined}
       onSubmit={(label) => { runSearch(label); search.push(label); }}
     />

   `storageKey` should be page-scoped (e.g. include the route slug) so
   different queues don't share each other's recent-search lists.

   `seedIfEmpty` — when localStorage has no saved history yet, hydrate
   with these rich rows (Figma 3345:2981) so the "ค้นหาล่าสุด" dropdown
   shows the list UI on first focus instead of only the empty placeholder. */
const toSeedList = (entries, limit) => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(normalizeEntry)
    .filter(Boolean)
    .slice(0, limit);
};

export default function useSearchHistory(storageKey, { limit = 8, seedIfEmpty = [] } = {}) {
  const [history, setHistory] = useState(() => {
    const seed = toSeedList(seedIfEmpty, limit);
    if (typeof window === 'undefined' || !storageKey) return seed;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, limit);
      }
      if (seed.length > 0) {
        window.localStorage.setItem(storageKey, JSON.stringify(seed));
      }
      return seed;
    } catch {
      return seed;
    }
  });

  const persist = useCallback((next) => {
    setHistory(next);
    if (typeof window === 'undefined' || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* swallow quota / private-mode failures — in-memory state still updates */
    }
  }, [storageKey]);

  const push = useCallback((entry) => {
    const nextEntry = normalizeEntry(entry);
    if (!nextEntry) return;
    const nextEntryKey = entryKey(nextEntry);
    setHistory((prev) => {
      const next = [
        nextEntry,
        ...prev.filter((h) => entryKey(h) !== nextEntryKey),
      ].slice(0, limit);
      if (typeof window !== 'undefined' && storageKey) {
        try { window.localStorage.setItem(storageKey, JSON.stringify(next)); }
        catch { /* ignore */ }
      }
      return next;
    });
  }, [storageKey, limit]);

  const clear = useCallback(() => persist([]), [persist]);

  return { history, push, clear };
}
