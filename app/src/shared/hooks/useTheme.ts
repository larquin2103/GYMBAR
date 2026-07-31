import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gymbar-theme';

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark' ? 'dark' : 'light';
}

/** Gestiona el tema claro/oscuro y lo persiste. El valor inicial lo fija un
 * script inline en index.html para evitar flash. */
export function useTheme(): {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
} {
  const [theme, setThemeState] = useState<Theme>(() => readTheme());

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // almacenamiento no disponible: ignorar
    }
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readTheme() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  // Sincroniza si otra pestaña cambia el tema.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        document.documentElement.setAttribute('data-theme', e.newValue);
        setThemeState(e.newValue);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { theme, toggleTheme, setTheme };
}
