import { useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { cn } from "cn";
import { useAdminConfirmAward, useAdminListAwards } from "@/shared/api/generated/core/admin/admin";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { AdminLayout } from "./admin-layout";
import { Chip, Consequence, DecisionDialog, PageHead, TH, useInvalidateAdmin } from "./parts";
import { dateTimeYear, monthTitle, shiftMonth } from "./format";

const COLS = "grid grid-cols-[28px_minmax(0,1fr)_72px_96px_88px_64px_minmax(140px,180px)] items-center gap-3";

/** «Организация месяца»: предложение системы, подтверждение админом и рейтинг кандидатов. */
export default function AdminAwardsPage() {
  const [month, setMonth] = useState<string>();
  const query = useAdminListAwards(month ? { month } : undefined);
  const data = query.data?.status === 200 ? query.data.data : undefined;
  const period = month ?? data?.period;
  const award = data?.award;
  const candidates = data?.candidates ?? [];
  const winner = candidates.find((c) => c.organizationId === award?.organizationId) ?? candidates[0];
  const maxScore = Math.max(1, ...candidates.map((c) => c.score));
  const [open, setOpen] = useState(false);
  const confirm = useAdminConfirmAward();
  const invalidate = useInvalidateAdmin();
  const proposed = award?.status === "PROPOSED";

  return (
    <AdminLayout>
      <PageHead
        title="Организация месяца"
        text="Система предлагает победителя за прошлый месяц по счёту. Админ подтверждает, и награда появляется у организации."
        aside={period && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" rough={false} className="shadow-none" aria-label="Предыдущий месяц" onClick={() => setMonth(shiftMonth(period, -1))}>
              <ChevronLeft className="size-4" strokeWidth={2.6} />
            </Button>
            <span className="flex h-11 items-center rounded-pill border-2 border-ink bg-card px-5 text-sm font-extrabold text-foreground">{monthTitle(period)}</span>
            <Button variant="outline" size="icon-sm" rough={false} className="shadow-none" aria-label="Следующий месяц" onClick={() => setMonth(shiftMonth(period, 1))}>
              <ChevronRight className="size-4" strokeWidth={2.6} />
            </Button>
          </div>
        )}
      />

      {query.isPending ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : query.isError || !data ? (
        <p role="alert" className="text-base font-bold text-destructive">Не удалось загрузить награды.</p>
      ) : (
        <>
          {award ? (
            <motion.section
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className={cn("flex w-full flex-wrap items-center gap-6 rounded-[24px] border-[3px] border-ink p-6 shadow-hard", proposed ? "bg-secondary" : "bg-lime-soft")}
            >
              <motion.span
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2 }}
                className="flex size-24 shrink-0 items-center justify-center rounded-[22px] border-[3px] border-ink bg-card"
              >
                <Trophy className="size-10" strokeWidth={2.2} />
              </motion.span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Chip tone={proposed ? "bg-ink text-secondary" : "bg-card"} className={cn("text-[10px]", proposed && "text-secondary")}>
                    {proposed ? "предложена" : "подтверждена"}
                  </Chip>
                  <Chip tone="bg-card" className="text-[10px] normal-case">{monthTitle(award.period)}</Chip>
                </div>
                <h2 className="font-display text-[28px] leading-[34px] font-extrabold break-words text-foreground">{award.organizationName}</h2>
                {winner && (
                  <p className="text-[13px] font-bold text-foreground">
                    {winner.meetings} встреч · {winner.participants} участников · {winner.returning} вернулись
                    {winner.moderated ? ` · снято админом: ${winner.moderated}` : " · снятых событий нет"}
                  </p>
                )}
                {!proposed && award.confirmedAt && (
                  <p className="text-xs font-medium text-muted-foreground">Подтверждена {dateTimeYear(award.confirmedAt)}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase">Счёт</span>
                <span className="font-display text-[52px] leading-none font-extrabold text-foreground">{award.score}</span>
                {proposed && (
                  <Button variant="ink" rough={false} className="shadow-none" onClick={() => setOpen(true)}>
                    <Check className="size-4" strokeWidth={3} />
                    Подтвердить награду
                  </Button>
                )}
              </div>
            </motion.section>
          ) : (
            <EmptyState icon={Trophy} tone="bg-lavender-soft" title="Пока никого не предложили"
              text="Предложение появится после подсчёта итогов месяца. Подтвердить награду можно, когда её создаст система." />
          )}

          <section className="w-full overflow-x-auto rounded-[24px] border-2 border-ink bg-card">
            <div className="min-w-[760px]">
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                <h2 className="font-display text-xl font-extrabold text-foreground">Лучшие кандидаты</h2>
                <Chip tone="bg-lavender-soft" className="normal-case">до 5, по убыванию счёта</Chip>
              </div>
              {candidates.length === 0 ? (
                <p className="px-5 pb-5 text-sm font-medium text-muted-foreground">За этот месяц встреч у организаций не было.</p>
              ) : (
                <>
                  <div className={cn(COLS, "bg-background px-5 py-2.5")}>
                    <span className={TH}>#</span>
                    <span className={TH}>Организация</span>
                    <span className={TH}>Встреч</span>
                    <span className={TH}>Участников</span>
                    <span className={TH}>Вернулось</span>
                    <span className={TH}>Снято</span>
                    <span className={TH}>Счёт</span>
                  </div>
                  {candidates.map((c, i) => {
                    const top = c.organizationId === award?.organizationId;
                    return (
                      <div key={c.organizationId} className={cn(COLS, "border-b-[1.5px] border-track px-5 py-3 text-sm font-bold text-foreground", top && "bg-lime-soft")}>
                        <span>{i + 1}</span>
                        <span className="truncate font-extrabold">{c.organizationName}</span>
                        <span>{c.meetings}</span>
                        <span>{c.participants}</span>
                        <span>{c.returning}</span>
                        <span className={c.moderated ? "text-orange-ink" : undefined}>{c.moderated}</span>
                        <span className="flex items-center gap-2">
                          <span className="w-12 font-display text-lg font-extrabold">{c.score}</span>
                          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-lavender-soft">
                            <motion.span
                              initial={{ width: 0 }}
                              animate={{ width: `${(c.score / maxScore) * 100}%` }}
                              transition={{ type: "spring", stiffness: 120, damping: 20, delay: i * 0.08 }}
                              className={cn("block h-full rounded-full", top ? "border-[1.5px] border-ink bg-secondary" : "bg-primary")}
                            />
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  <p className="flex flex-wrap items-center gap-3 bg-background px-5 py-3 text-xs font-bold text-foreground">
                    <Chip tone="bg-ink" className="text-secondary">счёт</Chip>
                    пришедшие участники ×3 + вернувшиеся ×5 − 30 за каждое событие, снятое или удалённое админом за месяц
                  </p>
                </>
              )}
            </div>
          </section>
        </>
      )}

      {award && (
        <DecisionDialog open={open} onOpenChange={setOpen} title="Подтвердить «Организацию месяца»"
          subject={
            <div className="flex items-center gap-3 rounded-[14px] border-2 border-ink bg-secondary px-3.5 py-3">
              <span className="flex size-10 items-center justify-center rounded-[10px] border-2 border-ink bg-card"><Trophy className="size-5" /></span>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-foreground">{award.organizationName}</span>
                <span className="text-xs font-bold text-foreground">{monthTitle(award.period)} · счёт {award.score}</span>
              </div>
            </div>
          }
          confirmLabel="Подтвердить награду" confirmClassName="bg-secondary text-secondary-foreground"
          confirmIcon={<Check className="size-4" strokeWidth={3} />}
          pending={confirm.isPending} error={confirm.error?.detail}
          onConfirm={() => confirm.mutate({ id: award.id }, { onSuccess: () => { setOpen(false); void invalidate(); } })}>
          <ul className="flex flex-col gap-2">
            <Consequence>Награда появится на публичной странице организации</Consequence>
            <Consequence>Организация попадёт в «Организацию месяца» ленты</Consequence>
          </ul>
        </DecisionDialog>
      )}
    </AdminLayout>
  );
}
