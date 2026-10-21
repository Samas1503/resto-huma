'use client';

// Controles de formulario admin que no existen en components/ui (scope C1):
// Select con label, Toggle (checkbox estilo switch), mensajes de error/empty.
import { useId } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/input';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, id, className, children, ...props }: SelectProps) {
  const autoId = useId();
  const select = (
    <select
      id={id ?? autoId}
      className={cn(
        'h-9 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900',
        'focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:bg-zinc-50',
        error ? 'border-red-400' : 'border-zinc-300',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
  if (!label && !error) return select;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={id ?? autoId}>{label}</Label>}
      {select}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1',
          checked ? 'bg-emerald-500' : 'bg-zinc-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
      {label}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {message}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-zinc-400">{children}</p>;
}
