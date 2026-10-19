import { Navigate, Outlet } from "react-router";
import { useUser } from "@/entity/user/model/use-user";
import LoadingPage from "@/pages/loading/ui/loading-page";

/** Админка только для роли ADMIN: остальных возвращаем на главную (API всё равно ответит 403). */
export default function AdminGuard() {
  const { user, isLoading } = useUser();
  if (isLoading) return <LoadingPage />;
  if (user?.systemRole !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
}
