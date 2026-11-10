"use client";

import { AlertCircle } from "lucide-react";
import { useId } from "react";


type FieldShellProps = {
  label: string;
  /** Pass false to hide the "Optional" marker. */
  optionalLabel?: false;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: (ids: { id: string; describedBy?: string }) => React.ReactNode;
  className?: string;
};

/** Visible label, required/optional marker, hint and inline error. */
export function FieldShell({
  label,
  required,
  hint,
  error,
  children,
  className = "",
  optionalLabel,
}: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="y-label">
        <span>{label}</span>
        <span className="y-micro y-fg-3 font-medium">
          {required ? "Required" : optionalLabel === false ? "" : "Optional"}
        </span>
      </label>
      {children({ id, describedBy })}
      {hint && !error ? (
        <p id={hintId} className="y-micro y-fg-3 px-1">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)"
        >
          <AlertCircle size={16} aria-hidden className="flex-none" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  required,
  hint,
  error,
  className,
  optionalLabel,
  ...input
}: Omit<FieldShellProps, "children"> & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} className={className} optionalLabel={optionalLabel}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className="y-input"
          {...input}
        />
      )}
    </FieldShell>
  );
}

export function TextArea({
  label,
  required,
  hint,
  error,
  className,
  optionalLabel,
  ...input
}: Omit<FieldShellProps, "children"> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} className={className} optionalLabel={optionalLabel}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className="y-input"
          {...input}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  required,
  hint,
  error,
  className,
  options,
  optionalLabel,
  ...input
}: Omit<FieldShellProps, "children"> &
  React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} className={className} optionalLabel={optionalLabel}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className="y-input"
          {...input}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
