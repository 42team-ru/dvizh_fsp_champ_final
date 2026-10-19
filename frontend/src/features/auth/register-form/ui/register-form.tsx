import { useStore } from "@tanstack/react-form";
import { useRegisterForm } from "../model/useRegisterForm";
import {
  CITIES,
  STRENGTH_LABEL,
  passwordStrength,
} from "../model/register-shema";
import { RegisterFormLinks } from "./register-form-links";
import { AuthTextInput } from "@/features/auth/shared/ui/auth-text-input";
import { AuthPasswordInput } from "@/features/auth/shared/ui/auth-password-input";
import { AuthSubmitButton } from "@/features/auth/shared/ui/auth-submit-button";
import { AuthField } from "@/shared/components/form/auth-field";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { getFirstFieldError } from "@/shared/lib/form-errors";
import { cn } from "cn";

const ACCOUNT_TYPES = [
  { value: "USER", title: "Я занимаюсь спортом", hint: "Ищу компанию и встречи" },
  { value: "ORG", title: "Я представляю клуб", hint: "Клуб, секция, сообщество" },
] as const;

export default function RegisterForm() {
  const {
    form,
    isEmailChecking,
    scheduleEmailAvailabilityCheck,
    showPassword,
    setShowPassword,
  } = useRegisterForm();
  const accountType = useStore(form.store, (state) => state.values.accountType);

  return (
    <>
      <form
        className="flex w-full max-w-[520px] flex-col gap-[14px] lg:gap-4"
        onSubmit={(evt) => {
          evt.preventDefault();
          form.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-[6px] leading-[normal] whitespace-nowrap">
          <h1 className="font-display text-[28px] leading-[normal] font-extrabold lg:text-[34px] tracking-[-0.5px] text-foreground">
            Регистрация
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            {accountType === "ORG"
              ? "Шаг 1 из 2 · дальше анкета клуба для допуска"
              : "Шаг 1 из 2 · дальше знакомство с Бубликом"}
          </p>
        </div>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <>
              <form.Field
                name="accountType"
                children={(field) => (
                  <div role="radiogroup" aria-label="Тип аккаунта" className="grid grid-cols-2 gap-2">
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
                            "flex flex-col items-start gap-0.5 rounded-[14px] border-2 border-ink px-4 py-3 text-left transition-colors",
                            active ? "bg-secondary shadow-hard-sm" : "bg-card hover:bg-muted"
                          )}
                        >
                          <span className="text-[15px] leading-5 font-extrabold text-foreground">
                            {active ? "✓ " : ""}{t.title}
                          </span>
                          <span className="text-xs leading-4 font-semibold text-muted-foreground">{t.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />

              <form.Field
                name="name"
                children={(field) => (
                  <AuthTextInput
                    name={field.name}
                    label={accountType === "ORG" ? "Контактное лицо: имя и фамилия" : "Имя и фамилия"}
                    value={field.state.value}
                    placeholder="Анна Соколова"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    errorMessage={getFirstFieldError(field.state.meta.errors)}
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
                      scheduleEmailAvailabilityCheck(e.target.value);
                    }}
                    isInvalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    errorMessage={
                      getFirstFieldError(field.state.meta.errors) ??
                      (isEmailChecking ? "Проверяем email..." : undefined)
                    }
                    disabled={isSubmitting}
                  />
                )}
              />

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
                                i <= strength ? "bg-secondary" : "bg-card"
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

              <form.Field
                name="city"
                children={(field) => (
                  <AuthField
                    name={field.name}
                    label="Город"
                    isInvalid={false}
                  >
                    <div className="relative">
                      <select
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={isSubmitting}
                        className="h-[52px] w-full appearance-none rounded-[14px] border-2 border-ink bg-card px-4 pr-11 text-[15px] font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        {CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      <img
                        src="/register/chevron.svg"
                        alt=""
                        className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2"
                      />
                    </div>
                  </AuthField>
                )}
              />

              <form.Field
                name="agree"
                children={(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <div className="flex flex-col gap-1">
                      <label className="flex items-start gap-[10px]">
                        <Checkbox
                          checked={field.state.value}
                          onCheckedChange={(checked) => field.handleChange(checked === true)}
                          onBlur={field.handleBlur}
                          disabled={isSubmitting}
                          aria-invalid={isInvalid}
                        />
                        <span className="flex-1 text-[13px] leading-[18px] font-semibold text-muted-foreground">
                          Согласен с <span className="text-primary">правилами сообщества</span> и{" "}
                          <span className="text-primary">политикой конфиденциальности</span>
                        </span>
                      </label>
                      {isInvalid ? (
                        <p role="alert" className="text-sm text-destructive">
                          {getFirstFieldError(field.state.meta.errors)}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />

              <AuthSubmitButton
                isSubmitting={isSubmitting}
                submittingText="Регистрируем..."
                idleText="Создать и продолжить"
              />
            </>
          )}
        </form.Subscribe>

        <RegisterFormLinks />
      </form>
    </>
  );
}
