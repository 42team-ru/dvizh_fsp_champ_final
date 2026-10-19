import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getUsersLeaveTipQueryKey, useUsersCancelLeaveReminder, useUsersDismissLeaveTip, useUsersLeaveTip, useUsersSetLeaveReminder,
} from "@/shared/api/generated/core/users/users";
import type { LeaveTipResponse, TravelOptionResponse, TravelOptionResponseMode } from "@/shared/api/generated/core/appAPI.schemas";
import { toast } from "@/shared/lib/toast";

/** Запас к дороге: столько же добавляет сервер к рекомендуемому времени. */
const BUFFER_MINUTES = 5;

/** «пешком», «на автобусе», «на машине». */
export const TRAVEL_HOW: Record<Exclude<TravelOptionResponseMode, "NONE">, string> = {
  WALK: "пешком",
  BUS: "на автобусе",
  CAR: "на машине",
};

/**
 * «Бублик подсказывает»: ближайшее занятие, варианты дороги от сервера (маршрут 2ГИС или оценка), выбранный способ
 * и время, когда выходить. «Напомнить», «Отменить» и «Не надо» — команды сервера; после них подсказка перезапрашивается.
 */
export function useLeaveTip() {
  const cache = useQueryClient();
  const query = useUsersLeaveTip({ query: { refetchInterval: 5 * 60_000 } });
  // пустой ответ — подсказки нет
  const tip: LeaveTipResponse | undefined =
    query.data?.status === 200 && query.data.data && "occurrenceId" in query.data.data ? query.data.data : undefined;
  const [picked, setPicked] = useState<TravelOptionResponseMode>();

  const usable = (o: TravelOptionResponse) => o.available;
  const pickedOption = tip?.estimates.find((o) => o.mode === picked && usable(o));
  const savedOption = tip?.estimates.find((o) => o.mode === tip.reminder?.travelMode && usable(o));
  const option = pickedOption ?? savedOption ?? tip?.estimates.find((o) => o.mode === tip.recommendedMode);
  /** Когда выходить по выбранному способу; без дороги — когда напомнить по умолчанию. */
  const remindAt = tip && option
    ? new Date(new Date(tip.startAt).getTime() - (option.minutes + BUFFER_MINUTES) * 60_000).toISOString()
    : tip?.suggestedRemindAt;

  const refresh = () => cache.invalidateQueries({ queryKey: getUsersLeaveTipQueryKey() });
  const onError = (error: { detail?: string }) => toast.error("Не получилось", { description: error.detail ?? "Попробуйте ещё раз" });
  const set = useUsersSetLeaveReminder({ mutation: { onSuccess: () => { void refresh(); toast.success("Напомню, когда выходить"); }, onError } });
  const cancel = useUsersCancelLeaveReminder({ mutation: { onSuccess: () => { void refresh(); setPicked(undefined); }, onError } });
  const dismiss = useUsersDismissLeaveTip({ mutation: { onSuccess: () => void refresh(), onError } });

  return {
    tip,
    /** Ещё грузится: не показываем ни подсказку, ни запасной вариант, чтобы карточка не мигала. */
    loading: query.isPending,
    option,
    pick: setPicked,
    remindAt,
    busy: set.isPending || cancel.isPending || dismiss.isPending,
    remind: () => {
      if (!tip || !remindAt) return;
      set.mutate({ occurrenceId: tip.occurrenceId, data: {
        dueAt: remindAt, travelMode: option?.mode ?? "NONE", travelMinutes: option?.minutes,
      } });
    },
    cancel: () => tip && cancel.mutate({ occurrenceId: tip.occurrenceId }),
    dismiss: () => tip && dismiss.mutate({ occurrenceId: tip.occurrenceId }),
  };
}

export type LeaveTipModel = ReturnType<typeof useLeaveTip>;
