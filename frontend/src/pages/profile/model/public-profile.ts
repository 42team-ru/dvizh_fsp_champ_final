import { createContext, useContext } from "react";
import type { PetResponse, PublicUserResponse } from "@/shared/api/generated/core/appAPI.schemas";

/** Чужой профиль: публичные данные человека и его питомец. */
export type PublicProfile = { user: PublicUserResponse; pet?: PetResponse };

const PublicProfileContext = createContext<PublicProfile | null>(null);

/**
 * Экран профиля внутри провайдера показывает чужой профиль: те же блоки, что и свой,
 * но данные берутся из публичного API, а кнопки правки скрыты.
 */
export const PublicProfileProvider = PublicProfileContext.Provider;

/** Чужой профиль, если экран открыт как публичный; `null` — свой. */
export const usePublicProfile = () => useContext(PublicProfileContext);
