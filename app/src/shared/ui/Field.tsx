import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/shared/lib/cn';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-content">
        {label}
        {required && <span className="ml-0.5 text-state-expired">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-state-expired">{error}</p>
      ) : hint ? (
        <p className="text-xs text-content-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const baseInput =
  'w-full rounded-md border bg-bg px-3 text-sm text-content placeholder:text-content-muted transition-colors focus-visible:border-primary disabled:opacity-50';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        baseInput,
        'h-10',
        invalid ? 'border-state-expired' : 'border-border',
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        baseInput,
        'min-h-20 py-2',
        invalid ? 'border-state-expired' : 'border-border',
        className,
      )}
      {...props}
    />
  );
});
