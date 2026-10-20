import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getOrganizationsMeQueryKey,
  useOrganizationsMe,
  useOrganizationsSaveMine,
} from "@/shared/api/generated/core/organizations/organizations";
import type { OrganizationResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { CONTACT_TYPES, ORGANIZATION_STATUS, ORGANIZATION_STATUS_HINT } from "@/shared/lib/statuses";
import { SportPicker, type PickedSport } from "@/features/sport-picker/ui/sport-picker";
import { Button } from "@/shared/components/ui/button";
import { toast } from "@/shared/lib/toast";
import { cn } from "cn";
import { CabinetLayout } from "./cabinet-layout";
import { Chip, FieldLabel, inputClass, textareaClass } from "./parts";

type Form = { name: string; description: string; city: string; contacts: Record<string, string>; sports: PickedSport[] };

const EMPTY: Form = { name: "", description: "", city: "", contacts: {}, sports: [] };

const toForm = (org: OrganizationResponse): Form => ({
  name: org.name ?? "",
  description: org.description ?? "",
  city: org.city ?? "",
  contacts: { ...(org.contacts ?? {}) },
  sports: (org.sports ?? []).map((s) => ({ sportId: s.id, name: s.name })),
});

/** Плашка статуса заявки: что это значит и что делать дальше. Причину отказа показываем дословно. */
function StatusPanel({ org }: { org?: OrganizationResponse }) {
  if (!org?.status) {
    return (
      <div className="rounded-[20px] border-2 border-ink bg-lavender-soft p-5">
        <p className="font-display text-lg font-bold text-foreground">Заявка ещё не отправлена</p>
        <p className="mt-1 text-[15px] font-medium text-foreground">
          Заполните анкету и нажмите «Отправить на проверку». Администратор рассмотрит её и примет решение.
        </p>
      </div>
    );
  }
  const status = ORGANIZATION_STATUS[org.status];
  const hint = ORGANIZATION_STATUS_HINT[org.status];
  const tone = org.status === "APPROVED" ? "bg-lime-soft" : org.status === "PENDING" ? "bg-sky-soft" : "bg-peach";
  return (
    <div role="status" className={cn("flex flex-col gap-2 rounded-[20px] border-2 border-ink p-5", tone)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display text-lg font-bold text-foreground">{hint.title}</p>
        <Chip tone="bg-card">{status.label}</Chip>
      </div>
      <p className="text-[15px] font-medium text-foreground">{hint.text}</p>
      {org.rejectReason && org.status !== "APPROVED" && (
        <p className="rounded-[12px] border-2 border-ink bg-card px-3.5 py-2.5 text-[15px] font-bold text-foreground">
          Комментарий администратора: «{org.rejectReason}»
        </p>
      )}
      {org.status === "APPROVED" && org.id && (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="ink">
            <Link to="/events/new">Создать мероприятие</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={`/orgs/${org.id}`}>
              Публичная страница <ArrowUpRight className="size-4" strokeWidth={2.6} />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Анкета организации. Отдельной кнопки «подать» на сервере нет: сохранение анкеты и есть заявка
 * (первая анкета и правка после отказа уходят на проверку, правка допущенной статус не меняет).
 */
export default function OrgProfilePage() {
  const queryClient = useQueryClient();
  const me = useOrganizationsMe({ query: { retry: false } });
  const org = me.data?.status === 200 ? me.data.data : undefined;
  const save = useOrganizationsSaveMine();
  const [f, setF] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (org) setF(toForm(org));
  }, [org]);

  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }));
  const setContact = (key: string, value: string) => set({ contacts: { ...f.contacts, [key]: value } });

  const submit = () => {
    setError(null);
    const contacts = Object.fromEntries(Object.entries(f.contacts).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    if (!f.name.trim()) return setError("Укажите название клуба");
    if (!f.description.trim()) return setError("Расскажите, чем занимается клуб");
    if (f.sports.length === 0) return setError("Добавьте хотя бы один вид спорта");
    if (Object.keys(contacts).length === 0) return setError("Оставьте хотя бы один контакт");
    save.mutate(
      {
        data: {
          name: f.name.trim(),
          description: f.description.trim(),
          city: f.city.trim() || undefined,
          contacts,
          sportIds: f.sports.flatMap((s) => (s.sportId ? [s.sportId] : [])),
          sportNames: f.sports.flatMap((s) => (s.sportId ? [] : [s.name])),
        },
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getOrganizationsMeQueryKey() });
          toast.success(org?.status === "APPROVED" ? "Анкета сохранена" : "Анкета отправлена на проверку");
        },
        onError: (e) => setError(e.detail ?? "Не удалось сохранить анкету"),
      },
    );
  };

  const submitLabel = !org || org.status === "REJECTED" || org.status === "REVISION" ? "Отправить на проверку" : "Сохранить";

  return (
    <CabinetLayout>
      <h1 className="font-display text-[28px] leading-[34px] font-extrabold text-foreground">Анкета клуба</h1>
      {me.isLoading ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : (
        <>
          <StatusPanel org={org} />
          <form
            className="flex flex-col gap-5 rounded-[24px] border-2 border-ink bg-card p-5 sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="org-name">Название</FieldLabel>
              <input id="org-name" className={inputClass} maxLength={200} value={f.name}
                placeholder="Шахматный клуб «Ладья»" onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="org-description">Чем занимается клуб</FieldLabel>
              <textarea id="org-description" className={textareaClass} rows={4} maxLength={5000} value={f.description}
                placeholder="Кто мы, где и как часто занимаемся, кого ждём"
                onChange={(e) => set({ description: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5 sm:w-1/2">
              <FieldLabel htmlFor="org-city">Город</FieldLabel>
              <input id="org-city" className={inputClass} maxLength={100} value={f.city}
                placeholder="Красноярск" onChange={(e) => set({ city: e.target.value })} />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>Виды спорта (до 10)</FieldLabel>
              {f.sports.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {f.sports.map((s) => (
                    <li key={s.sportId ?? s.name}
                      className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-secondary py-1 pr-1.5 pl-3.5 text-[15px] font-extrabold">
                      {s.name}{!s.sportId && " · новый"}
                      <button type="button" aria-label={`Убрать «${s.name}»`} className="rounded-full p-1 hover:bg-card"
                        onClick={() => set({ sports: f.sports.filter((x) => x !== s) })}>
                        <X className="size-4" strokeWidth={2.6} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {f.sports.length < 10 && (
                <SportPicker
                  exclude={f.sports.flatMap((s) => (s.sportId ? [s.sportId] : []))}
                  onPick={(s) => {
                    if (!f.sports.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) set({ sports: [...f.sports, s] });
                  }}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>Контакты — хотя бы один</FieldLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CONTACT_TYPES.map((c) => (
                  <label key={c.key} className="flex flex-col gap-1 text-sm font-bold text-foreground">
                    {c.label}
                    <input className={inputClass} value={f.contacts[c.key] ?? ""} placeholder={c.placeholder}
                      onChange={(e) => setContact(c.key, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>

            {error && <p role="alert" className="text-base font-bold text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="self-start" disabled={save.isPending}>
              {save.isPending ? "Сохраняем…" : submitLabel}
            </Button>
          </form>
        </>
      )}
    </CabinetLayout>
  );
}
