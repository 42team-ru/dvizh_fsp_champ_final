import useAuthStore from "@/entity/auth/model/auth-store";
import { useUser } from "@/entity/user/model/use-user";
import LoadingPage from "@/pages/loading/ui/loading-page";
import { AuroraBackground } from "@/shared/components/ui/aurora-background";
import { Button } from "@/shared/components/ui/button";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Link, Navigate, Outlet, useLocation } from "react-router";

const RequireAuth = () => {
  const location = useLocation();
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const { user, isLoading, isError, error, refetch, isFetching } = useUser();

  if (!hasHydrated) {
    return <LoadingPage />;
  }

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isError && error?.status === 401) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (isError) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-6">
        <div className="pointer-events-none absolute inset-0">
          <AuroraBackground asLayer className="absolute inset-0" />
        </div>

        <section className="relative z-10 w-[min(92vw,460px)] rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xl backdrop-blur-sm">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <TriangleAlertIcon className="size-6" />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Не удалось загрузить профиль
            </h1>
            <p className="text-muted-foreground text-sm">
              {error?.detail ??
                "Проверьте подключение к сети или повторите попытку позже."}
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              asChild
              className="w-full sm:w-auto"
            >
              <Link to="/auth/login" replace>
                На страницу входа
              </Link>
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={isFetching}
              onClick={() => void refetch()}
              className="w-full sm:w-auto"
            >
              {isFetching ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              {isFetching ? "Загрузка..." : "Повторить"}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/auth/login"
        state={{ from: location, sessionUnconfirmed: true }}
        replace
      />
    );
  }

  return <Outlet />;
};

export default RequireAuth;
