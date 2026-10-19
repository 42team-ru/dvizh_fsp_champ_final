import { useLoginForm } from "../model/useLoginForm";
import { AuthTextInput } from "@/features/auth/shared/ui/auth-text-input";
import { AuthPasswordInput } from "@/features/auth/shared/ui/auth-password-input";
import { AuthSubmitButton } from "@/features/auth/shared/ui/auth-submit-button";
import { getFirstFieldError } from "@/shared/lib/form-errors";
import { LoginFormLinks } from "./login-form-links";
import DemoAccounts from "@/features/auth/demo-accounts/ui/demo-accounts";

export default function LoginForm() {
  const { form, showPassword, setShowPassword } = useLoginForm();

  return (
    <div className="flex w-full flex-col items-center gap-[14px] xl:w-auto xl:flex-row xl:gap-12 2xl:gap-[72px]">
    <form
      className="flex w-full max-w-[400px] flex-col gap-[14px] lg:gap-[18px] xl:w-[400px] xl:min-w-0 2xl:w-[480px] 2xl:max-w-[480px]"
      onSubmit={(evt) => {
        evt.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-[6px] whitespace-nowrap">
        <h1 className="font-display text-[28px] leading-[normal] font-extrabold lg:text-4xl tracking-[-0.5px] text-foreground">
          Вход
        </h1>
        <p className="text-sm font-medium text-muted-foreground lg:text-[15px]">Рады видеть тебя снова</p>
      </div>
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
                    label="Логин"
                    value={field.state.value}
                    placeholder="anna"
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
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <DemoAccounts
          disabled={isSubmitting}
          onPick={(username, password) => {
            form.setFieldValue("username", username);
            form.setFieldValue("password", password);
          }}
        />
      )}
    </form.Subscribe>
    </div>
  );
}
