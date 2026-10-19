import { AuthField } from "@/shared/components/form/auth-field";
import ChangeVisible from "@/shared/components/ui/change-visible";
import { Input } from "@/shared/components/ui/input";

interface AuthPasswordInputProps {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  onBlur: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isInvalid: boolean;
  errorMessage?: string;
  showPassword: boolean;
  onTogglePassword: (show: boolean) => void;
  disabled?: boolean;
  /** Блок под полем (например, шкала надёжности). */
  footer?: React.ReactNode;
}

export function AuthPasswordInput({
  name,
  label,
  value,
  placeholder,
  onBlur,
  onChange,
  isInvalid,
  errorMessage,
  showPassword,
  onTogglePassword,
  disabled,
  footer,
}: AuthPasswordInputProps) {
  const errorId = `${name}-error`;

  return (
    <AuthField
      name={name}
      label={label}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
    >
      <div className="relative">
        <Input
          className="pr-24"
          id={name}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onBlur={onBlur}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? errorId : undefined}
          placeholder={placeholder}
        />
        <ChangeVisible
          show={showPassword}
          changeShow={onTogglePassword}
          disabled={disabled}
        />
      </div>
      {footer}
    </AuthField>
  );
}
