import type { Variants } from "motion/react";
import type { useRegisterForm } from "../../model/useRegisterForm";

export type RegisterFormInstance = ReturnType<typeof useRegisterForm>["form"];

export interface RegisterStepMotionProps {
  stepRoot: Variants;
  stepBlock: Variants;
}
