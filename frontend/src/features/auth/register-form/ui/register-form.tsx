import { useStore } from "@tanstack/react-form";
import { Check, User, Users } from "lucide-react";
import { useRegisterForm } from "../model/useRegisterForm";
import { STRENGTH_LABEL, passwordStrength } from "../model/register-shema";
import type { AvailabilityCheckState } from "../model/use-availability-check";
import { RegisterFormLinks } from "./register-form-links";
import { AuthTextInput } from "@/features/auth/shared/ui/auth-text-input";
import { AuthPasswordInput } from "@/features/auth/shared/ui/auth-password-input";
import { AuthSubmitButton } from "@/features/auth/shared/ui/auth-submit-button";
import { getFirstFieldError } from "@/shared/lib/form-errors";
import { cn } from "cn";

const ACCOUNT_TYPES = [
  { value: "USER", title: "Я участник", hint: "Хожу на тренировки и игры, ищу компанию", icon: User },
  { value: "ORG", title: "Мы организация", hint: "Клуб или секция. Проводим встречи, нужна проверка", icon: Users },
] as const;

/** Метка «свободен / занят» внутри поля логина и email. */
function Availability({ check }: { check: AvailabilityCheckState }) {
  if (check.isChecking) return <span className="text-xs font-bold text-muted-foreground">проверяем…</span>;
  if (check.isAvailable === true) {
    return (
      <span className="flex items-center gap-1 rounded-pill border-[1.5px] border-ink bg-secondary px-2 py-0.5 text-[11px] font-extrabold text-ink">
        <Check className="size-3" strokeWidth={3} />свободен
      </span>
    );
  }
  if (check.isAvailable === false) {
    return <span className="rounded-pill border-[1.5px] border-ink bg-peach px-2 py-0.5 text-[11px] font-extrabold text-ink">занят</span>;
  }
  return null;
}

export default function RegisterForm() {
  const { form, emailCheck, usernameCheck, showPassword, setShowPassword } = useRegisterForm();
  const accountType = useStore(form.store, (state) => state.values.accountType);

  return (
    <form
      className="flex w-full max-w-[560px] flex-col gap-[14px] lg:gap-4"
      onSubmit={(evt) => {
        evt.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-[6px]">
        <h1 className="font-display text-[28px] leading-[normal] font-extrabold tracking-[-0.5px] text-foreground lg:text-[38px]">
          Создадим аккаунт
        </h1>
        <p className="text-sm font-medium text-muted-foreground lg:text-[15px]">
          Сначала выбери, кто ты: от этого зависят следующие шаги.
        </p>
      </div>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <>
            <form.Field
              name="accountType"
              children={(field) => (
                <div role="radiogroup" aria-label="Тип аккаунта" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ACCOUNT_TYPES.map((t) => {
                    const active = field.state.value === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={isSubmitting}
                        onClick={() => field.handleChange(t.value)}
                        className={cn(
                          "flex items-start gap-3 rounded-[18px] border-2 border-ink p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          active ? "bg-primary text-white shadow-hard" : "bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-ink",
                          active ? "bg-secondary text-ink" : "bg-lavender-soft")}>
                          <t.icon className="size-5" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[15px] leading-5 font-extrabold">{t.title}</span>
                          <span className={cn("text-xs leading-4 font-semibold", active ? "text-white/80" : "text-muted-foreground")}>{t.hint}</span>
                        </span>
                        <span className={cn("mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                          active ? "border-ink bg-secondary text-ink" : "border-ink bg-card")}>
                          {active && <Check className="size-3.5" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />

            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:gap-4">
              <form.Field
                name="firstName"
                children={(field) => (
                  <AuthTextInput
                    name={field.name}
                    label={accountType === "ORG" ? "Имя контактного лица" : "Имя"}
                    value={field.state.value}
                    placeholder="Анна"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    errorMessage={getFirstFieldError(field.state.meta.errors)}
                    disabled={isSubmitting}
                  />
                )}
              />
              <form.Field
                name="lastName"
                children={(field) => (
                  <AuthTextInput
                    name={field.name}
                    label="Фамилия"
                    value={field.state.value}
                    placeholder="Смирнова"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    errorMessage={getFirstFieldError(field.state.meta.errors)}
                    disabled={isSubmitting}
                  />
                )}
              />
              <form.Field
                name="username"
                children={(field) => (
                  <AuthTextInput
                    name={field.name}
                    label="Логин"
                    value={field.state.value}
                    placeholder="anya.runs"
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      usernameCheck.schedule(e.target.value);
                    }}
                    isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    errorMessage={getFirstFieldError(field.state.meta.errors)}
                    endSlot={<Availability check={usernameCheck} />}
                    disabled={isSubmitting}
                  />
                )}
              />
              <form.Field
                name="email"
                children={(field) => (
                  <AuthTextInput
                    name={field.name}
                    label="Email"
                    type="email"
                    value={field.state.value}
                    placeholder="anna@mail.ru"
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      emailCheck.schedule(e.target.value);
                    }}
                    isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    errorMessage={getFirstFieldError(field.state.meta.errors)}
                    endSlot={<Availability check={emailCheck} />}
                    disabled={isSubmitting}
                  />
                )}
              />
            </div>

            <form.Field
              name="password"
              children={(field) => {
                const strength = passwordStrength(field.state.value);
                return (
                  <AuthPasswordInput
                    name={field.name}
                    label="Пароль"
                    value={field.state.value}
                    placeholder="Не менее 8 символов"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    errorMessage={getFirstFieldError(field.state.meta.errors)}
                    showPassword={showPassword}
                    onTogglePassword={setShowPassword}
                    disabled={isSubmitting}
                    footer={
                      <div className="flex min-h-[17px] items-center gap-[6px]">
                        {[1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={cn(
                              "box-border h-2 flex-1 rounded-full border-[1.5px] border-ink",
                              i <= strength ? "bg-secondary" : "bg-card",
                            )}
                          />
                        ))}
                        <span className="text-xs font-bold whitespace-nowrap text-muted-foreground">
                          {STRENGTH_LABEL[strength]}
                        </span>
                      </div>
                    }
                  />
                );
              }}
            />

            <AuthSubmitButton isSubmitting={isSubmitting} submittingText="Создаём..." idleText="Создать аккаунт" />
            <p className="text-center text-xs font-semibold text-muted-foreground">
              {accountType === "ORG"
                ? "Дальше анкета клуба и документы для проверки"
                : "Дальше 6 коротких шагов — около 2 минут, любой можно пропустить"}
            </p>
          </>
        )}
      </form.Subscribe>

      <RegisterFormLinks />
    </form>
  );
}
