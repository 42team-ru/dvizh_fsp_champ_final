import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useEventsAddPhoto, useEventsCreate, useEventsCreatePermission } from "@/shared/api/generated/core/events/events";
import { Link } from "react-router";
import type { EventRequest, EventRequestJoinMode, EventRequestKind, EventRequestLevel } from "@/shared/api/generated/core/appAPI.schemas";
import { EventRequestLevel as LEVELS } from "@/shared/api/generated/core/appAPI.schemas";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { LocationPicker } from "@/widgets/events-map/ui/location-picker";
import { AddressInput } from "@/widgets/events-map/ui/address-input";
import { addressAt } from "@/widgets/events-map/lib/geocoder";
import { DEFAULT_CENTER } from "@/widgets/events-map/lib/map-provider";
import { SportPicker, type PickedSport } from "@/features/sport-picker/ui/sport-picker";
import { PhotoDrafts, type PhotoDraft } from "@/features/photo-focus/ui/photo-drafts";
import { toast } from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { EVENT_KIND_LABEL, EVENT_LEVEL_LABEL, JOIN_MODE_LABEL } from "@/shared/lib/statuses";

const field = "flex min-w-0 flex-col gap-1.5 text-sm font-bold";
const select = "h-11 w-full rounded-xl border-2 border-ink bg-card px-3 text-base";
const area = "w-full rounded-xl border-2 border-ink bg-card px-3 py-2 text-base";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-4 rounded-[28px] p-6">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {children}
    </Card>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const minutesBetween = (a: string, b: string) => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
};
const intOrUndefined = (value: string) => (value.trim() ? Number(value) : undefined);

