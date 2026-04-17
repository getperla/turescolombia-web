import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'laperla_favorites';

// Cache global para evitar JSON.parse repetido en cada mount
let cachedFavorites: number[] | null = null;

function loadFavorites(): number[] {
  if (typeof window === 'undefined') return [];
  if (cachedFavorites !== null) return cachedFavorites;
  try {
    cachedFavorites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return cachedFavorites || [];
  } catch {
    cachedFavorites = [];
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => { setFavorites(loadFavorites()); }, []);

  const toggle = useCallback((tourId: number) => {
    setFavorites(prev => {
      const next = prev.includes(tourId) ? prev.filter(id => id !== tourId) : [...prev, tourId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      cachedFavorites = next;
      return next;
    });
  }, []);

  // Set lookup O(1) en vez de Array.includes O(n) — importante con muchos favoritos
  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const isFavorite = useCallback((tourId: number) => favSet.has(tourId), [favSet]);

  return { favorites, toggle, isFavorite, count: favorites.length };
}
