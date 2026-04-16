import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'laperla_favorites';

function loadFavorites(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => { setFavorites(loadFavorites()); }, []);

  const toggle = useCallback((tourId: number) => {
    setFavorites(prev => {
      const next = prev.includes(tourId) ? prev.filter(id => id !== tourId) : [...prev, tourId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback((tourId: number) => favorites.includes(tourId), [favorites]);

  return { favorites, toggle, isFavorite, count: favorites.length };
}
