import { useId, useState, type ReactNode } from "react";
import { Bell, Check, CircleOff, Mail, MessageCircle, Settings2, Smartphone } from "lucide-react";
import { z } from "zod";
import { useUser } from "@/entity/user/model/use-user";
import type { Channel, NotificationSettingsResponseCategoriesItem } from "@/shared/api/generated/core/appAPI.schemas";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "cn";
import { NOTIFICATION_CATEGORY_LABEL } from "@/shared/lib/statuses";
import { useNotificationSettings } from "../model/use-notification-settings";

type Model = ReturnType<typeof useNotificationSettings>;
const CHANNELS = {
  TELEGRAM: { name: "Telegram", icon: MessageCircle, tone: "bg-sky-soft" },
  MAX: { name: "MAX", icon: Smartphone, tone: "bg-lavender-soft" },
  EMAIL: { name: "Email", icon: Mail, tone: "bg-lime-soft" },
};

/** Самостоятельный диалог: остальная вкладка активности продолжает работать как прежде. */
export function NotificationSettingsDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-[24px] border-[2.5px] border-ink p-0 shadow-[8px_8px_0_var(--ink)] sm:max-w-[640px] [&>button]:size-11">
        <div className="border-b-2 border-ink bg-secondary px-5 py-5 pr-12 sm:px-7">
          <span className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-widest"><Bell className="size-4" /> НА СВЯЗИ</span>
          <DialogTitle className="font-display text-xl leading-7 font-extrabold">Настройки уведомлений</DialogTitle>
          <DialogDescription className="mt-2 text-sm font-semibold text-foreground">Выберите, куда и о чём вам сообщать.</DialogDescription>
        </div>
        {open && <SettingsForm />}
      </DialogContent>
    </Dialog>
  );
}

/** Кнопка входа добавляется к активности без перестройки существующих блоков. */
export function NotificationSettingsButton({ className }: { className?: string }) {
  return <NotificationSettingsDialog>
    <Button variant="outline" className={cn("min-h-11 gap-2 text-sm", className)}><Settings2 className="size-4" />Настроить уведомления</Button>
  </NotificationSettingsDialog>;
}

function SettingsForm() {
  const m = useNotificationSettings();
  const { user } = useUser();
  const prefix = useId();
  if (!m.data) return <div className="p-6" role="status">
    {m.settings.isError ? <><p role="alert">Не удалось загрузить настройки.</p><Button variant="outline" className="mt-4" onClick={() => void m.settings.refetch()}>Повторить</Button></> : "Загружаем настройки…"}
  </div>;
  const data = m.data;
  return (
    <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7" aria-busy={m.busy}>
      <section aria-labelledby={`${prefix}-channels`} className="space-y-3">
        <h2 id={`${prefix}-channels`} className="font-display text-lg font-bold">Куда присылать</h2>
        {data.availableChannels.map((channel) => <ChannelCard key={channel.channel} channel={channel} m={m} />)}
      </section>
      <section aria-labelledby={`${prefix}-categories`} className="mt-7">
        <h2 id={`${prefix}-categories`} className="mb-2 font-display text-lg font-bold">Что присылать</h2>
        {(Object.entries(NOTIFICATION_CATEGORY_LABEL) as [NotificationSettingsResponseCategoriesItem, { label: string; description: string }][])
          .filter(([key]) => key !== "ORGANIZATIONS" || user?.systemRole === "ORG" || user?.systemRole === "ADMIN")
          .map(([key, value]) => {
            const disabled = key === "REMINDERS" && !data.reminders;
            return <div key={key} className="flex min-h-16 items-center justify-between gap-4 border-b border-ink/15 py-3">
              <label htmlFor={`${prefix}-${key}`} className="flex min-h-11 cursor-pointer flex-col justify-center">
                <span className="block text-base font-bold">{value.label}</span>
                <span id={`${prefix}-${key}-hint`} className="block text-sm text-muted-foreground">{disabled ? "Напоминания выключены в предпочтениях" : value.description}</span>
              </label>
              <div className="flex min-h-11 items-center">
                <Switch id={`${prefix}-${key}`} aria-describedby={`${prefix}-${key}-hint`} disabled={m.busy || disabled}
                  checked={!disabled && data.categories.includes(key)} onCheckedChange={(checked) => void m.update({ channels: data.channels,
                    categories: checked ? [...data.categories, key] : data.categories.filter((c) => c !== key) })} />
              </div>
            </div>;
          })}
      </section>
      <p className="mt-5 rounded-[14px] border-2 border-ink bg-sky-soft p-4 text-sm font-semibold">Внутри приложения уведомления приходят всегда — здесь только внешние каналы.</p>
      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-center text-sm text-muted-foreground">{m.busy ? "Сохраняем…" : "Изменения сохраняются автоматически"}</p>
    </div>
  );
}

