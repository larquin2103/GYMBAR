import { Menu, Search } from 'lucide-react';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { SyncIndicator } from './SyncIndicator';
import { useCommandPalette } from './CommandPalette';
import { UserMenu } from './UserMenu';

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { open } = useCommandPalette();

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-content-muted hover:bg-surface lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={open}
        className="flex h-9 flex-1 items-center gap-2 rounded-md border border-border bg-surface/60 px-3 text-sm text-content-muted transition-colors hover:border-primary/40 sm:max-w-md"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span>Buscar clientes o acciones…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <SyncIndicator />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
