import { Link } from "react-router";
import { Shirt, ShoppingBag } from "lucide-react";
import { cn } from "cn";
import { useUser } from "@/entity/user/model/use-user";
import { useUsersWallet } from "@/shared/api/generated/core/users/users";
import { Button } from "@/shared/components/ui/button";

/** Два заметных входа к бобру: гардероб (что уже есть) и магазин (с балансом монет). Только у своего профиля. */
export function PetDressLinks({ className }: { className?: string }) {
  const { user } = useUser();
  const enabled = user?.systemRole === "USER";
  const wallet = useUsersWallet({ query: { enabled } });
  if (!enabled) return null;
  const coins = wallet.data?.status === 200 ? wallet.data.data.coins : undefined;
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <Button asChild variant="ink" className="min-h-11">
        <Link to="/profile/wardrobe">
          <Shirt className="size-[18px]" strokeWidth={2.4} />
          Гардероб
        </Link>
      </Button>
      <Button asChild variant="secondary" className="min-h-11">
        <Link to="/profile/shop">
          <ShoppingBag className="size-[18px]" strokeWidth={2.4} />
          Магазин
          {coins !== undefined && (
            <span className="rounded-pill border-[1.5px] border-ink bg-card px-2 py-0.5 text-xs font-extrabold">{coins} ◉</span>
          )}
        </Link>
      </Button>
    </div>
  );
}
