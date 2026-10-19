import type {
  SaveUserPreferencesRequest, SaveUserPreferencesRequestDaysItem,
} from "@/shared/api/generated/core/appAPI.schemas";
import type { OnboardingData } from "../ui/onboarding-steps";

const LEVEL = { novice: "BEGINNER", amateur: "AMATEUR", pro: "PRO" } as const;
const DAYTIME = { morning: "MORNING", day: "DAY", evening: "EVENING" } as const;
const DAY: Record<string, SaveUserPreferencesRequestDaysItem> = {
  Пн: "MONDAY", Вт: "TUESDAY", Ср: "WEDNESDAY", Чт: "THURSDAY", Пт: "FRIDAY", Сб: "SATURDAY", Вс: "SUNDAY",
};

/** Ответы онбординга → тело users_saveMyPreferences. Без выбранных дней сервер ответит 400, поэтому шаг 3 их требует. */
export function toPreferences(data: OnboardingData): SaveUserPreferencesRequest {
  return {
    level: LEVEL[data.level],
    days: data.days.map((d) => DAY[d]),
    daytime: DAYTIME[data.daytime],
    radiusKm: data.radius,
    helpers: data.helpers,
    home: data.home ? { lon: data.home[0], lat: data.home[1] } : undefined,
  };
}
