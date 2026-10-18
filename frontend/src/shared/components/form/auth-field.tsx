import type { ReactNode } from "react";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";

export function AuthField({
  name,
  label,
  isInvalid,
  errorMessage,
  children,
}: {
  name: string;
  label: string;
  isInvalid: boolean;
  errorMessage?: string;
  children: ReactNode;
}) {
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {children}
      {isInvalid && errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
    </Field>
  );
}
