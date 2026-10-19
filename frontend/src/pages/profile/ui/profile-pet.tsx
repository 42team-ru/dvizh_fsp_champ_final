import type { ReactNode } from "react";
import { PetNameEditor } from "@/features/rename-pet/ui/pet-name-editor";
import { BeaverPet } from "@/widgets/beaver-pet/ui/beaver-pet";
import type { BeaverActivity, BeaverOutfit } from "@/widgets/beaver-pet/ui/beaver-wardrobe";
import { MyBeaverPet } from "@/widgets/beaver-pet/ui/my-beaver-pet";
import { cn } from "cn";
import { usePublicProfile } from "../model/public-profile";

/** Бобр профиля: свой — из «моего» питомца, в чужом профиле — питомец владельца. */
export function ProfileBeaverPet({ className, speechContainer }: { className?: string; speechContainer: HTMLElement | null }) {
  const owner = usePublicProfile();
  if (!owner) return <MyBeaverPet className={className} speechContainer={speechContainer} />;
  const pet = owner.pet;
  return (
    <BeaverPet
      className={className}
      mood={pet?.mood}
      outfit={pet?.outfit as BeaverOutfit | undefined}
      activity={pet?.activity as BeaverActivity | undefined}
      speechContainer={speechContainer}
    />
  );
}

/** Имя питомца: своё можно переименовать, чужое только читается. */
export function ProfilePetName({ children, nameClassName }: { children?: ReactNode; nameClassName?: string }) {
  const owner = usePublicProfile();
  if (!owner) return <PetNameEditor nameClassName={nameClassName}>{children}</PetNameEditor>;
  return (
    <>
      <p className={cn("min-w-0 break-words font-display text-[22px] leading-tight font-extrabold text-foreground", nameClassName)}>
        {owner.pet?.name ?? "Без питомца"}
      </p>
      {children}
    </>
  );
}
