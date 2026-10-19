import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEY } from "@/entity/user/model/use-user";
import { getPetsGetMineQueryKey, usePetsCheer } from "@/shared/api/generated/core/pets/pets";

/** Настроения, из которых бобра можно развеселить: остальные и так хорошие. */
const LOW = new Set(["sad", "offended", "sleep"]);

/**
 * «Развеселить» своего бобра при первом контакте (тычок или поглаживание). Сервер запоминает момент:
 * плохие новости до него больше не портят настроение. Обновляет и бобра, и подпись в паспорте (auth/me).
 */
export function useCheerPet(mood: string | undefined) {
  const cache = useQueryClient();
  const cheer = usePetsCheer({ mutation: {
    onSuccess: (response) => {
      if (response.status === 200) cache.setQueryData(getPetsGetMineQueryKey(), response);
      void cache.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  } });
  return () => {
    if (mood && LOW.has(mood) && !cheer.isPending) cheer.mutate();
  };
}
