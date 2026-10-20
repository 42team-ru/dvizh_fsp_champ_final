import { useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, FileText, ImagePlus, Plus, Send, Trash2, Upload, X } from "lucide-react";
import type { OrganizationResponse } from "@/shared/api/generated/core/appAPI.schemas";
import {
  getOrganizationsMeQueryKey, useOrganizationsAddDocument, useOrganizationsMe, useOrganizationsRemoveDocument,
  useOrganizationsSaveMine, useOrganizationsUploadLogo,
} from "@/shared/api/generated/core/organizations/organizations";
import { SportPicker, type PickedSport } from "@/features/sport-picker/ui/sport-picker";
import { Button } from "@/shared/components/ui/button";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { CONTACT_TYPES } from "@/shared/lib/statuses";
import { cn } from "cn";
import { Heading, TalkingBeaver } from "./onboarding-steps";

const STEPS = ["Анкета", "Документы", "Проверка"];
const MAX_DOCUMENTS = 10;
const MAX_SPORTS = 10;
const FOOTER_HINT = ["Анкету видит только администратор, пока её не одобрят", "После отправки анкета уйдёт администратору"];

const label = "text-[11px] font-extrabold tracking-[1.5px] text-foreground";
const input =
  "w-full rounded-[14px] border-2 border-ink bg-card px-4 py-3 text-base font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-ring/40";
const card = "rounded-[22px] border-2 border-ink bg-card";

type Contact = { type: string; value: string };
type Form = { name: string; description: string; city: string; contacts: Contact[]; sports: PickedSport[] };

const toForm = (org?: OrganizationResponse): Form => ({
  name: org?.name ?? "",
  description: org?.description ?? "",
  city: org?.city ?? "",
  contacts: Object.entries(org?.contacts ?? {}).map(([type, value]) => ({ type, value })).concat(
    org?.contacts && Object.keys(org.contacts).length ? [] : [{ type: "TELEGRAM", value: "" }],
  ),
  sports: (org?.sports ?? []).map((s) => ({ sportId: s.id, name: s.name })),
});

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

/** Онбординг организации: анкета → документы → плашка «на проверке». Сохранение анкеты и есть заявка. */
export default function OrgOnboardingPage() {
  const me = useOrganizationsMe({ query: { retry: false } });
  const ready = !me.isPending;
  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-background">
      <MemphisBackground seed="org-onboarding" />
      {ready ? (
        <Wizard org={me.data?.status === 200 ? me.data.data : undefined} />
      ) : (
        <p role="status" className="m-auto text-sm font-semibold text-muted-foreground">Загружаем…</p>
      )}
    </div>
  );
}

