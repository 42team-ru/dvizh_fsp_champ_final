import { useForm } from "@tanstack/react-form";
import { clearOfflineCache } from "@/shared/lib/offline-cache";
import { loginSchema } from "./login-shema";
import { useState } from "react";
import {
  useAuthLogout,
  useAuthLogin,
  type AuthLoginMutationError,
} from "@/shared/api/generated/core/auth/auth";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/lib/toast";
import { useNavigate } from "react-router";
import useAuthStore from "@/entity/auth/model/auth-store";

export function useLoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const { mutateAsync: loginAsync } = useAuthLogin();
  const { mutateAsync: logoutAsync } = useAuthLogout();
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        // best-effort: сброс куки логина на бэкенде, ошибка (нет сессии) не критична
        await logoutAsync().catch(() => undefined);
        useAuthStore.getState().logout();
        queryClient.removeQueries({ queryKey: USER_QUERY_KEY });
        await clearOfflineCache();

        await loginAsync({
          data: {
            username: value.username,
            password: value.password,
          },
        });

        toast.success("Успешный вход", {
          description: "Вы успешно вошли в систему",
        });

        queryClient.removeQueries({ queryKey: USER_QUERY_KEY });
        navigate("/", { viewTransition: true });
      } catch (error: unknown) {
        const apiError = error as AuthLoginMutationError;
        toast.error("Ошибка при входе", {
          description: apiError.detail ?? "Попробуйте снова позже.",
        });
      }
    },
  });

  return {
    form,
    showPassword,
    setShowPassword,
  };
}
