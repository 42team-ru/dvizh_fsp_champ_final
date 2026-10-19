import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { registerSchema } from "./register-shema";
import {
  useAuthLogin,
  useAuthRegister,
  type AuthRegisterMutationError,
} from "@/shared/api/generated/core/auth/auth";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
import { toast } from "@/shared/lib/toast";
import { useEmailAvailability, useUsernameAvailability } from "./use-availability-check";

export function useRegisterForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: registerAsync } = useAuthRegister();
  const { mutateAsync: loginAsync } = useAuthLogin();
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<any>(null);

  const emailCheck = useEmailAvailability(formRef);
  const usernameCheck = useUsernameAvailability(formRef);

  const form = useForm({
    defaultValues: {
      accountType: "USER" as "USER" | "ORG",
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: registerSchema,
    },
    onSubmit: async ({ value }) => {
      const email = value.email.trim();
      const username = value.username.trim();
      const [isEmailFree, isUsernameFree] = await Promise.all([
        emailCheck.checkNow(email),
        usernameCheck.checkNow(username),
      ]);
      if (isEmailFree === false || isUsernameFree === false) {
        return;
      }

      try {
        await registerAsync({
          data: {
            firstName: value.firstName.trim(),
            lastName: value.lastName.trim(),
            username,
            email,
            password: value.password,
            accountType: value.accountType,
          },
        });
        // Сразу входим, чтобы не заставлять человека повторять логин и пароль.
        await loginAsync({ data: { username, password: value.password } });
        queryClient.removeQueries({ queryKey: USER_QUERY_KEY });

        if (value.accountType === "ORG") {
          toast.success("Аккаунт клуба создан", { description: "Заполните анкету — это и есть заявка на допуск." });
          navigate("/onboarding/org", { viewTransition: true });
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
    emailCheck,
    usernameCheck,
    showPassword,
    setShowPassword,
  };
}
