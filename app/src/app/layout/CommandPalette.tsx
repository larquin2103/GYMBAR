import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { NAV_ITEMS } from '@/config/navigation';
import { useSession } from '@/shared/session/SessionContext';

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette debe usarse dentro de <CommandPaletteProvider>');
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { role } = useSession();

  const value = useMemo<CommandPaletteContextValue>(
    () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
    }),
    [],
  );

  // Atajo global Cmd/Ctrl-K.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = useCallback(
    (path: string) => {
      setIsOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <Command
            label="Paleta de comandos"
            className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-bg shadow-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="h-4 w-4 text-content-muted" aria-hidden />
              <Command.Input
                autoFocus
                placeholder="Buscar o ejecutar una acción…"
                className="h-12 w-full bg-transparent text-sm text-content outline-none placeholder:text-content-muted"
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-content-muted sm:block">
                ESC
              </kbd>
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-content-muted">
                Sin resultados.
              </Command.Empty>
              <Command.Group
                heading="Ir a"
                className="px-1 text-xs font-medium text-content-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.path}
                    value={item.label}
                    onSelect={() => go(item.path)}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-content aria-selected:bg-primary-soft aria-selected:text-primary"
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </div>
      )}
    </CommandPaletteContext.Provider>
  );
}
