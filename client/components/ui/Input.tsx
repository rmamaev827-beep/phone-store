"use client";

import { useId } from "react";

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  /** классы обёртки (сетка, ширина) */
  wrapperClassName?: string;
};

function Field({
  id,
  label,
  error,
  hint,
  required,
  wrapperClassName,
  children,
}: FieldProps & { id: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="label">
        {label}
        {required && (
          <span className="text-red-600" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function Input({
  label,
  error,
  hint,
  wrapperClassName,
  id,
  className = "",
  ...rest
}: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field id={fid} label={label} error={error} hint={hint} required={rest.required} wrapperClassName={wrapperClassName}>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={`control ${className}`}
        {...rest}
      />
    </Field>
  );
}

export function Textarea({
  label,
  error,
  hint,
  wrapperClassName,
  id,
  className = "",
  ...rest
}: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field id={fid} label={label} error={error} hint={hint} required={rest.required} wrapperClassName={wrapperClassName}>
      <textarea
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={`control ${className}`}
        {...rest}
      />
    </Field>
  );
}

export function Select({ className = "", ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`control cursor-pointer pr-8 ${className}`} {...rest} />;
}