/** Создание мероприятия: что, когда, где, условия записи. Разовое или еженедельное (серия через RRULE). */
export default function EventCreatePage() {
  const navigate = useNavigate();
  const create = useEventsCreate();
  const addPhoto = useEventsAddPhoto();
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const permissionQuery = useEventsCreatePermission();
  const permission = permissionQuery.data?.status === 200 ? permissionQuery.data.data : undefined;
  const blocked = permission?.canCreate === false;
  const tomorrow = new Date(Date.now() + 86_400_000);
  const [sport, setSport] = useState<PickedSport | null>(null);
  /** Точка места: из подсказки адреса или клика по карте. Без неё адрес не засчитывается. */
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  /** Последний клик по карте: ответ геокодера на прежний клик не должен перезаписать адрес. */
  const lastClick = useRef<[number, number] | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [f, setF] = useState({
    title: "", description: "", format: "OFFLINE" as "OFFLINE" | "ONLINE", address: "", locationNote: "", onlineUrl: "",
    date: localDate(tomorrow), start: "19:00", end: "20:30", until: localDate(new Date(Date.now() + 60 * 86_400_000)),
    level: "ANY" as EventRequestLevel, kind: "" as EventRequestKind | "", joinMode: "FREE" as EventRequestJoinMode,
    capacity: "", minParticipants: "", requirements: "", equipment: "", privateDetails: "",
  });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  /** Клик по карте: ставим точку и сами подставляем адрес (обратный геокодер 2ГИС). */
  const pickOnMap = async (next: [number, number]) => {
    lastClick.current = next;
    setPoint(next);
    setLocating(true);
    const found = await addressAt(next).catch(() => null);
    if (lastClick.current !== next) return;
    setLocating(false);
    set({ address: found ?? `Точка на карте: ${next[1].toFixed(5)}, ${next[0].toFixed(5)}` });
  };
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    setLocalError(null);
    if (!sport) return setLocalError("Выберите вид спорта или добавьте свой");
    if (f.format === "OFFLINE" && !point) return setLocalError("Выберите адрес из подсказок или отметьте место на карте");
    if (f.format === "OFFLINE" && locating) return setLocalError("Определяем адрес точки — секунду");
    const duration = minutesBetween(f.start, f.end);
    if (duration <= 0) return setLocalError("Окончание должно быть позже начала");
    const data: EventRequest = {
      title: f.title,
      description: f.description || undefined,
      sportId: sport.sportId,
      sportName: sport.sportId ? undefined : sport.name,
      format: f.format,
      address: f.format === "OFFLINE" ? f.address : undefined,
      locationNote: f.locationNote || undefined,
      onlineUrl: f.format === "ONLINE" ? f.onlineUrl : undefined,
      lon: f.format === "OFFLINE" ? point?.[0] : undefined,
      lat: f.format === "OFFLINE" ? point?.[1] : undefined,
      level: f.level,
      kind: f.kind || undefined,
      joinMode: f.joinMode,
      capacity: intOrUndefined(f.capacity),
      minParticipants: intOrUndefined(f.minParticipants),
      requirements: f.requirements || undefined,
      equipment: f.equipment || undefined,
      privateDetails: f.privateDetails || undefined,
      ...(repeat
        ? { schedule: {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            startDate: f.date,
            endDate: f.until,
            rules: [{ firstStart: `${f.date}T${f.start}:00`, durationMinutes: duration, rrule: "FREQ=WEEKLY" }],
          } }
        : { startAt: new Date(`${f.date}T${f.start}`).toISOString(), endAt: new Date(`${f.date}T${f.end}`).toISOString() }),
    };
    create.mutate({ data }, {
      onSuccess: async (response) => {
        if (response.status !== 201) return;
        const id = response.data.id;
        // фото — после создания, по порядку: первое станет обложкой; сбой не отменяет уже опубликованное мероприятие
        setUploading(true);
        let failed = 0;
        for (const photo of photos) {
          await addPhoto.mutateAsync({ id, data: { file: photo.file }, params: { focusX: photo.focus.x, focusY: photo.focus.y } })
            .catch(() => { failed += 1; });
        }
        setUploading(false);
        if (failed > 0) {
          toast.error("Не все фото загрузились", { description: "Мероприятие опубликовано — добавьте фото в «Управлять» → «Фото»." });
        }
        navigate(`/events/${id}`);
      },
    });
  };

  const error = localError ?? create.error?.detail;

  return (
    <div className="relative isolate min-h-dvh overflow-clip bg-background pb-[110px] lg:pb-12">
      <MemphisBackground seed="event-create" />
      <div className="sticky top-0 z-40 hidden lg:block"><AppHeader current="feed" /></div>
      <main className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-4 pt-8 lg:px-8">
        <h1 className="font-display text-[32px] leading-10 font-extrabold lg:text-[40px] lg:leading-[50px]">Новое событие</h1>
        {blocked && (
          <div role="alert" className="flex flex-col gap-2 rounded-[20px] border-2 border-ink bg-peach p-5">
            <p className="font-display text-lg font-bold">Публикация пока недоступна</p>
            <p className="text-base font-semibold">{permission?.reason}</p>
            <Button asChild variant="ink" size="sm" className="self-start">
              <Link to="/my/org">Открыть анкету клуба</Link>
            </Button>
          </div>
        )}
        <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <Section title="Что">
            <label className={field}>Название
              <Input required maxLength={200} value={f.title} placeholder="Вечерний футбол 6×6" onChange={(e) => set({ title: e.target.value })} />
            </label>
            <div className={field}>
              Вид спорта
              {sport ? (
                <div className="flex items-center gap-3">
                  <span className="rounded-pill border-2 border-ink bg-secondary px-4 py-1.5 text-base font-extrabold">
                    {sport.name}{!sport.sportId && " · новый вид"}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSport(null)}>Изменить</Button>
                </div>
              ) : <SportPicker onPick={setSport} />}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={field}>Формат встречи
                <select className={select} value={f.kind} onChange={(e) => set({ kind: e.target.value as EventRequestKind | "" })}>
                  <option value="">Не указан</option>
                  {Object.entries(EVENT_KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className={field}>Уровень
                <select className={select} value={f.level} onChange={(e) => set({ level: e.target.value as EventRequestLevel })}>
                  {Object.values(LEVELS).map((value) => <option key={value} value={value}>{EVENT_LEVEL_LABEL[value]}</option>)}
                </select>
              </label>
            </div>
            <label className={field}>Описание
              <textarea className={area} rows={4} maxLength={5000} value={f.description} onChange={(e) => set({ description: e.target.value })} />
            </label>
          </Section>

          <Section title="Фото">
            <p className="-mt-2 text-sm font-semibold text-muted-foreground">
              Необязательно. До 6 фото, первое — обложка в ленте; отметьте на каждом главное — по этой точке обрежутся превью.
              Без фото обложкой будет картинка вида спорта.
            </p>
            <PhotoDrafts value={photos} onChange={setPhotos} />
          </Section>

          <Section title="Когда">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className={field}>{repeat ? "Первое занятие" : "Дата"}
                <Input type="date" required value={f.date} min={localDate(new Date())} onChange={(e) => set({ date: e.target.value })} />
              </label>
              <label className={field}>Начало
                <Input type="time" required value={f.start} onChange={(e) => set({ start: e.target.value })} />
              </label>
              <label className={field}>Окончание
                <Input type="time" required value={f.end} onChange={(e) => set({ end: e.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-3 text-base font-bold">
              <input type="checkbox" className="size-5" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
              Повторять каждую неделю
            </label>
            {repeat && (
              <label className={`${field} sm:w-1/3`}>До какого числа
                <Input type="date" required value={f.until} min={f.date} onChange={(e) => set({ until: e.target.value })} />
              </label>
            )}
          </Section>

          <Section title="Где">
            <div className="flex gap-2">
              {(["OFFLINE", "ONLINE"] as const).map((format) => (
                <Button key={format} type="button" size="chip" variant={f.format === format ? "ink" : "soft"}
                  aria-pressed={f.format === format} onClick={() => set({ format })}>
                  {format === "OFFLINE" ? "Очно" : "Онлайн"}
                </Button>
              ))}
            </div>
            {f.format === "OFFLINE" ? (
              <>
                <div className={field}>
                  Адрес
                  <AddressInput value={f.address} near={point ?? DEFAULT_CENTER} invalid={Boolean(f.address) && !point}
                    onText={(text) => { lastClick.current = null; setLocating(false); setPoint(null); set({ address: text }); }}
                    onPick={(place) => { lastClick.current = null; setLocating(false); setPoint(place.point); set({ address: place.address }); }} />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {locating ? "Определяем адрес точки…" : point ? "Место выбрано — можно уточнить кликом по карте"
                      : "Начните вводить и выберите подсказку или нажмите на карту"}
                  </span>
                </div>
                <LocationPicker value={point} onChange={(next) => void pickOnMap(next)} className="h-[300px] w-full" />
                <label className={field}>Как найти место
                  <Input maxLength={1000} value={f.locationNote} placeholder="Вход со стороны парка" onChange={(e) => set({ locationNote: e.target.value })} />
                </label>
              </>
            ) : (
              <label className={field}>Ссылка на трансляцию или звонок (видят только участники)
                <Input type="url" required maxLength={1000} value={f.onlineUrl} placeholder="https://" onChange={(e) => set({ onlineUrl: e.target.value })} />
              </label>
            )}
          </Section>

          <Section title="Условия">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className={field}>Запись
                <select className={select} value={f.joinMode} onChange={(e) => set({ joinMode: e.target.value as EventRequestJoinMode })}>
                  {Object.entries(JOIN_MODE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className={field}>Мест{repeat && " на занятие"}
                <Input type="number" min={1} max={10000} value={f.capacity} placeholder="Без лимита" onChange={(e) => set({ capacity: e.target.value })} />
              </label>
              <label className={field}>Состоится, если наберём
                <Input type="number" min={1} max={10000} value={f.minParticipants} placeholder="Не важно" onChange={(e) => set({ minParticipants: e.target.value })} />
              </label>
            </div>
            <label className={field}>Требования к участникам
              <textarea className={area} rows={2} maxLength={2000} value={f.requirements} onChange={(e) => set({ requirements: e.target.value })} />
            </label>
            <label className={field}>Что взять с собой
              <textarea className={area} rows={2} maxLength={2000} value={f.equipment} onChange={(e) => set({ equipment: e.target.value })} />
            </label>
            <label className={field}>Детали для участников (видят только записавшиеся): точное место, ссылка на чат
              <textarea className={area} rows={2} maxLength={2000} value={f.privateDetails} onChange={(e) => set({ privateDetails: e.target.value })} />
            </label>
          </Section>

          {error && <p role="alert" className="text-base font-bold text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={create.isPending || uploading || blocked}>
              {uploading ? "Загружаем фото…" : create.isPending ? "Публикуем…" : "Опубликовать"}
            </Button>
            <Button type="button" size="lg" variant="soft" onClick={() => navigate(-1)}>Отмена</Button>
          </div>
        </form>
      </main>
      <MobileTabBar current="feed" />
    </div>
  );
}
