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

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "админ",
  USER: "пользователь",
  ORG: "организация",
};
const TONES = ["bg-sky", "bg-mint", "bg-accent"];

/**
 * Быстрый вход для демо-режима. Бэкенд отдаёт список аккаунтов только при DEMO_MODE=true;
 * иначе список пуст и компонент ничего не рисует.
 */
export default function DemoAccounts({ onPick, disabled }: DemoAccountsProps) {
  const { data } = useDemoAccounts({ query: { retry: false, staleTime: Infinity } });
  const accounts = data?.status === 200 ? data.data : [];
  const [copied, setCopied] = useState(false);

  if (!accounts.length) {
    return null;
  }

  const password = accounts[0]?.password;

  return (
    <div
      className={cn(
        "mt-1 flex w-full max-w-[380px] flex-col gap-3 rounded-card border-2 border-ink bg-secondary p-[18px] shadow-[4px_4px_0_var(--ink)] lg:gap-[14px] lg:p-6",
        "lg:absolute lg:top-[197px] lg:left-[484px] lg:mt-0 lg:w-[328px]"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-[17px] leading-[normal] font-bold lg:text-lg whitespace-nowrap text-foreground">
          Демо-аккаунты
        </p>
        <Badge className="h-auto border-0 bg-ink px-[10px] py-1 text-[11px] leading-normal font-extrabold tracking-[1px] text-secondary">
          тест
        </Badge>
      </div>
      <p className="text-[13px] leading-[18px] font-semibold text-foreground">
        Войди в один клик и посмотри, как всё устроено.
      </p>
      {accounts.map((account, i) => {
        const first = account.firstName ?? "";
        const last = account.lastName ?? "";
        return (
          <div
            key={account.username}
            className="flex items-center gap-[10px] rounded-2xl border-2 border-ink bg-card p-[10px] lg:p-3"
          >
            <Disc
              initials={`${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()}
              tone={TONES[i % TONES.length]}
              className="size-10 shrink-0"
              textClassName="text-[13px]"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-px whitespace-nowrap">
              <p className="text-sm font-extrabold text-foreground">
                {first} {last}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">
                {account.systemRole ? (ROLE_LABEL[account.systemRole] ?? account.systemRole) : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="ink"
              disabled={disabled}
              onClick={() => onPick(account.username ?? "", account.password ?? "")}
              className="h-10 w-[70px] shrink-0 border-0 px-0 text-xs leading-normal shadow-none lg:h-8 lg:w-auto lg:px-3"
            >
              Войти
            </Button>
          </div>
        );
      })}
      {password ? (
        <div className="flex items-center justify-between rounded-[14px] border-2 border-dashed border-ink px-[14px] py-[10px] font-extrabold whitespace-nowrap">
          <p className="text-[13px] text-foreground">Пароль у всех: {password}</p>
          <button
            type="button"
            className="text-xs text-primary"
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
