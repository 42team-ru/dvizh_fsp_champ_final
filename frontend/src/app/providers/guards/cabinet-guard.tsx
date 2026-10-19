import { Navigate, Outlet } from "react-router";
import { useCabinetAccess } from "@/entity/user/model/use-cabinet-access";
import LoadingPage from "@/pages/loading/ui/loading-page";

/** Кабинет только для организаторов: остальных возвращаем на главную. */
export default function CabinetGuard() {
  const { allowed, loading } = useCabinetAccess();
  if (loading) return <LoadingPage />;
  if (!allowed) return <Navigate to="/" replace />;
  return <Outlet />;
}
