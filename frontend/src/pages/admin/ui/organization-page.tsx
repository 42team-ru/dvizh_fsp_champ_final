import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowUpRight, Check, ChevronLeft, FileText, Link2, SearchX } from "lucide-react";
import { cn } from "cn";
import {
  useAdminApproveOrganization,
  useAdminGetOrganization,
  useAdminRejectOrganization,
  useAdminReturnOrganization,
} from "@/shared/api/generated/core/admin/admin";
import type { AdminOrganizationResponse } from "@/shared/api/generated/core/appAPI.schemas";
import { CONTACT_TYPES, ORGANIZATION_STATUS } from "@/shared/lib/statuses";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { UserAvatar } from "@/shared/components/ui/user-avatar";
import { AdminLayout } from "./admin-layout";
import { Chip, DecisionDialog, LetterTile, Subject, toneOf, Warning, useInvalidateAdmin } from "./parts";
import { dateTime, dateTimeYear, fileSize } from "./format";

const CARD = "flex w-full flex-col gap-3 rounded-[24px] border-2 border-ink bg-card p-5 sm:p-6";
const H2 = "font-display text-xl font-extrabold text-foreground";
const LABEL = "text-[10px] font-extrabold tracking-[1.5px] text-muted-foreground uppercase";

type Decision = "approve" | "return" | "reject";

