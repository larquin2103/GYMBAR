import { cn } from '@/shared/lib/cn';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
};

/** Avatar con foto o iniciales de respaldo. */
export function Avatar({
  photoUrl,
  initials,
  name,
  size = 'md',
}: {
  photoUrl?: string | null;
  initials: string;
  name?: string;
  size?: keyof typeof sizes;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ?? 'Foto'}
        loading="lazy"
        className={cn('shrink-0 rounded-full object-cover', sizes[size])}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary',
        sizes[size],
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
