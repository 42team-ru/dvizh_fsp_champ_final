import { useLoginForm } from "../model/useLoginForm";
import { AuthTextInput } from "@/features/auth/shared/ui/auth-text-input";
import { AuthPasswordInput } from "@/features/auth/shared/ui/auth-password-input";
import { AuthSubmitButton } from "@/features/auth/shared/ui/auth-submit-button";
import { getFirstFieldError } from "@/shared/lib/form-errors";
import { LoginFormLinks } from "./login-form-links";

export default function LoginForm() {
  const { form, showPassword, setShowPassword } = useLoginForm();

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(evt) => {
        evt.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <>
            <form.Field
              name="username"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const errorMessage = getFirstFieldError(
                  field.state.meta.errors,
                );

                return (
                  <AuthTextInput
                    name={field.name}
                    label="Имя пользователя"
                    value={field.state.value}
                    placeholder="Введите ваше имя пользователя"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    isInvalid={isInvalid}
                    errorMessage={errorMessage}
                    disabled={isSubmitting}
                  />
                );
              }}
            />

            <form.Field
              name="password"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const errorMessage = getFirstFieldError(
                  field.state.meta.errors,
                );

                return (
                  <AuthPasswordInput
                    name={field.name}
                    label="Пароль"
                    value={field.state.value}
                    placeholder="Пароль"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    isInvalid={isInvalid}
                    errorMessage={errorMessage}
                    showPassword={showPassword}
                    onTogglePassword={setShowPassword}
                    disabled={isSubmitting}
                  />
                );
              }}
            />

            <AuthSubmitButton
              isSubmitting={isSubmitting}
              submittingText="Входим..."
              idleText="Войти"
            />
            <LoginFormLinks />
          </>
        )}
      </form.Subscribe>
    </form>
  );
}
