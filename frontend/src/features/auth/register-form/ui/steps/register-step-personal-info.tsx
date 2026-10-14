import { AuthTextInput } from "@/features/auth/shared/ui/auth-text-input";
import { getFirstFieldError } from "@/shared/lib/form-errors";
import { motion } from "motion/react";
import type {
  RegisterFormInstance,
  RegisterStepMotionProps,
} from "./register-step-types";

interface RegisterStepPersonalInfoProps extends RegisterStepMotionProps {
  form: RegisterFormInstance;
  isSubmitting: boolean;
}

export function RegisterStepPersonalInfo({
  form,
  isSubmitting,
  stepRoot,
  stepBlock,
}: RegisterStepPersonalInfoProps) {
  return (
    <motion.div
      className="space-y-1 pb-4 sm:pb-6"
      variants={stepRoot}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={stepBlock} className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          Шаг 1 - Личные данные
        </p>
        <p className="text-muted-foreground text-xs">
          Как к вам обращаться в сервисе
        </p>
      </motion.div>
      <motion.div
        variants={stepBlock}
        className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-3"
      >
        <form.Field
          name="firstName"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const errorMessage = getFirstFieldError(field.state.meta.errors);

            return (
              <AuthTextInput
                name={field.name}
                label="Имя"
                value={field.state.value}
                placeholder="Введите ваше имя"
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                isInvalid={isInvalid}
                errorMessage={errorMessage}
                disabled={isSubmitting}
              />
            );
          }}
        />
        <form.Field
          name="lastName"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const errorMessage = getFirstFieldError(field.state.meta.errors);

            return (
              <AuthTextInput
                name={field.name}
                label="Фамилия"
                value={field.state.value}
                placeholder="Введите вашу фамилию"
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                isInvalid={isInvalid}
                errorMessage={errorMessage}
                disabled={isSubmitting}
              />
            );
          }}
        />
      </motion.div>
    </motion.div>
  );
}
