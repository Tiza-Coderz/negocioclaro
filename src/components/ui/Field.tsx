import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from './cn';

const CONTROL =
  'block w-full rounded-xl border-0 bg-white px-3 text-base text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-500 disabled:bg-slate-100 aria-[invalid=true]:ring-red-500';

interface FieldWrapperProps {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  id: string;
  children: ReactNode;
  className?: string | undefined;
  hideLabel?: boolean | undefined;
}

function FieldWrapper({
  label,
  hint,
  error,
  id,
  children,
  className,
  hideLabel,
}: FieldWrapperProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={id}
        className={cn('block text-sm font-medium text-slate-700', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type Common = {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  wrapperClassName?: string;
  hideLabel?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Common>(
  function Input({ label, hint, error, wrapperClassName, hideLabel, className, id, ...rest }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldWrapper
        label={label}
        hint={hint}
        error={error}
        id={fieldId}
        className={wrapperClassName}
        hideLabel={hideLabel}
      >
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cn(CONTROL, 'h-11', className)}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & Common & { children: ReactNode }
>(function Select(
  { label, hint, error, wrapperClassName, hideLabel, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrapper
      label={label}
      hint={hint}
      error={error}
      id={fieldId}
      className={wrapperClassName}
      hideLabel={hideLabel}
    >
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(CONTROL, 'h-11 pr-8', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & Common
>(function Textarea(
  { label, hint, error, wrapperClassName, hideLabel, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrapper
      label={label}
      hint={hint}
      error={error}
      id={fieldId}
      className={wrapperClassName}
      hideLabel={hideLabel}
    >
      <textarea
        ref={ref}
        id={fieldId}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(CONTROL, 'py-2', className)}
        {...rest}
      />
    </FieldWrapper>
  );
});
