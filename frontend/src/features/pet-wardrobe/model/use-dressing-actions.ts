import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  getPetsBundlesQueryKey,
  getPetsGetMineQueryKey,
  getPetsLooksQueryKey,
  getPetsShopQueryKey,
  usePetsBuySet,
  usePetsBuyBundle,
  usePetsDeleteLook,
  usePetsSaveLook,
  usePetsSaveMine,
} from "@/shared/api/generated/core/pets/pets";
import { getUsersWalletQueryKey } from "@/shared/api/generated/core/users/users";
import type { Look } from "./dressing";

/** Mutations share one invalidation path so profile, wallet, shop and bundle ownership stay consistent. */
export function useDressingActions(onSaved: (look: Look) => void) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [working, setWorking] = useState(false);
  const buy = usePetsBuySet();
  const bundle = usePetsBuyBundle();
  const save = usePetsSaveMine();
  const saveLook = usePetsSaveLook();
  const removeLook = usePetsDeleteLook();
  const refresh = () =>
    Promise.all(
      [
        getPetsGetMineQueryKey(),
        getPetsShopQueryKey(),
        getPetsBundlesQueryKey(),
        getPetsLooksQueryKey(),
        getUsersWalletQueryKey(),
      ].map((queryKey) => client.invalidateQueries({ queryKey })),
    );
  const purchase = async (
    items: string[],
    wear: boolean,
    bundleCode?: string,
  ) => {
    setWorking(true);
    try {
      const result = bundleCode
        ? await bundle.mutateAsync({ code: bundleCode })
        : await buy.mutateAsync({ data: { items, wear } });
      if (result.status !== 200) return null;
      if (wear) onSaved(result.data);
      await refresh();
      toast.success("Покупка удалась! Вещи уже в гардеробе", {
        duration: 4000,
        position: "bottom-center",
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-4 rounded-pill border-2 border-ink bg-ink px-5 py-4 text-sm font-bold text-primary-foreground shadow-hard-accent",
          actionButton:
            "min-h-11 shrink-0 rounded-pill bg-lime px-4 py-2 font-extrabold text-ink",
        },
        action: {
          label: "В гардероб",
          onClick: () => navigate("/profile/wardrobe"),
        },
      });
      return result.data;
    } catch {
      return null;
    } finally {
      setWorking(false);
    }
  };
  const wear = async (look: Look) => {
    setWorking(true);
    try {
      const result = await save.mutateAsync({
        data: { activity: look.activity, outfit: look.outfit },
      });
      if (result.status !== 200) return false;
      onSaved(result.data);
      await refresh();
      toast.success("Образ сохранён");
      return true;
    } catch {
      return false;
    } finally {
      setWorking(false);
    }
  };
  const remember = async (name: string, look: Look) => {
    setWorking(true);
    try {
      await saveLook.mutateAsync({
        data: { name, activity: look.activity, outfit: look.outfit },
      });
      await refresh();
      toast.success("Образ добавлен в «Мои образы»");
      return true;
    } catch {
      return false;
    } finally {
      setWorking(false);
    }
  };
  const forget = async (id: string) => {
    setWorking(true);
    try {
      await removeLook.mutateAsync({ id });
      await refresh();
      toast.success("Образ удалён");
    } catch {
      /* detail below */
    } finally {
      setWorking(false);
    }
  };
  return {
    purchase,
    wear,
    remember,
    forget,
    busy:
      working ||
      buy.isPending ||
      bundle.isPending ||
      save.isPending ||
      saveLook.isPending ||
      removeLook.isPending,
    error:
      buy.error?.detail ??
      bundle.error?.detail ??
      save.error?.detail ??
      saveLook.error?.detail ??
      removeLook.error?.detail,
    clearError: () => {
      buy.reset();
      bundle.reset();
      save.reset();
      saveLook.reset();
      removeLook.reset();
    },
  };
}
