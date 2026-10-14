import { Outlet } from "react-router";
import { AppSidebar } from "@/widgets/sidebar/ui/app-sidebar";
import { useUser } from "@/entity/user/model/use-user";

export default function DashboardLayout() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <AppSidebar user={user} />
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
