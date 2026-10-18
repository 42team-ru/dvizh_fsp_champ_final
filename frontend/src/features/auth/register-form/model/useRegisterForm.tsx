import { useForm } from "@tanstack/react-form";
import { useCallback, useRef, useState } from "react";
import {
  registerSchema,
  parseRegisterStep,
  REGISTER_STEP_FIELD_GROUPS,
  type RegisterFormValues,
} from "./register-shema";
import {
  useAuthRegister,
  type AuthRegisterMutationError,
} from "@/shared/api/generated/core/auth/auth";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  useUsernameAvailability,
  useEmailAvailability,
  clearFieldRemoteError,
  setFieldRemoteError,
} from "./use-availability-check";

export function useRegisterForm() {
  const navigate = useNavigate();
  const { mutateAsync: registerAsync } = useAuthRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordVerification, setShowPasswordVerification] =
    useState(false);
  const formRef = useRef<any>(null);

  const usernameCheck = useUsernameAvailability(formRef);
  const emailCheck = useEmailAvailability(formRef);

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      passwordVerification: "",
    },
    validators: {
      onSubmit: registerSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await registerAsync({
          data: {
            firstName: value.firstName,
            lastName: value.lastName,
            email: value.email,
            password: value.password,
            username: value.username,
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

  const validateStep = useCallback(
    async (step: 1 | 2 | 3) => {
      const values = form.store.state.values as RegisterFormValues;
      const fields = REGISTER_STEP_FIELD_GROUPS[step];
      const parsed = parseRegisterStep(step, values);

      if (!parsed.ok) {
        for (const name of fields) {
          const msg = parsed.fieldErrors[name];
          if (msg) {
            form.setFieldMeta(name, (prev) => ({
              ...prev,
              isTouched: true,
              errors: [msg],
              errorMap: { ...prev.errorMap, onChange: msg },
              errorSourceMap: { ...prev.errorSourceMap, onChange: "field" },
            }));
          } else {
            form.setFieldMeta(name, (prev) => ({
              ...prev,
              errors: [],
              errorMap: {},
              errorSourceMap: {},
            }));
          }
        }
        return false;
      }

      if (step === 2) {
        const [isUsernameFree, isEmailFree] = await Promise.all([
          usernameCheck.checkNow(values.username.trim()),
          emailCheck.checkNow(values.email.trim()),
        ]);

        if (isUsernameFree !== true || isEmailFree !== true) {
          return false;
        }
      }

      for (const name of fields) {
        form.setFieldMeta(name, (prev) => ({
          ...prev,
          errors: [],
          errorMap: {},
          errorSourceMap: {},
        }));
      }

      return true;
    },
    [form, usernameCheck.checkNow, emailCheck.checkNow],
  );

  return {
    form,
    isUsernameChecking: usernameCheck.isChecking,
    isEmailChecking: emailCheck.isChecking,
    isUsernameAvailable: usernameCheck.isAvailable,
    isEmailAvailable: emailCheck.isAvailable,
    showPassword,
    setShowPassword,
    showPasswordVerification,
    setShowPasswordVerification,
    scheduleUsernameAvailabilityCheck: usernameCheck.schedule,
    scheduleEmailAvailabilityCheck: emailCheck.schedule,
    validateStep,
  };
}
