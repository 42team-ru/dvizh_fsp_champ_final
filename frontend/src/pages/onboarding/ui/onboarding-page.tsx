import { useQueryClient } from "@tanstack/react-query";
import { getUsersMyPreferencesQueryKey, useUsersSaveMyPreferences } from "@/shared/api/generated/core/users/users";
import { toPreferences } from "../model/to-preferences";
import { getPetsGetMineQueryKey, usePetsRename } from "@/shared/api/generated/core/pets/pets";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { OnboardingMobile } from "./onboarding-mobile";
import { cn } from "cn";
import {
  INITIAL_DATA,
  StepDone,
  StepLevel,
  StepHome,
  StepPet,
  StepSports,
  StepWelcome,
  type OnboardingData,
} from "./onboarding-steps";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

const STEPS = 6;

function Logo() {
  return (
    <div className="absolute top-5 left-12 flex items-center gap-[10px]">
      <img src="/icon.svg" alt="" className="size-9 shrink-0" />
      <span className="font-display text-base leading-[normal] font-bold whitespace-nowrap text-foreground">
        Движ
      </span>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div
      className="absolute top-[34px] left-[456px] flex items-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEPS}
      aria-valuenow={step}
      aria-label="Шаг онбординга"
    >
      {Array.from({ length: STEPS }, (_, i) => (
        <span
          key={i}
          className={cn(
            "box-border h-2 w-14 rounded-full border-[1.5px] border-ink",
            i < step ? "bg-primary" : "bg-card"
          )}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = Math.min(Math.max(Number(params.get("step")) || 1, 1), STEPS);
  const [step, setStep] = useState(initial);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  const update = (patch: Partial<OnboardingData>) => setData((prev) => ({ ...prev, ...patch }));
  const queryClient = useQueryClient();
  const rename = usePetsRename({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getPetsGetMineQueryKey() }),
    },
  });
  const savePreferences = useUsersSaveMyPreferences({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getUsersMyPreferencesQueryKey() }),
    },
  });
  const finish = (to: string) => {
    rename.mutate({ data: { name: data.petName } });
    // Предпочтения сохраняем, если человек дошёл до шага с ними; без дней сервер отклонит PUT.
    if (step >= 3 && data.days.length > 0) savePreferences.mutate({ data: toPreferences(data) });
    navigate(to);
  };

  // На втором шаге нужен хотя бы один вид спорта, на третьем — хотя бы один день.
  const canNext =
    step === 2
      ? data.sports.length + data.customSports.length > 0
      : step === 3
        ? data.days.length > 0
        : true;

  return (
    <>
    <OnboardingMobile
      step={step}
      setStep={setStep}
      data={data}
      update={update}
      canNext={canNext}
      finish={finish}
    />
    <div className="relative isolate hidden min-h-dvh overflow-x-clip bg-background lg:block">
      <MemphisBackground seed="onboarding" />
      <div className="relative mx-auto h-[820px] w-[1280px] overflow-hidden bg-background">
        <Logo />
        <Progress step={step} />
        {step < STEPS ? (
          <button
            type="button"
            onClick={() => finish("/")}
            className="absolute top-[29px] left-[1147px] text-sm leading-[normal] font-extrabold text-primary"
          >
            Пропустить
          </button>
        ) : (
          <span className="absolute top-[29px] left-[1162px] text-sm leading-[normal] font-extrabold text-muted-foreground">
            Шаг {STEPS} из {STEPS}
          </span>
        )}

        {step === 1 && <StepWelcome />}
        {step === 2 && <StepSports data={data} update={update} />}
        {step === 3 && <StepLevel data={data} update={update} />}
        {step === 4 && <StepHome data={data} update={update} />}
        {step === 5 && <StepPet data={data} update={update} />}
        {step === 6 && <StepDone onFind={() => finish("/feed")} onHome={() => finish("/")} />}

        {step < STEPS ? (
          <>
            <div className="absolute top-[726px] left-0 h-[2px] w-full bg-track" />
            <div className="absolute top-[728px] left-0 flex h-[94px] w-full items-center justify-between px-16">
              {step > 1 ? (
                <Button
                  variant="soft"
                  onClick={() => setStep(step - 1)}
                  className="h-[52px] w-[130px] px-6"
                >
                  Назад
                </Button>
              ) : (
                <span />
              )}
              <Button
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
                className="h-[54px] w-[200px] px-6"
              >
                {step === 1 ? "Погнали" : "Дальше"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
    </>
  );
}
