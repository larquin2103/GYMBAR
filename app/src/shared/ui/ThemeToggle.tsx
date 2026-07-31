import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-surface hover:text-content"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