function Step({ done, title, text }: { done: boolean; title: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-ink", done ? "bg-secondary" : "bg-card")}>
        {done && <Check className="size-2.5" strokeWidth={4} />}
      </span>
      <div className="flex flex-col">
        <span className="text-[13px] font-extrabold text-foreground">{title}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

/** Правая колонка: решение по заявке (одобрить, вернуть, отклонить) и история. */
function DecisionPanel({ org }: { org: AdminOrganizationResponse }) {
  const [open, setOpen] = useState<Decision>();
  const invalidate = useInvalidateAdmin();
  const approve = useAdminApproveOrganization();
  const giveBack = useAdminReturnOrganization();
  const reject = useAdminRejectOrganization();
  const done = { mutation: { onSuccess: () => { setOpen(undefined); void invalidate(); } } };
  const id = org.id!;
  const status = org.status;
  const subject = (
    <Subject media={<LetterTile name={org.name} logoUrl={org.logoUrl} className="size-9 rounded-full text-sm" />}
      title={org.name ?? ""} text={[org.city, status && ORGANIZATION_STATUS[status]?.label].filter(Boolean).join(" · ")} />
  );

  return (
    <div className="flex w-full flex-col gap-4 lg:w-[336px] lg:shrink-0">
      <section className="flex flex-col gap-3 rounded-[24px] border-[3px] border-primary bg-card p-5">
        <h2 className={H2}>Решение</h2>
        {status === "APPROVED" ? (
          <p className="text-xs leading-[17px] font-medium text-muted-foreground">Организация допущена. Можно отозвать допуск: её мероприятия пропадут из ленты, пока решение не изменится.</p>
        ) : status === "REJECTED" ? (
          <p className="text-xs leading-[17px] font-medium text-muted-foreground">Заявка отклонена. Решение можно пересмотреть.</p>
        ) : status === "REVISION" ? (
          <p className="text-xs leading-[17px] font-medium text-muted-foreground">Анкета на доработке. После правки она снова придёт на проверку.</p>
        ) : (
          <p className="text-xs leading-[17px] font-medium text-muted-foreground">Проверьте анкету и документы и примите решение.</p>
        )}
        {status !== "APPROVED" && (
          <div className="flex flex-col gap-1.5">
            <Button variant="secondary" size="lg" className="w-full" onClick={() => setOpen("approve")}>Одобрить</Button>
            <p className="text-[11px] leading-[15px] font-medium text-muted-foreground">Получит публичную страницу и сможет публиковать от имени организации.</p>
          </div>
        )}
        {status === "PENDING" && (
          <div className="flex flex-col gap-1.5">
            <Button variant="outline" size="lg" className="w-full shadow-none" onClick={() => setOpen("return")}>Вернуть на доработку</Button>
            <p className="text-[11px] leading-[15px] font-medium text-muted-foreground">Не отказ: нужна причина, организация дополнит анкету и снова отправит.</p>
          </div>
        )}
        {status !== "REJECTED" && (
          <div className="flex flex-col gap-1.5">
            <Button variant="soft" size="lg" rough={{ color: "var(--orange)" }} className="w-full text-orange-ink" onClick={() => setOpen("reject")}>
              {status === "APPROVED" ? "Отозвать допуск" : "Отклонить"}
            </Button>
            <p className="text-[11px] leading-[15px] font-medium text-muted-foreground">Нужна причина; организация увидит её и сможет исправить анкету.</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5 rounded-[24px] border-2 border-ink bg-card p-5">
        <h2 className="font-display text-lg font-extrabold text-foreground">История</h2>
        <Step done={!!org.submittedAt} title="Заявка подана" text={org.submittedAt ? dateTime(org.submittedAt) : "пока нет"} />
        <Step done={!!org.reviewedAt} title="Решение" text={org.reviewedAt ? dateTime(org.reviewedAt) : "пока нет"} />
        {org.rejectReason && (
          <p className="rounded-[12px] bg-peach px-3 py-2 text-xs leading-4 font-bold text-foreground">Причина: «{org.rejectReason}»</p>
        )}
      </section>

      <DecisionDialog open={open === "approve"} onOpenChange={(o) => !o && setOpen(undefined)}
        title="Одобрить организацию" subject={subject} confirmLabel="Одобрить" confirmClassName="bg-secondary text-secondary-foreground"
        pending={approve.isPending} error={approve.error?.detail}
        onConfirm={() => approve.mutate({ id }, done.mutation)}>
        <p className="text-[13px] font-medium text-foreground">Организация получит публичную страницу и сможет публиковать мероприятия без согласования.</p>
      </DecisionDialog>
      <DecisionDialog open={open === "return"} onOpenChange={(o) => !o && setOpen(undefined)}
        title="Вернуть на доработку" subject={subject} reasonLabel="Что нужно дополнить" reasonHint="Организация увидит причину в своём кабинете"
        placeholder="Добавьте свидетельство о регистрации и контакт для связи." confirmLabel="Вернуть на доработку"
        pending={giveBack.isPending} error={giveBack.error?.detail}
        onConfirm={(reason) => giveBack.mutate({ id, data: { reason } }, done.mutation)}>
        <p className="text-[13px] font-medium text-foreground">Это не отказ: организация дополнит анкету, и она снова уйдёт на проверку.</p>
      </DecisionDialog>
      <DecisionDialog open={open === "reject"} onOpenChange={(o) => !o && setOpen(undefined)}
        title={status === "APPROVED" ? "Отозвать допуск" : "Отклонить организацию"} subject={subject} reasonLabel="Причина отказа"
        placeholder="Объясни, что нужно поправить" confirmLabel={status === "APPROVED" ? "Отозвать" : "Отклонить"}
        confirmClassName="bg-accent text-white"
        pending={reject.isPending} error={reject.error?.detail}
        onConfirm={(reason) => reject.mutate({ id, data: { reason } }, done.mutation)}>
        <p className="text-[13px] font-medium text-foreground">Организация увидит причину и сможет исправить анкету и подать её снова.</p>
      </DecisionDialog>
    </div>
  );
}

/** Карточка заявки организации: анкета, документы, заявитель и решение. */
export default function AdminOrganizationPage() {
  const { id = "" } = useParams();
  const query = useAdminGetOrganization(id);
  const org = query.data?.status === 200 ? query.data.data : undefined;
  const status = org?.status ? ORGANIZATION_STATUS[org.status] : undefined;
  const contacts = Object.entries(org?.contacts ?? {});
  const account = org?.account;

  return (
    <AdminLayout>
      <nav className="flex min-w-0 items-center gap-2 text-[13px]">
        <Link to="/admin/organizations" className="flex items-center gap-1 font-extrabold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3.5" strokeWidth={2.6} />
          Организации
        </Link>
        {org && (
          <>
            <span className="font-medium text-muted-foreground">/</span>
            <span className="truncate font-extrabold text-foreground">{org.name}</span>
          </>
        )}
      </nav>

      {query.isPending ? (
        <p className="text-base font-bold text-muted-foreground">Загружаем…</p>
      ) : !org ? (
        <EmptyState icon={SearchX} tone="bg-sky" title="Организация не найдена" text="Возможно, ссылка устарела."
          action={<Button asChild><Link to="/admin/organizations">К списку</Link></Button>} />
      ) : (
        <>
          <header className="flex w-full flex-wrap items-center gap-5 rounded-[24px] border-2 border-ink bg-card px-6 py-[22px]">
            <LetterTile name={org.name} logoUrl={org.logoUrl} className="size-[88px] rounded-[22px] border-[3px] text-[38px]" />
            <div className="flex min-w-[min(100%,220px)] flex-1 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {status && <Chip tone={status.tone} className="text-[10px]">{status.label}</Chip>}
                {(org.sports ?? []).map((s) => (
                  <Chip key={s.id} tone={toneOf(s.name)} className="text-[10px] normal-case">{s.name}</Chip>
                ))}
              </div>
              <h1 className="font-display text-[26px] leading-8 font-extrabold break-words text-foreground">{org.name}</h1>
              <p className="text-[13px] font-bold text-muted-foreground">
                {[org.city, org.submittedAt && `подана ${dateTimeYear(org.submittedAt)}`, `мероприятий ${org.eventsCount ?? 0}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="shadow-none">
              <Link to={`/admin/events?organizationId=${org.id}`}>
                <ArrowUpRight className="size-3.5" strokeWidth={2.6} />
                Её мероприятия
              </Link>
            </Button>
          </header>

          {org.rejectReason && org.status !== "APPROVED" && (
            <Warning>{org.status === "REVISION" ? "Вернули на доработку" : "Отклонена"}: «{org.rejectReason}»</Warning>
          )}

          <div className="flex w-full flex-col items-start gap-5 lg:flex-row">
            <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
              <section className={CARD}>
                <h2 className={H2}>Анкета</h2>
                <p className={LABEL}>Описание</p>
                <p className="text-sm leading-[21px] font-medium whitespace-pre-line text-foreground">{org.description || "—"}</p>
                <p className={LABEL}>Контакты</p>
                {contacts.length === 0 && <p className="text-sm font-medium text-muted-foreground">Контактов нет.</p>}
                {contacts.map(([type, value]) => (
                  <div key={type} className="flex items-center gap-2.5 rounded-[12px] border-[1.5px] border-track bg-background px-3 py-[9px]">
                    <Link2 className="size-4 shrink-0 text-primary" strokeWidth={2.4} />
                    <span className="w-20 shrink-0 text-xs font-extrabold text-muted-foreground">
                      {CONTACT_TYPES.find((c) => c.key === type)?.label ?? type}
                    </span>
                    <span className="min-w-0 truncate text-sm font-extrabold text-foreground">{value}</span>
                  </div>
                ))}
              </section>

              <section className={CARD}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className={H2}>Документы</h2>
                  <Chip tone="bg-lavender-soft" className="normal-case">{org.documents?.length ?? 0} из 10</Chip>
                </div>
                {(org.documents ?? []).length === 0 && <p className="text-sm font-medium text-muted-foreground">Документы не загружены.</p>}
                {(org.documents ?? []).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-ink bg-card px-3.5 py-2.5">
                    <FileText className="size-[22px] shrink-0 text-primary" strokeWidth={2.2} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-extrabold text-foreground">{d.name}</span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {(d.name.split(".").pop() ?? "").toUpperCase()} · {fileSize(d.size)}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" rough={false} className="h-8 px-3.5 text-[13px] shadow-none">
                      <a href={d.url} target="_blank" rel="noreferrer">
                        <ArrowUpRight className="size-3.5" strokeWidth={2.6} />
                        Открыть
                      </a>
                    </Button>
                  </div>
                ))}
              </section>

              {account && (
                <section className={CARD}>
                  <h2 className={H2}>Заявитель</h2>
                  <div className="flex flex-wrap items-center gap-3.5">
                    <UserAvatar user={account} className="size-[52px] shrink-0 rounded-full border-2 border-ink" />
                    <div className="flex min-w-[min(100%,180px)] flex-1 flex-col gap-0.5">
                      <span className="text-base font-extrabold text-foreground">
                        {[account.firstName, account.lastName].filter(Boolean).join(" ") || account.username}
                      </span>
                      <span className="truncate text-[13px] font-medium text-muted-foreground">
                        @{account.username} · {account.email}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" rough={false} className="shadow-none">
                      <Link to={`/admin/events?authorId=${account.id}`}>Мероприятия заявителя</Link>
                    </Button>
                  </div>
                </section>
              )}
            </div>
            <DecisionPanel org={org} />
          </div>
        </>
      )}
    </AdminLayout>
  );
}