function ChannelCard({ channel, m }: { channel: Channel; m: Model }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const info = CHANNELS[channel.channel];
  const Icon = info.icon;
  const disabledHint = !channel.available ? "Telegram пока недоступен" : !channel.connected ? `Сначала подключите ${info.name}` : undefined;
  const data = m.data!;
  async function disconnect() {
    const ok = await (channel.channel === "TELEGRAM" ? m.disconnectTelegram() : channel.channel === "EMAIL" ? m.disconnectEmail() : m.disconnectMax());
    if (ok) { setConfirm(false); setEditing(false); }
  }
  return (
    <Card className="gap-3 rounded-[18px] border-2 border-ink p-4 shadow-none">
      <div className="flex items-start gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink ${info.tone}`}><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-extrabold">{info.name}</h3>{channel.mode === "MOCK" && <Badge variant="muted">Демо</Badge>}</div>
          <div className="mt-1 flex items-center gap-1 text-sm font-semibold">{channel.connected ? <Check className="size-4" /> : <CircleOff className="size-4" />}{channel.connected ? "Подключено" : "Не подключено"}</div>
          {channel.target && <p className="mt-1 break-all text-sm text-muted-foreground">{channel.target}</p>}
        </div>
      </div>
      {channel.channel === "TELEGRAM" ? <>
        {!channel.available && <p className="text-sm text-muted-foreground">Telegram пока недоступен</p>}
        {!channel.connected && !m.link && <Button variant="outline" className="self-start" disabled={m.busy || !channel.available} onClick={() => void m.newTelegramLink()}>Подключить Telegram</Button>}
        {!channel.connected && m.link && <div className="space-y-2 rounded-[14px] bg-sky-soft p-3">
          <Button asChild className="w-full"><a href={m.link.url} target="_blank" rel="noopener noreferrer">Открыть Telegram</a></Button>
          <p className="text-sm">Нажмите Start в боте. Ссылка действует до {new Date(m.link.expiresAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}.</p>
          <Button variant="ghost" disabled={m.busy} onClick={() => void m.newTelegramLink()}>Получить новую ссылку</Button>
        </div>}
      </> : <>
        {(!channel.connected || editing) && <ContactForm key={channel.target ?? "new"} channel={channel} m={m} onDone={() => setEditing(false)} />}
        {channel.connected && !editing && <Button variant="outline" className="self-start" disabled={m.busy} onClick={() => setEditing(true)}>Изменить</Button>}
        {editing && <Button variant="ghost" className="self-start" disabled={m.busy} onClick={() => setEditing(false)}>Отмена</Button>}
        <p className="text-sm text-muted-foreground">{channel.channel === "EMAIL" ? "Демо: письма не отправляются." : "Демо: сообщения в MAX не отправляются."}</p>
      </>}
      {channel.connected && (confirm ? <div className="rounded-[14px] border-2 border-ink bg-secondary p-3">
        <p className="mb-3 text-sm font-bold">Отключить {info.name}? Уведомления в этот канал перестанут приходить.</p>
        <div className="flex flex-wrap gap-2"><Button disabled={m.busy} variant="outline" onClick={() => void disconnect()}>Да, отключить</Button><Button variant="ghost" disabled={m.busy} onClick={() => setConfirm(false)}>Отмена</Button></div>
      </div> : <Button variant="ghost" className="self-start" disabled={m.busy} onClick={() => setConfirm(true)}>Отключить</Button>)}
      <div className="flex min-h-11 items-center justify-between gap-3 border-t border-ink/15 pt-2">
        <div><label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold">Присылать сюда</label>{disabledHint && <p id={`${id}-hint`} className="text-sm text-muted-foreground">{disabledHint}</p>}</div>
        <Switch id={id} aria-describedby={disabledHint ? `${id}-hint` : undefined} disabled={m.busy || !channel.connected || !channel.available}
          checked={data.channels.includes(channel.channel)} onCheckedChange={(checked) => void m.update({ categories: data.categories,
            channels: checked ? [...data.channels, channel.channel] : data.channels.filter((c) => c !== channel.channel) })} />
      </div>
    </Card>
  );
}

/** Маска остаётся редактируемой, вставка номера с 8 также поддерживается. */
function phoneMask(value: string) {
  let digits = value.replace(/\D/g, "");
  if (!digits) return value === "+" ? "+" : "";
  if (digits.startsWith("7") || digits.startsWith("8")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return "+7";
  return "+7 (" + digits.slice(0, 3) + (digits.length > 3 ? ") " : "") + digits.slice(3, 6)
    + (digits.length > 6 ? "-" + digits.slice(6, 8) : "") + (digits.length > 8 ? "-" + digits.slice(8) : "");
}

function ContactForm({ channel, m, onDone }: { channel: Channel; m: Model; onDone(): void }) {
  const id = useId();
  const email = channel.channel === "EMAIL";
  const [value, setValue] = useState(channel.target ?? "");
  const [error, setError] = useState("");
  return <form noValidate className="space-y-2" onSubmit={async (event) => {
    event.preventDefault();
    const valid = email ? z.string().email().max(254).safeParse(value.trim()).success : /^\+7\d{10}$/.test(value.replace(/[\s()-]/g, ""));
    if (!valid) { setError(email ? "Неверный адрес почты" : "Неверный номер телефона"); return; }
    setError("");
    if (await (email ? m.connectEmail(value.trim()) : m.connectMax(value))) onDone();
  }}>
    <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center text-sm font-bold">{email ? "Адрес почты" : "Номер телефона MAX"}</label>
    <Input id={id} type={email ? "email" : "tel"} autoComplete={email ? "email" : "tel"} value={value} disabled={m.busy}
      maxLength={email ? 254 : 32} placeholder={email ? "you@example.ru" : "+7 (___) ___-__-__"} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      onChange={(event) => { setValue(email ? event.target.value : phoneMask(event.target.value)); setError(""); }} />
    {error && <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
    <Button type="submit" variant="outline" disabled={m.busy}>{channel.connected ? "Обновить" : "Подключить"}</Button>
  </form>;
}
