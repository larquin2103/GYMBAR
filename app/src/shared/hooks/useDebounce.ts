import { useEffect, useState } from 'react';

/** Devuelve el valor tras `delay` ms sin cambios. Para búsqueda instantánea sin spamear. */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
