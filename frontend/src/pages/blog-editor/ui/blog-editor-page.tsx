import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ImagePlus, Star, X } from "lucide-react";
import { cn } from "cn";
import {
  useBlogCreate, useBlogEligibleEvents, useBlogEventPhotos, useBlogGet, useBlogUpdate, useBlogUploadPhoto,
} from "@/shared/api/generated/core/blog/blog";
import { useOrganizationsMe } from "@/shared/api/generated/core/organizations/organizations";
import type { BlogEventResponse, BlogPostRequestType } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { toast } from "@/shared/lib/toast";
import { useUser } from "@/entity/user/model/use-user";
import { authorName, eventDate } from "@/entity/blog/lib/post";
import { MarkdownEditor } from "@/features/blog-editor/ui/markdown-editor";
import { SportPicker } from "@/features/sport-picker/ui/sport-picker";
import { BlogShell } from "@/widgets/blog-shell/ui/blog-shell";
import { MyBeaverBadge } from "@/widgets/beaver-pet/ui/my-beaver-badge";

const MAX_PHOTOS = 10;
type Photo = { id: string; url: string; caption: string };
/** Чьи встречи показать в конце поста. */
type Widget = { kind: "none" } | { kind: "org"; id: string; name: string } | { kind: "user"; id: string; name: string };

function widgetOptions(event: BlogEventResponse | undefined, me: { id: string; name: string } | null,
  myOrg: { id: string; name: string } | null): { key: string; label: string; hint: string; value: Widget }[] {
  const options: { key: string; label: string; hint: string; value: Widget }[] = [];
  if (event?.organization?.status === "APPROVED") {
    options.push({ key: `org:${event.organization.id}`, label: `Встречи: ${event.organization.name}`,
      hint: "клуб, который провёл встречу", value: { kind: "org", id: event.organization.id, name: event.organization.name } });
  } else if (event) {
    const name = authorName(event.organizer);
    options.push({ key: `user:${event.organizer.id}`, label: `Встречи: ${name}`, hint: "организатор этой встречи",
      value: { kind: "user", id: event.organizer.id, name } });
  }
  if (myOrg && !options.some((o) => o.key === `org:${myOrg.id}`)) {
    options.push({ key: `org:${myOrg.id}`, label: `Наши встречи: ${myOrg.name}`, hint: "ближайшие встречи клуба", value: { kind: "org", ...myOrg } });
  }
  if (me && !myOrg && !options.some((o) => o.key === `user:${me.id}`)) {
    options.push({ key: `user:${me.id}`, label: "Мои встречи", hint: "если ты сам проводишь встречи", value: { kind: "user", ...me } });
  }
  options.push({ key: "none", label: "Без виджета", hint: "просто пост", value: { kind: "none" } });
  return options;
}

const keyOf = (w: Widget) => (w.kind === "none" ? "none" : `${w.kind}:${w.id}`);

/**
 * Редактор поста. Сначала — что пишем: «С тренировки» (выбрать прошедшую встречу, фото подтянутся из её альбома)
 * или «Гайд». Текст — Markdown с панелью как в Telegram. В конце — виджет «Наши тренировки». Черновик или публикация.
 */
