import { useState } from "react";
import { useDemoAccounts } from "@/shared/api/generated/core/demo/demo";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Disc } from "@/shared/components/ui/disc";
import { cn } from "cn";

interface DemoAccountsProps {
  /** Подставить логин и пароль в обычную форму входа (отдельной логики входа нет). */
  onPick: (username: string, password: string) => void;
  disabled?: boolean;
}

/** Какие демо-аккаунты показываем и как подписываем: админ, пользователи и два клуба — допущенный и на проверке. */
const DEMO_PICK: { username: string; label: string }[] = [
  { username: "admin", label: "администратор" },
  { username: "anna", label: "пользователь" },
  { username: "petr", label: "пользователь · организатор" },
  { username: "ladya", label: "клуб «Ладья» · допущен" },
  { username: "enisey", label: "клуб «Енисей» · заявка на проверке" },
];
const TONES = ["bg-sky", "bg-mint", "bg-accent", "bg-lavender-soft"];

/**
 * Быстрый вход для демо-режима. Бэкенд отдаёт список аккаунтов только при DEMO_MODE=true;
 * иначе список пуст и компонент ничего не рисует.
 */
export default function DemoAccounts({ onPick, disabled }: DemoAccountsProps) {
  const { data } = useDemoAccounts({ query: { retry: false, staleTime: Infinity } });
  const all = data?.status === 200 ? data.data : [];
  const accounts = DEMO_PICK.flatMap((pick) => {
    const account = all.find((a) => a.username === pick.username);
    return account ? [{ account, label: pick.label }] : [];
  });
  const [copied, setCopied] = useState(false);

  if (!accounts.length) {
    return null;
  }

  const password = accounts[0]?.account.password;

  return (
    <div
      className={cn(
        "mt-1 flex w-full max-w-[400px] flex-col gap-4 rounded-card border-2 border-ink bg-secondary p-5 shadow-[4px_4px_0_var(--ink)] lg:p-6",
        "xl:mt-0 xl:w-[364px] xl:max-w-none xl:shrink-0 2xl:w-[400px]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg leading-[normal] font-bold whitespace-nowrap text-foreground lg:text-xl">
          Демо-аккаунты
        </p>
        <Badge className="h-auto border-0 bg-ink px-[10px] py-1 text-[11px] leading-normal font-extrabold tracking-[1px] text-secondary">
          тест
        </Badge>
      </div>
      <p className="text-sm leading-5 font-semibold text-foreground">
        Войди в один клик и посмотри, как всё устроено.
      </p>

      <ul className="flex flex-col gap-3">
        {accounts.map(({ account, label }, i) => {
          const first = account.firstName ?? "";
          const last = account.lastName ?? "";
          return (
            <li
              key={account.username}
              className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card p-3"
            >
              <Disc
                initials={`${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()}
                user={account.systemRole === "ORG" ? undefined : account}
                tone={TONES[i % TONES.length]}
                className="size-11 shrink-0"
                textClassName="text-sm"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-[15px] leading-5 font-extrabold break-words hyphens-auto text-foreground">
                  {first} {last}
                </p>
                <p className="text-xs leading-4 font-semibold text-muted-foreground">{label}</p>
              </div>
              <Button
                type="button"
                variant="ink"
                rough={false}
                disabled={disabled}
                onClick={() => onPick(account.username ?? "", account.password ?? "")}
                className="h-9 w-[76px] shrink-0 px-0 text-[13px] leading-normal shadow-none"
              >
                Войти
              </Button>
            </li>
          );
        })}
      </ul>

      {password ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-ink px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] leading-4 font-extrabold tracking-[1px] text-foreground uppercase">
              Пароль у всех
            </span>
            <span className="font-mono text-[15px] leading-5 font-bold break-all text-foreground">
              {password}
            </span>
          </div>
          <button
            type="button"
            className="shrink-0 text-[13px] font-extrabold text-primary"
            onClick={() => {
              void navigator.clipboard?.writeText(password);
              setCopied(true);
            }}
          >
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
