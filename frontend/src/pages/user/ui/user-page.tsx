import { Link, Navigate, useParams } from "react-router";
import { useUser } from "@/entity/user/model/use-user";
import { useUsersGet } from "@/shared/api/generated/core/users/users";
import { usePetsGetUser } from "@/shared/api/generated/core/pets/pets";
import ProfilePage from "@/pages/profile/ui/profile-page";
import { PublicProfileProvider } from "@/pages/profile/model/public-profile";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

/** Чужой профиль: тот же экран, что свой, но данные публичные и без правки. */
export default function UserPage() {
  const { id = "" } = useParams();
  const { user: me } = useUser();
  const profile = useUsersGet(id, { query: { enabled: Boolean(id), retry: false } });
  const petQuery = usePetsGetUser(id, { query: { enabled: Boolean(id), retry: false } });

  if (me?.id && me.id === id) return <Navigate to="/profile" replace />;

  const user = profile.data?.status === 200 ? profile.data.data : undefined;
  const pet = petQuery.data?.status === 200 ? petQuery.data.data : undefined;

  if (user && !petQuery.isPending) {
    return (
      <PublicProfileProvider value={{ user, pet }}>
        <ProfilePage />
      </PublicProfileProvider>
    );
  }

  return (
    <div className="relative isolate min-h-dvh overflow-clip bg-background">
      <MemphisBackground seed="user" />
      <div className="hidden lg:block">
        <AppHeader current="feed" />
      </div>
      <main className="mx-auto flex w-full max-w-[960px] flex-col gap-4 px-4 pt-4 lg:px-8 lg:pt-8">
        {profile.isPending || petQuery.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">Загружаем профиль…</p>
        ) : (
          <Card className="gap-3 p-6">
            <h1 className="font-display text-xl font-bold">Профиль не найден</h1>
            <p className="text-sm text-muted-foreground">Возможно, ссылка устарела.</p>
            <Button asChild variant="soft" className="self-start"><Link to="/feed">К ленте</Link></Button>
          </Card>
        )}
      </main>
    </div>
  );
}