function Wizard({ org }: { org?: OrganizationResponse }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(() => toForm(org));
  const [logo, setLogo] = useState<{ file: File; url: string }>();
  const [error, setError] = useState<string>();
  const save = useOrganizationsSaveMine();
  const uploadLogo = useOrganizationsUploadLogo();
  const busy = save.isPending || uploadLogo.isPending;
  const refresh = () => queryClient.invalidateQueries({ queryKey: getOrganizationsMeQueryKey() });

  const contacts = Object.fromEntries(form.contacts.map((c) => [c.type, c.value.trim()]).filter(([, v]) => v));
  const canNext = form.name.trim().length > 0 && form.description.trim().length > 0
    && form.sports.length > 0 && Object.keys(contacts).length > 0;

  const submitProfile = async () => {
    setError(undefined);
    try {
      await save.mutateAsync({ data: {
        name: form.name.trim(),
        description: form.description.trim(),
        city: form.city.trim() || undefined,
        contacts,
        sportIds: form.sports.flatMap((s) => (s.sportId ? [s.sportId] : [])),
        sportNames: form.sports.flatMap((s) => (s.sportId ? [] : [s.name])),
      } });
      if (logo) await uploadLogo.mutateAsync({ data: { file: logo.file } });
      await refresh();
      setStep(2);
      document.querySelector("main")?.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as { detail?: string })?.detail ?? "Не удалось сохранить анкету");
    }
  };

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 lg:px-10">
        <div className="flex items-center gap-[10px]">
          <img src="/icon.svg" alt="" className="size-9 shrink-0" />
          <span className="hidden font-display text-base font-bold sm:inline">Движ</span>
        </div>
        <ol className="flex items-center gap-2" aria-label="Шаги">
          {STEPS.map((title, i) => {
            const done = i + 1 < step;
            const current = i + 1 === step;
            return (
              <li key={title} aria-current={current ? "step" : undefined}
                className={cn("flex items-center gap-1.5 rounded-pill border-2 px-2 py-1 text-xs font-extrabold",
                  current ? "border-ink bg-card" : "border-transparent text-muted-foreground")}>
                <span className={cn("flex size-5 items-center justify-center rounded-full border-[1.5px] border-ink text-[11px]",
                  done ? "bg-secondary" : current ? "bg-primary text-white" : "bg-card")}>
                  {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn(!current && "hidden sm:inline")}>{title}</span>
              </li>
            );
          })}
        </ol>
        {step < 3 ? (
          <button type="button" onClick={() => navigate("/my/org")} className="text-sm font-extrabold text-primary">
            Сохранить и выйти
          </button>
        ) : <span />}
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 lg:px-10">
        <div className="m-auto w-full max-w-[1200px] py-4">
        {step === 1 && <StepForm form={form} setForm={setForm} logo={logo?.url ?? org?.logoUrl} onLogo={(file) => setLogo({ file, url: URL.createObjectURL(file) })} />}
        {step === 2 && <StepDocuments />}
        {step === 3 && <StepSent />}
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-destructive">{error}</p>}
        </div>
      </main>

      <footer className="shrink-0 border-t-2 border-track bg-background">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 lg:px-10">
          {step === 2 ? (
            <Button variant="outline" className="h-12" onClick={() => setStep(1)}><ArrowLeft className="size-4" />Назад</Button>
          ) : <span />}
          {step < 3 && (
            <p className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <Check className="size-4 text-primary" />{FOOTER_HINT[step - 1]}
            </p>
          )}
          {step === 1 && (
            <Button className="h-12 px-6" disabled={!canNext || busy} onClick={() => void submitProfile()}>
              {busy ? "Сохраняем…" : <>Дальше<ArrowRight className="size-4" /></>}
            </Button>
          )}
          {step === 2 && (
            <Button className="h-12 px-6" onClick={() => { setStep(3); document.querySelector("main")?.scrollTo({ top: 0 }); }}>
              <Send className="size-4" />Отправить на проверку
            </Button>
          )}
          {step === 3 && (
            <Button asChild className="h-12 px-6"><Link to="/my/org">В кабинет<ArrowRight className="size-4" /></Link></Button>
          )}
        </div>
      </footer>
    </>
  );
}

/* ---------- 1. Анкета ---------- */

