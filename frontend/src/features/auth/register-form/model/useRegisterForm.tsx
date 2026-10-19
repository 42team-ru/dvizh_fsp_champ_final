import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { registerSchema, splitName } from "./register-shema";
import {
  useAuthLogin,
  useAuthRegister,
  type AuthRegisterMutationError,
} from "@/shared/api/generated/core/auth/auth";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
import { toast } from "@/shared/lib/toast";
import { useEmailAvailability } from "./use-availability-check";

export function useRegisterForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: registerAsync } = useAuthRegister();
  const { mutateAsync: loginAsync } = useAuthLogin();
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<any>(null);

  const emailCheck = useEmailAvailability(formRef);

  const form = useForm({
    defaultValues: {
      accountType: "USER" as "USER" | "ORG",
      name: "",
      email: "",
      password: "",
      city: "Красноярск",
      agree: false,
    },
    validators: {
      onSubmit: registerSchema,
    },
    onSubmit: async ({ value }) => {
      const email = value.email.trim();
      const isEmailFree = await emailCheck.checkNow(email);
      if (isEmailFree === false) {
        return;
      }

      try {
        // Логин совпадает с email: отдельного поля в форме нет.
        await registerAsync({
          data: {
            ...splitName(value.name),
            username: email,
            email,
            password: value.password,
            accountType: value.accountType,
          },
        });
        // Сразу входим, чтобы не заставлять человека повторять логин и пароль.
        await loginAsync({ data: { username: email, password: value.password } });
        queryClient.removeQueries({ queryKey: USER_QUERY_KEY });

        if (value.accountType === "ORG") {
          toast.success("Аккаунт клуба создан", { description: "Заполните анкету — это и есть заявка на допуск." });
          navigate("/my/org", { viewTransition: true });
        } else {
          toast.success("Добро пожаловать!");
          navigate("/onboarding", { viewTransition: true });
        }
      } catch (error: unknown) {
        const apiError = error as AuthRegisterMutationError;
        toast.error("Ошибка при регистрации", {
          description: apiError.detail ?? "Попробуйте снова позже.",
        });
      }
    },
  });
  formRef.current = form;

  return {
    form,
    isEmailChecking: emailCheck.isChecking,
    scheduleEmailAvailabilityCheck: emailCheck.schedule,
    showPassword,
    setShowPassword,
  };
}
