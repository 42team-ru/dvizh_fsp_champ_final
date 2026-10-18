import { useDemoAccounts } from "@/shared/api/generated/core/demo/demo";
import { Button } from "@/shared/components/ui/button";

interface DemoAccountsProps {
  /** Подставить логин и пароль в обычную форму входа (отдельной логики входа нет). */
  onPick: (username: string, password: string) => void;
  disabled?: boolean;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: "админ", USER: "пользователь" };

/**
 * Быстрый вход для демо-режима. Бэкенд отдаёт список аккаунтов только при DEMO_MODE=true;
 * иначе список пуст и компонент ничего не рисует.
 */
export default function DemoAccounts({ onPick, disabled }: DemoAccountsProps) {
  const { data } = useDemoAccounts({ query: { retry: false, staleTime: Infinity } });
  const accounts = data?.status === 200 ? data.data : [];

  if (!accounts.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs text-muted-foreground">
        Демо-режим: нажмите, чтобы заполнить форму
      </p>
      <div className="flex flex-wrap gap-2">
        {accounts.map((account) => (
          <Button
            key={account.username}
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => onPick(account.username ?? "", account.password ?? "")}
          >
            {account.firstName} {account.lastName}
            {account.systemRole ? ` · ${ROLE_LABEL[account.systemRole] ?? account.systemRole}` : ""}
          </Button>
        ))}
      </div>
    </div>
  );
}
