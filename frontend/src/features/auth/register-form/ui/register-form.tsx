import { useRegisterForm } from "../model/useRegisterForm";
import { RegisterFormLinks } from "./register-form-links";
import Stepper from "@/shared/components/Stepper";
import { useState } from "react";
import {
  parseRegisterStep,
  type RegisterFormValues,
} from "../model/register-shema";
import { motion, useReducedMotion } from "motion/react";
import { useRegisterFormMotionVariants } from "../model/useRegisterFormMotionVariants";
import { RegisterStepPersonalInfo } from "./steps/register-step-personal-info";
import { RegisterStepAccount } from "./steps/register-step-account";
import { RegisterStepPassword } from "./steps/register-step-password";

export default function RegisterForm() {
  const reduceMotion = useReducedMotion();
  const v = useRegisterFormMotionVariants(reduceMotion);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const {
    form,
    isUsernameChecking,
    isEmailChecking,
    isUsernameAvailable,
    isEmailAvailable,
    scheduleUsernameAvailabilityCheck,
    scheduleEmailAvailabilityCheck,
    showPassword,
    setShowPassword,
    showPasswordVerification,
    setShowPasswordVerification,
    validateStep,
  } = useRegisterForm();

  return (
    <motion.form
      className="flex w-full flex-col gap-4"
      variants={v.formShell}
      initial="hidden"
      animate="visible"
      onSubmit={(evt) => {
        evt.preventDefault();
      }}
    >
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <form.Subscribe selector={(state) => state.values}>
            {(values) => {
              const stepSchemaValid = parseRegisterStep(
                currentStep,
                values as RegisterFormValues,
              ).ok;
              const accountStepValid =
                stepSchemaValid &&
                !isUsernameChecking &&
                !isEmailChecking &&
                isUsernameAvailable === true &&
                isEmailAvailable === true;
              const currentStepValid =
                currentStep === 2 ? accountStepValid : stepSchemaValid;

              return (
                <Stepper
                  className="w-full"
                  stepCircleContainerClassName="w-full max-w-none rounded-xl"
                  stepContainerClassName="px-8 pb-4 pt-4 sm:pb-5 sm:pt-5"
                  contentClassName="space-y-5 sm:space-y-6"
                  footerClassName="pb-5 sm:pb-6"
                  disableStepIndicators
                  onStepChange={(step) => setCurrentStep(step as 1 | 2 | 3)}
                  backButtonText="Назад"
                  nextButtonText="Далее"
                  completeButtonText={
                    isSubmitting ? "Регистрируем..." : "Зарегистрироваться"
                  }
                  backButtonProps={{
                    className:
                      "cursor-pointer text-muted-foreground hover:text-foreground rounded-md",
                    disabled: isSubmitting,
                  }}
                  nextButtonProps={{
                    disabled: isSubmitting || !currentStepValid,
                    className:
                      "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 h-10 rounded-md px-5 font-medium ml-auto disabled:opacity-60 disabled:pointer-events-none",
                  }}
                  beforeNext={(step) => validateStep(step as 1 | 2 | 3)}
                  beforeComplete={async () => {
                    if (!validateStep(3)) {
                      return false;
                    }
                    await form.handleSubmit();
                    return false;
                  }}
                >
                  <RegisterStepPersonalInfo
                    form={form}
                    isSubmitting={isSubmitting}
                    stepRoot={v.stepRoot}
                    stepBlock={v.stepBlock}
                  />

                  <RegisterStepAccount
                    form={form}
                    isSubmitting={isSubmitting}
                    isUsernameChecking={isUsernameChecking}
                    isEmailChecking={isEmailChecking}
                    onUsernameChange={scheduleUsernameAvailabilityCheck}
                    onEmailChange={scheduleEmailAvailabilityCheck}
                    stepRoot={v.stepRoot}
                    stepBlock={v.stepBlock}
                  />

                  <RegisterStepPassword
                    form={form}
                    isSubmitting={isSubmitting}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    showPasswordVerification={showPasswordVerification}
                    setShowPasswordVerification={setShowPasswordVerification}
                    stepRoot={v.stepRoot}
                    stepBlock={v.stepBlock}
                  />
                </Stepper>
              );
            }}
          </form.Subscribe>
        )}
      </form.Subscribe>

      <motion.div
        className="mt-2"
        variants={v.links}
        initial="hidden"
        animate="visible"
      >
        <RegisterFormLinks />
      </motion.div>
    </motion.form>
  );
}
