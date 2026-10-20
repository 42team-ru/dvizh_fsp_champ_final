import { useState } from "react";
import { Link } from "react-router";
import { PenLine, X } from "lucide-react";
import { cn } from "cn";
import { useBlogPrompt } from "@/shared/api/generated/core/blog/blog";
import type { BlogPromptResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Eyebrow } from "@/shared/components/ui/eyebrow";
import { MyBeaverBadge } from "@/widgets/beaver-pet/ui/my-beaver-badge";
import { ago } from "@/entity/blog/lib/post";

const DISMISSED = "blog-prompt-dismissed";

function readDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED) ?? "[]") as string[]; } catch { return []; }
}

/** «Не сейчас» — запоминаем встречу в этом браузере, чтобы не спрашивать о ней снова. */
function useDismissed() {
  const [ids, setIds] = useState(readDismissed);
  const dismiss = (id: string) => {
    const next = [...ids, id].slice(-30);
    setIds(next);
    try { localStorage.setItem(DISMISSED, JSON.stringify(next)); } catch { /* приватный режим — забудем при перезагрузке */ }
  };
  return { ids, dismiss };
}

/** Подсказка о прошедшей встрече: null — предлагать нечего или уже отказались. */
export function useBlogPromptData(eventId?: string) {
  const query = useBlogPrompt({ query: { staleTime: 60_000 } });
  const { ids, dismiss } = useDismissed();
  const data = query.data?.status === 200 && query.data.data && typeof query.data.data === "object"
    ? (query.data.data as BlogPromptResponse) : null;
  const prompt = data && !ids.includes(data.event.id) && (!eventId || data.event.id === eventId) ? data : null;
  return { prompt, dismiss };
}

/**
 * «Как прошла встреча?» — после окончания встречи предлагаем написать пост. Бобр — твой, в твоём наряде,
 * застывший в задумчивой позе (как на главной). Только «Написать пост» и «Не сейчас» — без оценок.
 * `eventId` — показывать только для этой встречи (на её странице).
 */
export function BlogPrompt({ eventId, className, compact }: { eventId?: string; className?: string; compact?: boolean }) {
  const { prompt, dismiss } = useBlogPromptData(eventId);
  if (!prompt) return null;
  const href = `/blog/new?eventId=${prompt.event.id}`;
  const club = prompt.event.organization?.name;

  if (compact) {
    return (
      <Card className={cn("relative flex-row items-center gap-3 bg-secondary p-3.5 shadow-hard-sm", className)}>
        <MyBeaverBadge pose="think" className="size-[60px] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] leading-5 font-bold text-foreground">Как прошла встреча?</p>
          <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
            {prompt.event.title}{prompt.photosCount ? ` · ${prompt.photosCount} фото в альбоме` : ""}
          </p>
        </div>
        <Button asChild variant="ink" size="icon-sm" aria-label="Написать пост">
          <Link to={href}><PenLine className="size-4" /></Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className={cn("relative gap-4 overflow-hidden bg-secondary p-[22px] shadow-hard", className)}>
      <button type="button" onClick={() => dismiss(prompt.event.id)} aria-label="Не сейчас"
        className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border-2 border-ink bg-card hover:bg-muted">
        <X className="size-4" strokeWidth={2.6} />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="min-w-0 flex-1">
          <Eyebrow className="text-foreground">Встреча закончилась {ago(prompt.endedAt)}</Eyebrow>
          <h3 className="mt-2 font-display text-xl leading-6 font-bold text-foreground">Как прошла встреча?</h3>
          <p className="mt-2 text-sm leading-5 font-semibold text-foreground">
            Пост с фото увидят участники{club ? ` и ${club}` : ""}. В конце покажем ближайшие встречи организатора.
          </p>
        </div>
        <MyBeaverBadge pose="think" className="h-[96px] w-[100px] shrink-0" />
      </div>
      <div className="box-border flex items-center gap-3 rounded-[16px] border-2 border-ink bg-card p-2.5">
        <div className="flex shrink-0 -space-x-3">
          {(prompt.photos.length ? prompt.photos.slice(0, 3).map((p) => p.url) : [prompt.event.coverUrl ?? prompt.event.sport.imageUrl])
            .map((src, i) => (
              <img key={i} src={src} alt="" className="size-11 rounded-[10px] border-2 border-ink object-cover" />
            ))}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-foreground">{prompt.event.title}</p>
          <p className="truncate text-xs font-semibold text-muted-foreground">
            {prompt.photosCount ? `${prompt.photosCount} фото в альбоме — возьмём в пост` : "Добавишь свои фото в редакторе"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ink" className="flex-1">
          <Link to={href}><PenLine className="size-4" /> Написать пост</Link>
        </Button>
        <Button variant="outline" onClick={() => dismiss(prompt.event.id)}>Не сейчас</Button>
      </div>
    </Card>
  );
}
