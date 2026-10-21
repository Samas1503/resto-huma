import { cn } from '@/lib/utils';
import { useId } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes } from 'react';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-xs font-medium text-zinc-700', className)}
      {...props}
    />
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Si se pasa, envuelve el input con label + id asociado. */
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const autoId = useId();
  const input = (
    <input
      id={id ?? autoId}
      className={cn(
        'h-9 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400',
        'focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:bg-zinc-50',
        error ? 'border-red-400' : 'border-zinc-300',
        className,
      )}
      {...props}
    />
  );
  if (!label && !error) return input;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={id ?? autoId}>{label}</Label>}
      {input}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
