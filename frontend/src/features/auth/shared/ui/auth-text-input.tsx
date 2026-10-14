import { AuthField } from "@/shared/components/form/auth-field";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import type { ReactNode } from "react";

interface AuthTextInputProps {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  onBlur: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isInvalid: boolean;
  errorMessage?: string;
  disabled?: boolean;
  startIcon?: ReactNode;
  type?: string;
}

export function AuthTextInput({
  name,
  label,
  value,
  placeholder,
  onBlur,
  onChange,
  isInvalid,
  errorMessage,
  disabled,
  startIcon,
  type,
}: AuthTextInputProps) {
  const errorId = `${name}-error`;

  return (
    <AuthField
      name={name}
      label={label}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
    >
      <div className="relative">
        {startIcon && (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center [&>svg]:size-4 [&>svg]:shrink-0">
            {startIcon}
          </span>
        )}
        <Input
          className={cn("h-10", startIcon && "pl-9")}
          id={name}
          name={name}
          type={type}
          value={value}
          onBlur={onBlur}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? errorId : undefined}
          placeholder={placeholder}
        />
      </div>
    </AuthField>
  );
}
