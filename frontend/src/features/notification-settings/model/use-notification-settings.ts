import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getNotificationsSettingsQueryKey, getNotificationsTelegramQueryKey,
  useNotificationsSettings, useNotificationsSaveSettings, useNotificationsTelegram,
  useNotificationsTelegramLink, useNotificationsDisconnectTelegram,
  useNotificationsConnectEmail, useNotificationsDisconnectEmail,
  useNotificationsConnectMax, useNotificationsDisconnectMax,
} from "@/shared/api/generated/core/notifications/notifications";
import type { SaveNotificationSettingsRequest, TelegramLinkResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { toast } from "@/shared/lib/toast";

export function useNotificationSettings() {
  const client = useQueryClient();
  const settings = useNotificationsSettings();
  const [link, setLink] = useState<TelegramLinkResponse | null>(null);
  const telegram = useNotificationsTelegram({ query: { refetchInterval: link ? 3000 : false } });
  const save = useNotificationsSaveSettings();
  const telegramLink = useNotificationsTelegramLink();
  const disconnectTelegram = useNotificationsDisconnectTelegram();
  const connectEmail = useNotificationsConnectEmail();
  const disconnectEmail = useNotificationsDisconnectEmail();
  const connectMax = useNotificationsConnectMax();
  const disconnectMax = useNotificationsDisconnectMax();
  const [optimistic, setOptimistic] = useState<SaveNotificationSettingsRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: getNotificationsSettingsQueryKey() }),
    client.invalidateQueries({ queryKey: getNotificationsTelegramQueryKey() }),
  ]);

  useEffect(() => {
    if (link && telegram.data?.status === 200 && telegram.data.data.connected) {
      setLink(null);
      toast.success("Telegram подключён");
      void client.invalidateQueries({ queryKey: getNotificationsSettingsQueryKey() });
    }
  }, [telegram.data, link, client]);

  // Один запрос за раз: полная замена настроек не теряет соседний переключатель.
  async function run(action: () => Promise<unknown>, message?: string) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    try {
      await action();
      await invalidate();
      if (message) toast.success(message);
      return true;
    } catch (error) {
      toast.error((error as { detail?: string }).detail ?? "Не удалось сохранить настройки");
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  const loaded = settings.data?.status === 200 ? settings.data.data : undefined;
  return {
    settings, data: loaded && { ...loaded, ...optimistic }, busy, link,
    telegram: telegram.data?.status === 200 ? telegram.data.data : undefined,
    async update(next: SaveNotificationSettingsRequest) {
      if (locked.current) return;
      setOptimistic(next);
      try { await run(() => save.mutateAsync({ data: next })); }
      finally { setOptimistic(null); }
    },
    newTelegramLink: () => run(async () => {
      const response = await telegramLink.mutateAsync();
      if (response.status === 200) setLink(response.data);
    }),
    disconnectTelegram: () => run(() => disconnectTelegram.mutateAsync(), "Telegram отключён"),
    connectEmail: (email: string) => run(() => connectEmail.mutateAsync({ data: { email } }), "Почта подключена (демо: письма не отправляются)"),
    disconnectEmail: () => run(() => disconnectEmail.mutateAsync(), "Почта отключена"),
    connectMax: (phone: string) => run(() => connectMax.mutateAsync({ data: { phone } }), "MAX подключён (демо)"),
    disconnectMax: () => run(() => disconnectMax.mutateAsync(), "MAX отключён"),
  };
}
