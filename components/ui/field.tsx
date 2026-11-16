"use client";

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-[6px] border border-line bg-bg-raised text-[13px] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 ease-out hover:border-[var(--line-strong-hover)] focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/15 disabled:opacity-50 disabled:cursor-not-allowed";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  counter,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  counter?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
          {label}
          {required ? (
            <span className="text-orange" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {counter ? <span className="shrink-0 font-mono text-[9px] text-ink-3">{counter}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-[11px] leading-[1.45] text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] leading-[1.45] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, "h-9 px-3", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(controlBase, "min-h-[112px] resize-y px-3 py-2.5 leading-[1.6]", className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(controlBase, "h-9 appearance-none pl-3 pr-9", className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={1.7}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
      </div>
    );
  },
);

export function LabeledInput({
  label,
  hint,
  error,
  required,
  maxLength,
  value,
  className,
  labelClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  labelClassName?: string;
}) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const count = typeof value === "string" && maxLength ? `${value.length} / ${maxLength}` : undefined;

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      htmlFor={id}
      required={required}
      counter={count}
      className={labelClassName}
    >
      <Input
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        className={className}
        {...props}
      />
    </Field>
  );
}

export function LabeledTextarea({
  label,
  hint,
  error,
  required,
  maxLength,
  value,
  className,
  containerClassName,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const count = typeof value === "string" && maxLength ? `${value.length} / ${maxLength}` : undefined;

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      htmlFor={id}
      required={required}
      counter={count}
      className={containerClassName}
    >
      <Textarea
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        className={cn(className)}
        {...props}
      />
    </Field>
  );
}
