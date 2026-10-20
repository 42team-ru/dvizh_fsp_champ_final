import { toBackendUrl } from "@/shared/api/mutators/authMutator";
import { Icon } from "@/shared/components/ui/icon";
import { cn } from "cn";

/** Общая иллюстрация награды человека и клуба: цветная плитка или замок поверх рисунка. */
export function AchievementPicture({
  imageUrl,
  earned,
  size,
  tone = "bg-lime-soft",
}: {
  imageUrl: string;
  earned: boolean;
  size: "sm" | "lg" | "xl";
  tone?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border-2",
        size === "sm" && "size-10 rounded-xl",
        size === "lg" && "size-12 rounded-[14px]",
        size === "xl" && "size-[120px] rounded-[24px] sm:size-[168px]",
        earned
          ? cn("border-ink", tone)
          : "border-dashed border-muted-foreground bg-card",
      )}
    >
      <img
        src={toBackendUrl(imageUrl).toString()}
        alt=""
        className={cn(
          "size-full object-cover",
          !earned && "opacity-35 grayscale",
        )}
      />
      {!earned && (
        <span className="absolute right-0 bottom-0 flex size-[18px] items-center justify-center rounded-tl-lg border-t-2 border-l-2 border-dashed border-muted-foreground bg-card">
          <Icon name="profile/icon-lock" className="size-3" />
        </span>
      )}
    </span>
  );
}
