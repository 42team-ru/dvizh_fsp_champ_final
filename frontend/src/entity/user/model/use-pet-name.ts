import { usePetsGetMine } from "@/shared/api/generated/core/pets/pets";
import { useUser } from "./use-user";

/** Имя бобра по умолчанию: так его зовут, пока хозяин не переименовал, и так он представляется до входа. */
export const DEFAULT_PET_NAME = "Бублик";

/** Имя бобра участника из профиля; у клуба, админа и до загрузки — «Бублик». */
export function usePetName() {
  const { user } = useUser();
  const pet = usePetsGetMine({ query: { enabled: user?.systemRole === "USER" } });
  return (pet.isError ? undefined : pet.data?.data?.name?.trim()) || DEFAULT_PET_NAME;
}
