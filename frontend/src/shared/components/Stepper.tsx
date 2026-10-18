import { Children, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

// TODO: болванка (react-bits Stepper): рабочие шаги без анимации. Дети — шаги.
type Props = {
  children: ReactNode;
  className?: string;
  stepCircleContainerClassName?: string;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  disableStepIndicators?: boolean;
  onStepChange?: (step: number) => void;
  beforeNext?: (step: number) => boolean | Promise<boolean>;
  beforeComplete?: () => boolean | Promise<boolean>;
  backButtonText?: string;
  nextButtonText?: string;
  completeButtonText?: ReactNode;
  backButtonProps?: ComponentProps<"button">;
  nextButtonProps?: ComponentProps<"button">;
};

export default function Stepper({
  children,
  className,
  contentClassName,
  footerClassName,
  onStepChange,
  beforeNext,
  beforeComplete,
  backButtonText = "Back",
  nextButtonText = "Next",
  completeButtonText = "Complete",
  backButtonProps,
  nextButtonProps,
}: Props) {
  const steps = Children.toArray(children);
  const [step, setStep] = useState(1);
  const last = step === steps.length;

  const go = (n: number) => {
    setStep(n);
    onStepChange?.(n);
  };

  const next = async () => {
    if (last) {
      await beforeComplete?.();
      return;
    }
    if (beforeNext && !(await beforeNext(step))) return;
    go(step + 1);
  };

  return (
    <div className={cn(className)}>
      <div className={cn(contentClassName)}>{steps[step - 1]}</div>
      <div className={cn("flex", footerClassName)}>
        {step > 1 && (
          <button type="button" {...backButtonProps} onClick={() => go(step - 1)}>
            {backButtonText}
          </button>
        )}
        <button type="button" {...nextButtonProps} onClick={next}>
          {last ? completeButtonText : nextButtonText}
        </button>
      </div>
    </div>
  );
}