export default function BlogEditorPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const isOrg = user?.systemRole === "ORG";

  const existing = useBlogGet(id ?? "", { query: { enabled: editing } });
  const eligible = useBlogEligibleEvents();
  const myOrgQuery = useOrganizationsMe({ query: { enabled: isOrg } });
  const events = eligible.data?.status === 200 ? eligible.data.data : [];
  const myOrgData = myOrgQuery.data?.status === 200 ? myOrgQuery.data.data : undefined;
  const myOrg = myOrgData?.id && myOrgData.name && myOrgData.status === "APPROVED" ? { id: myOrgData.id, name: myOrgData.name } : null;

  const [type, setType] = useState<BlogPostRequestType>("EVENT_REPORT");
  const [eventId, setEventId] = useState<string | undefined>(params.get("eventId") ?? undefined);
  const [sport, setSport] = useState<{ id?: string; name: string } | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [widget, setWidget] = useState<Widget | null>(null);
  const [comments, setComments] = useState(true);
  const loaded = useRef(false);

  // правка: один раз переносим пост в форму
  useEffect(() => {
    if (!editing || loaded.current || existing.data?.status !== 200) return;
    const d = existing.data.data;
    loaded.current = true;
    setType(d.post.type);
    setEventId(d.post.event?.id);
    setSport(d.post.sport ? { id: d.post.sport.id, name: d.post.sport.name } : null);
    setTitle(d.post.title);
    setBody(d.body);
    setPhotos(d.photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption ?? "" })));
    setComments(d.commentsEnabled);
    setWidget(d.widget?.organization ? { kind: "org", id: d.widget.organization.id, name: d.widget.organization.name }
      : d.widget?.organizer ? { kind: "user", id: d.widget.organizer.id, name: authorName(d.widget.organizer) } : { kind: "none" });
  }, [editing, existing.data]);

  // новый пост без встречи в ссылке: у клуба по умолчанию гайд, у человека — последняя встреча
  useEffect(() => {
    if (editing || eventId || params.get("eventId") || !eligible.isSuccess) return;
    if (events.length === 0 || isOrg) setType("GUIDE");
    else setEventId(events[0].id);
  }, [editing, eligible.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const event = type === "EVENT_REPORT" ? events.find((e) => e.id === eventId) : undefined;
  const me = user?.id ? { id: user.id, name: "Мои встречи" } : null;
  const options = useMemo(() => widgetOptions(event, isOrg ? null : me, myOrg), [event, isOrg, me?.id, myOrg?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosenWidget = widget && options.some((o) => o.key === keyOf(widget)) ? widget : options[0].value;

  const eventPhotos = useBlogEventPhotos(eventId ?? "", { query: { enabled: type === "EVENT_REPORT" && Boolean(eventId) } });
  const album = eventPhotos.data?.status === 200 ? eventPhotos.data.data : [];

  const upload = useBlogUploadPhoto();
  const fileInput = useRef<HTMLInputElement>(null);
  const addFiles = async (files: FileList | null) => {
    for (const file of Array.from(files ?? []).slice(0, MAX_PHOTOS - photos.length)) {
      try {
        const res = await upload.mutateAsync({ data: { file } });
        if (res.status === 200) setPhotos((list) => [...list, { id: res.data.id, url: res.data.url, caption: "" }]);
      } catch (e) {
        toast.error((e as { detail?: string }).detail ?? "Не удалось загрузить фото");
      }
    }
  };
  const togglePhoto = (p: { id: string; url: string }) =>
    setPhotos((list) => list.some((x) => x.id === p.id) ? list.filter((x) => x.id !== p.id)
      : list.length >= MAX_PHOTOS ? list : [...list, { id: p.id, url: p.url, caption: "" }]);

  const done = (published: boolean) => (res: { status: number; data: unknown }) => {
    void queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/blog") });
    const saved = res.data as { post: { id: string } };
    if (published) {
      toast.success("Пост опубликован");
      navigate(`/blog/${saved.post.id}`);
    } else {
      toast.success("Черновик сохранён");
      if (!editing) navigate(`/blog/${saved.post.id}/edit`, { replace: true });
    }
  };
  const fail = (e: { detail?: string }) => toast.error(e.detail ?? "Не удалось сохранить пост");
  const create = useBlogCreate();
  const update = useBlogUpdate();
  const busy = create.isPending || update.isPending || upload.isPending;

  const problems = [
    !title.trim() && "заголовок",
    !body.trim() && "текст",
    type === "EVENT_REPORT" && !eventId && "встреча",
  ].filter(Boolean) as string[];

  const save = (publish: boolean) => {
    const data = {
      type,
      eventId: type === "EVENT_REPORT" ? eventId : undefined,
      sportId: type === "GUIDE" ? sport?.id : undefined,
      title: title.trim(),
      body,
      photos: photos.map((p) => ({ fileId: p.id, caption: p.caption.trim() || undefined })),
      widgetOrganizationId: chosenWidget.kind === "org" ? chosenWidget.id : undefined,
      widgetUserId: chosenWidget.kind === "user" ? chosenWidget.id : undefined,
      commentsEnabled: comments,
      publish,
    };
    const handlers = { onSuccess: done(publish), onError: fail };
    if (editing && id) update.mutate({ id, data }, handlers);
    else create.mutate({ data }, handlers);
  };

  const wasPublished = existing.data?.status === 200 && existing.data.data.post.status === "PUBLISHED";

  return (
    <BlogShell title={editing ? "Правка поста" : "Новый пост"}>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm"><Link to={editing && id ? `/blog/${id}` : "/blog"}><ArrowLeft className="size-4" /> Отмена</Link></Button>
        <h1 className="hidden font-display text-2xl font-bold text-foreground lg:ml-3 lg:block">{editing ? "Правка поста" : "Новый пост"}</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={busy || problems.length > 0} onClick={() => save(false)}>
            {wasPublished ? "Снять в черновики" : "Сохранить черновик"}
          </Button>
          <Button size="sm" disabled={busy || problems.length > 0} onClick={() => save(true)}>
            {wasPublished ? "Сохранить" : "Опубликовать"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,808px)_minmax(0,1fr)] lg:gap-8">
        <Card className="gap-6 p-5 shadow-hard sm:p-9">
          <section className="flex flex-col gap-3">
            <Eyebrow>Что пишем</Eyebrow>
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
              {([
                ["EVENT_REPORT", "С тренировки", "Фото и впечатления. Привязан к встрече и появится на её странице."],
                ["GUIDE", "Гайд", "Совет без даты: как начать, что взять, куда пойти."],
              ] as const).map(([value, label, hint]) => {
                const on = type === value;
                const blocked = value === "EVENT_REPORT" && eligible.isSuccess && events.length === 0;
                return (
                  <button key={value} type="button" role="radio" aria-checked={on} disabled={blocked}
                    onClick={() => setType(value)}
                    className={cn("box-border flex items-start gap-3 rounded-[18px] border-2 border-ink p-4 text-left transition-transform disabled:opacity-50",
                      on ? "bg-secondary shadow-hard-sm" : "bg-card hover:bg-muted")}>
                    <span className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card">
                      {on && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="block font-display text-[17px] leading-6 font-bold text-foreground">{label}</span>
                      <span className="mt-1 block text-[13px] leading-[19px] font-semibold text-muted-foreground">
                        {blocked ? "Появится после первой встречи, на которой ты побываешь." : hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {type === "EVENT_REPORT" ? (
            <section className="flex flex-col gap-2">
              <label htmlFor="blog-event"><Eyebrow>Встреча</Eyebrow></label>
              <select id="blog-event" value={eventId ?? ""} onChange={(e) => { setEventId(e.target.value || undefined); setPhotos((l) => l.filter((p) => !album.some((a) => a.id === p.id))); }}
                className="h-[52px] rounded-[14px] border-2 border-ink bg-lavender-soft px-4 text-[15px] font-bold text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                {!eventId && <option value="">Выбери встречу</option>}
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title} · {eventDate(e)}</option>
                ))}
                {eventId && !events.some((e) => e.id === eventId) && <option value={eventId}>Встреча недоступна</option>}
              </select>
              <p className="text-xs font-semibold text-muted-foreground">Только прошедшие встречи, где ты был участником или организатором.</p>
            </section>
          ) : (
            <section className="flex flex-col gap-2">
              <Eyebrow>Вид спорта (по желанию)</Eyebrow>
              {sport ? (
                <div className="flex items-center gap-2">
                  <span className="box-border inline-flex h-9 items-center rounded-pill border-2 border-ink bg-sky-soft px-4 text-sm font-extrabold">{sport.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSport(null)}>Убрать</Button>
                  {!sport.id && <span className="text-xs font-semibold text-muted-foreground">Нового вида нет в справочнике — гайд сохранится без вида</span>}
                </div>
              ) : (
                <SportPicker onPick={(s) => setSport({ id: s.sportId, name: s.name })} />
              )}
            </section>
          )}

          <section className="flex flex-col gap-2">
            <label htmlFor="blog-title"><Eyebrow>Заголовок</Eyebrow></label>
            <Input id="blog-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "GUIDE" ? "Как начать бегать по утрам" : "Как прошла пробежка вокруг Татышева"}
              className="h-auto py-3 font-display text-xl font-bold sm:text-2xl" />
            <p className="text-right text-xs font-semibold text-muted-foreground tabular-nums">{title.length} / 120</p>
          </section>

          <section className="flex flex-col gap-2">
            <label htmlFor="blog-body"><Eyebrow>Текст</Eyebrow></label>
            <MarkdownEditor id="blog-body" value={body} onChange={setBody} maxLength={20000}
              placeholder={"Расскажи, как всё было: где собрались, что понравилось, что взять в следующий раз."} />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Eyebrow>Фото</Eyebrow>
              <span className="text-xs font-bold text-primary">{photos.length} из {MAX_PHOTOS} · первое — обложка</span>
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p, i) => (
                  <div key={p.id} className="box-border flex flex-col overflow-hidden rounded-[14px] border-2 border-ink bg-card">
                    <div className="relative">
                      <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
                      <span className="absolute top-2 left-2 flex h-6 items-center rounded-pill border-[1.5px] border-ink bg-card px-2 text-[11px] font-extrabold">
                        {i === 0 ? "Обложка" : i + 1}
                      </span>
                      <div className="absolute top-2 right-2 flex gap-1">
                        {i > 0 && (
                          <button type="button" title="Сделать обложкой" aria-label="Сделать обложкой"
                            onClick={() => setPhotos((l) => [l[i], ...l.filter((_, j) => j !== i)])}
                            className="flex size-7 items-center justify-center rounded-full border-[1.5px] border-ink bg-card hover:bg-secondary"><Star className="size-3.5" /></button>
                        )}
                        <button type="button" aria-label="Убрать фото" onClick={() => setPhotos((l) => l.filter((x) => x.id !== p.id))}
                          className="flex size-7 items-center justify-center rounded-full border-[1.5px] border-ink bg-card hover:bg-peach"><X className="size-3.5" /></button>
                      </div>
                    </div>
                    <input value={p.caption} maxLength={300} placeholder="Подпись" aria-label={`Подпись к фото ${i + 1}`}
                      onChange={(e) => setPhotos((l) => l.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)))}
                      className="border-t-2 border-ink px-3 py-2 text-[13px] font-semibold outline-none placeholder:text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
            {type === "EVENT_REPORT" && album.length > 0 && (
              <div className="box-border flex flex-col gap-3 rounded-[18px] border-2 border-primary bg-background p-4">
                <p className="text-sm font-extrabold text-foreground">Фото из альбома встречи · нажми, чтобы добавить</p>
                <div className="flex flex-wrap gap-2.5">
                  {album.map((a) => {
                    const at = photos.findIndex((p) => p.id === a.id);
                    return (
                      <button key={a.id} type="button" onClick={() => togglePhoto(a)} aria-pressed={at >= 0} aria-label={at >= 0 ? "Убрать из поста" : "Добавить в пост"}
                        className={cn("relative box-border size-[96px] overflow-hidden rounded-[12px] border-ink", at >= 0 ? "border-[3px] border-primary" : "border-2")}>
                        <img src={a.url} alt="" className="size-full object-cover" />
                        <span className={cn("absolute top-1.5 right-1.5 flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-ink text-[11px] font-extrabold",
                          at >= 0 ? "bg-primary text-white" : "bg-card")}>
                          {at >= 0 ? at + 1 : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Загрузить фото"
              onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            <Button variant="outline" className="self-start" disabled={photos.length >= MAX_PHOTOS || upload.isPending}
              onClick={() => fileInput.current?.click()}>
              <ImagePlus className="size-4" /> {upload.isPending ? "Загружаем…" : "Загрузить с устройства"}
            </Button>
          </section>

          <section className="box-border flex flex-col gap-3 rounded-[20px] border-2 border-ink bg-sky-soft p-5">
            <div>
              <h2 className="font-display text-lg leading-6 font-bold text-foreground">Виджет в конце поста</h2>
              <p className="text-[13px] font-semibold text-muted-foreground">Читатель сразу увидит, куда прийти в следующий раз.</p>
            </div>
            <div role="radiogroup" className="flex flex-col gap-2">
              {options.map((o) => {
                const on = keyOf(chosenWidget) === o.key;
                return (
                  <button key={o.key} type="button" role="radio" aria-checked={on} onClick={() => setWidget(o.value)}
                    className={cn("box-border flex items-center gap-3 rounded-[14px] p-3 text-left", on ? "border-2 border-ink bg-card" : "border-2 border-transparent hover:bg-card/60")}>
                    <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card">
                      {on && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="block text-[15px] font-extrabold text-foreground">{o.label}</span>
                      <span className="block text-xs font-semibold text-muted-foreground">{o.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </Card>

        <aside className="flex flex-col gap-6">
          <Card className="gap-4 p-[22px]">
            <h2 className="font-display text-[17px] leading-6 font-bold text-foreground">Настройки</h2>
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-extrabold text-foreground">Комментарии</span>
                <span className="block text-xs font-semibold text-muted-foreground">любой вошедший может написать</span>
              </span>
              <Switch checked={comments} onCheckedChange={setComments} />
            </label>
          </Card>
          <Card className="gap-2.5 p-[22px]">
            <h2 className="font-display text-[17px] leading-6 font-bold text-foreground">Перед публикацией</h2>
            {[
              ["Заголовок", Boolean(title.trim())],
              ["Хотя бы пара строк текста", Boolean(body.trim())],
              ...(type === "EVENT_REPORT" ? [["Встреча выбрана", Boolean(eventId)] as const] : []),
              [`Фото: ${photos.length}`, photos.length > 0],
              [chosenWidget.kind === "none" ? "Без виджета" : `Виджет: ${chosenWidget.name}`, chosenWidget.kind !== "none"],
            ].map(([label, ok]) => (
              <p key={String(label)} className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                <span className={cn("flex size-[22px] items-center justify-center rounded-[6px] border-[1.5px] border-ink", ok ? "bg-secondary" : "bg-card")}>
                  {ok && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {label}
              </p>
            ))}
            {problems.length > 0 && <p className="text-xs font-semibold text-muted-foreground">Ещё нужно: {problems.join(", ")}.</p>}
          </Card>
          <Card className="flex-row items-center gap-3 bg-lime-soft p-4">
            <MyBeaverBadge pose="hello" className="size-[76px] shrink-0" />
            <p className="text-[13px] leading-[19px] font-semibold text-foreground">
              Лучшие посты — короткие: три абзаца и 3–5 фото. Организатор встречи увидит твой пост на её странице.
            </p>
          </Card>
        </aside>
      </div>
    </BlogShell>
  );
}