function StepForm({ form, setForm, logo, onLogo }: {
  form: Form;
  setForm(f: Form): void;
  logo?: string;
  onLogo(file: File): void;
}) {
  const ids = { name: useId(), city: useId(), description: useId() };
  const free = CONTACT_TYPES.filter((t) => !form.contacts.some((c) => c.type === t.key));
  const setContact = (i: number, patch: Partial<Contact>) =>
    setForm({ ...form, contacts: form.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const filledContacts = form.contacts.filter((c) => c.value.trim());
  const checks = [
    { text: "Название и описание понятны", ok: form.name.trim() !== "" && form.description.trim() !== "" },
    { text: "Есть способ связаться", ok: filledContacts.length > 0 },
    { text: "Указан хотя бы один вид спорта", ok: form.sports.length > 0 },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-5">
        <Heading title="Расскажи о клубе"
          hint="Администратор проверит анкету и документы. После одобрения появится публичная страница и можно публиковать мероприятия от имени клуба." />
        <label className={cn(card, "flex cursor-pointer items-center gap-4 p-4 focus-within:ring-[3px] focus-within:ring-ring/40")}>
          <span className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] border-2 border-dashed border-ink bg-lavender-soft">
            {logo ? <img src={logo} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6" />}
          </span>
          <span className="flex flex-col gap-1">
            <span className="font-display text-base font-bold">Логотип</span>
            <span className="text-xs text-muted-foreground">JPG, PNG или WebP до 5 МБ · можно добавить позже</span>
          </span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); }} />
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.name} className={label}>НАЗВАНИЕ *</label>
            <input id={ids.name} maxLength={200} value={form.name} placeholder="Беговой клуб «Татышев»" className={input}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.city} className={label}>ГОРОД</label>
            <input id={ids.city} maxLength={100} value={form.city} placeholder="Красноярск" className={input}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.description} className={label}>ОПИСАНИЕ *</label>
          <textarea id={ids.description} rows={3} maxLength={5000} value={form.description} className={cn(input, "resize-none")}
            placeholder="Кто вы, где и как часто занимаетесь, кого ждёте"
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <span className={label}>ВИДЫ СПОРТА * · ДО {MAX_SPORTS}</span>
          {form.sports.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {form.sports.map((s) => (
                <li key={s.sportId ?? s.name} className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-secondary py-1 pr-1.5 pl-3.5 text-sm font-extrabold">
                  {s.name}{!s.sportId && " · новый"}
                  <button type="button" aria-label={`Убрать «${s.name}»`} className="rounded-full p-1 hover:bg-card"
                    onClick={() => setForm({ ...form, sports: form.sports.filter((x) => x !== s) })}>
                    <X className="size-3.5" strokeWidth={2.6} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {form.sports.length < MAX_SPORTS && (
            <SportPicker exclude={form.sports.flatMap((s) => (s.sportId ? [s.sportId] : []))}
              onPick={(s) => {
                if (!form.sports.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) setForm({ ...form, sports: [...form.sports, s] });
              }} />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className={label}>КОНТАКТЫ * · ХОТЯ БЫ ОДИН</span>
          {form.contacts.map((c, i) => {
            const type = CONTACT_TYPES.find((t) => t.key === c.type);
            return (
              <div key={c.type} className="flex gap-2">
                <select aria-label="Тип контакта" value={c.type} onChange={(e) => setContact(i, { type: e.target.value })}
                  className="h-12 w-[150px] shrink-0 rounded-[14px] border-2 border-ink bg-card px-3 text-sm font-bold outline-none focus:border-primary">
                  {CONTACT_TYPES.filter((t) => t.key === c.type || free.includes(t)).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <input aria-label={type?.label} value={c.value} placeholder={type?.placeholder} className={cn(input, "h-12 py-0")}
                  onChange={(e) => setContact(i, { value: e.target.value })} />
                <button type="button" aria-label="Убрать контакт" disabled={form.contacts.length === 1}
                  onClick={() => setForm({ ...form, contacts: form.contacts.filter((_, j) => j !== i) })}
                  className="flex size-12 shrink-0 items-center justify-center rounded-[14px] border-2 border-ink bg-card disabled:opacity-40">
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
          {free.length > 0 && (
            <button type="button" onClick={() => setForm({ ...form, contacts: [...form.contacts, { type: free[0].key, value: "" }] })}
              className="flex w-fit items-center gap-1.5 text-sm font-extrabold text-primary">
              <Plus className="size-4" />Добавить контакт: сайт, VK, почта
            </button>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <p className={label}>ТАК БУДЕТ ВЫГЛЯДЕТЬ СТРАНИЦА</p>
        <div className={cn(card, "flex flex-col gap-3 p-5 shadow-[6px_6px_0_var(--primary)]")}>
          <div className="flex items-center gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border-2 border-ink bg-secondary font-display text-2xl font-extrabold">
              {logo ? <img src={logo} alt="" className="size-full object-cover" /> : (form.name.trim()[0]?.toUpperCase() ?? "?")}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold">{form.name.trim() || "Название клуба"}</p>
              {form.city.trim() && <p className="text-sm text-muted-foreground">{form.city.trim()}</p>}
            </div>
          </div>
          {form.description.trim() && <p className="line-clamp-3 text-sm font-medium">{form.description.trim()}</p>}
          {filledContacts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filledContacts.map((c) => (
                <span key={c.type} className="rounded-pill border-[1.5px] border-ink bg-lavender-soft px-2.5 py-0.5 text-[11px] font-bold">{c.value.trim()}</span>
              ))}
            </div>
          )}
        </div>
        <div className={cn(card, "flex flex-col gap-2 p-5")}>
          <p className="font-display text-base font-bold">Что проверит администратор</p>
          {[...checks, { text: "Документы подтверждают клуб", ok: false }].map((c) => (
            <p key={c.text} className="flex items-center gap-2 text-sm font-semibold">
              <span className={cn("flex size-5 items-center justify-center rounded-full border-[1.5px] border-ink", c.ok ? "bg-secondary" : "bg-card")}>
                {c.ok && <Check className="size-3" strokeWidth={3} />}
              </span>
              {c.text}
            </p>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ---------- 2. Документы ---------- */

function StepDocuments() {
  const queryClient = useQueryClient();
  const me = useOrganizationsMe({ query: { retry: false } });
  const docs = (me.data?.status === 200 ? me.data.data.documents : undefined) ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: getOrganizationsMeQueryKey() });
  const add = useOrganizationsAddDocument({ mutation: { onSuccess: refresh } });
  const remove = useOrganizationsRemoveDocument({ mutation: { onSuccess: refresh } });
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string>();
  const [error, setError] = useState<string>();

  const upload = async (files: FileList | null) => {
    setError(undefined);
    for (const file of Array.from(files ?? [])) {
      setUploading(file.name);
      try {
        await add.mutateAsync({ data: { file } });
      } catch (e) {
        setError((e as { detail?: string })?.detail ?? `Не удалось загрузить «${file.name}»`);
        break;
      }
    }
    setUploading(undefined);
  };

  const who = [
    { title: "Ты", hint: "Всегда — можно удалить любой" },
    { title: "Администратор", hint: "Во время проверки" },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-5">
        <Heading title="Документы клуба" hint="Приложи то, что подтверждает, что клуб настоящий. Это ускорит проверку." />
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files); }}
          className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-[22px] border-2 border-dashed border-ink p-6 text-center focus-within:ring-[3px] focus-within:ring-ring/40",
            dragging ? "bg-lime-soft" : "bg-card")}>
          <span className="flex size-[52px] items-center justify-center rounded-[16px] border-2 border-ink bg-secondary"><Upload className="size-6" /></span>
          <span className="text-base font-extrabold">{uploading ? `Загружаем «${uploading}»…` : "Перетащи файлы или выбери на компьютере"}</span>
          <span className="text-xs text-muted-foreground">PDF, JPG или PNG · не больше {MAX_DOCUMENTS} файлов</span>
          <input type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only"
            disabled={!!uploading} onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
        </label>
        {docs.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={label}>ЗАГРУЖЕНО</span>
              <span className="rounded-pill border-[1.5px] border-ink bg-card px-2.5 py-0.5 text-xs font-bold">{docs.length} из {MAX_DOCUMENTS}</span>
            </div>
            {docs.map((d) => (
              <div key={d.id} className={cn(card, "flex items-center gap-3 p-3")}>
                <FileText className="size-5 shrink-0" />
                <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.name.split(".").pop()?.toUpperCase()} · {formatSize(d.size)}</p>
                </a>
                <span className="hidden items-center gap-1 rounded-pill border-[1.5px] border-ink bg-secondary px-2.5 py-0.5 text-xs font-bold sm:flex">
                  <Check className="size-3" />загружен
                </span>
                <button type="button" aria-label={`Удалить «${d.name}»`} disabled={remove.isPending}
                  onClick={() => remove.mutate({ fileId: d.id })}
                  className="flex size-9 items-center justify-center rounded-full border-2 border-ink bg-card">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p role="alert" className="rounded-[14px] border-2 border-ink bg-peach px-4 py-2.5 text-sm font-bold">{error}</p>}
      </div>
      <aside className="flex flex-col gap-4">
        <div className={cn(card, "flex flex-col gap-3 p-5")}>
          <p className="font-display text-base font-bold">Кто увидит документы</p>
          {who.map((w) => (
            <div key={w.title} className="flex flex-col rounded-[14px] bg-muted px-4 py-2.5">
              <span className="text-sm font-extrabold">{w.title}</span>
              <span className="text-xs text-muted-foreground">{w.hint}</span>
            </div>
          ))}
        </div>
        <TalkingBeaver mood="thinking" say="Подойдёт устав, свидетельство или договор аренды площадки." />
      </aside>
    </div>
  );
}

/* ---------- 3. Проверка ---------- */

function StepSent() {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <span className="flex size-28 items-center justify-center rounded-full border-2 border-ink bg-sky shadow-hard">
        <Send className="size-12 text-ink" strokeWidth={2.5} />
      </span>
      <h1 className="font-display text-[36px] leading-tight font-extrabold tracking-[-0.5px] lg:text-[52px]">
        Заявка на проверке
      </h1>
      <p className="max-w-[480px] text-lg font-medium text-muted-foreground">
        Сообщим, как только администратор примет решение. Статус заявки всегда виден в кабинете.
      </p>
    </div>
  );
}
