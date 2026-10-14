import { AuthPasswordInput } from "@/features/auth/shared/ui/auth-password-input";
import { getFirstFieldError } from "@/shared/lib/form-errors";
import { motion } from "motion/react";
import type {
  RegisterFormInstance,
  RegisterStepMotionProps,
} from "./register-step-types";

interface RegisterStepPasswordProps extends RegisterStepMotionProps {
  form: RegisterFormInstance;
  isSubmitting: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showPasswordVerification: boolean;
  setShowPasswordVerification: (show: boolean) => void;
}

export function RegisterStepPassword({
  form,
  isSubmitting,
  showPassword,
  setShowPassword,
  showPasswordVerification,
  setShowPasswordVerification,
  stepRoot,
  stepBlock,
}: RegisterStepPasswordProps) {
  return (
    <motion.div
      className="space-y-1 pb-4 sm:pb-6"
      variants={stepRoot}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={stepBlock} className="space-y-1">
        <p className="text-foreground text-sm font-medium">Шаг 3 - Пароль</p>
        <p className="text-muted-foreground text-xs">
          Придумайте пароль и подтвердите его
        </p>
      </motion.div>
      <motion.div
        variants={stepBlock}
        className="mt-4 flex flex-col gap-4 md:flex-row md:gap-3"
      >
        <form.Field
          name="password"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const errorMessage = getFirstFieldError(field.state.meta.errors);

            return (
              <AuthPasswordInput
                name={field.name}
                label="Пароль"
                value={field.state.value}
                placeholder="Введите ваш пароль"
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                isInvalid={isInvalid}
                errorMessage={errorMessage}
                showPassword={showPassword}
                onTogglePassword={setShowPassword}
                disabled={isSubmitting}
              />
            );
          }}
        />

        <form.Field
          name="passwordVerification"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const errorMessage = getFirstFieldError(field.state.meta.errors);

            return (
              <AuthPasswordInput
                name={field.name}
                label="Подтверждение пароля"
                value={field.state.value}
                placeholder="Подтвердите пароль"
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                isInvalid={isInvalid}
                errorMessage={errorMessage}
                showPassword={showPasswordVerification}
                onTogglePassword={setShowPasswordVerification}
                disabled={isSubmitting}
              />
            );
          }}
        />
      </motion.div>
    </motion.div>
  );
}
