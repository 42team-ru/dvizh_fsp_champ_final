import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { registerSchema, splitName } from "./register-shema";
import {
  useAuthRegister,
  type AuthRegisterMutationError,
} from "@/shared/api/generated/core/auth/auth";
import { useNavigate } from "react-router";
import { toast } from "@/shared/lib/toast";
import { useEmailAvailability } from "./use-availability-check";

export function useRegisterForm() {
  const navigate = useNavigate();
  const { mutateAsync: registerAsync } = useAuthRegister();
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<any>(null);

  const emailCheck = useEmailAvailability(formRef);

  const form = useForm({
    defaultValues: {
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
          },
        });

        toast.success(
          "Регистрация прошла успешно! Теперь вы можете войти в систему.",
          {
            description:
              "Пожалуйста, войдите в систему, используя свои учетные данные.",
          },
        );

        navigate("/auth/login", { viewTransition: true });
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
