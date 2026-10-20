import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthLogout } from "@/shared/api/generated/core/auth/auth";
import useAuthStore from "@/entity/auth/model/auth-store";
import { clearOfflineCache } from "@/shared/lib/offline-cache";

/**
 * Выход: сервер гасит cookie, локально чистим токен и весь кэш запросов —
 * следующий аккаунт (демо-кнопки) не увидит чужие данные. Затем — на страницу входа.
 */
export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthLogout();
  const signOut = async () => {
    await logout.mutateAsync().catch(() => undefined);
    useAuthStore.getState().logout();
    queryClient.clear();
    await clearOfflineCache();
    navigate("/auth/login", { replace: true });
  };
  return { signOut, pending: logout.isPending };
}
