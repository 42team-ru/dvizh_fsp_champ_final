import { AuthTextInput } from "@/features/auth/shared/ui/auth-text-input";
import { getFirstFieldError } from "@/shared/lib/form-errors";
import { Mail } from "lucide-react";
import { motion } from "motion/react";
import type {
  RegisterFormInstance,
  RegisterStepMotionProps,
} from "./register-step-types";

interface RegisterStepAccountProps extends RegisterStepMotionProps {
  form: RegisterFormInstance;
  isSubmitting: boolean;
  isUsernameChecking: boolean;
  isEmailChecking: boolean;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}

export function RegisterStepAccount({
  form,
  isSubmitting,
  isUsernameChecking,
  isEmailChecking,
  onUsernameChange,
  onEmailChange,
  stepRoot,
  stepBlock,
}: RegisterStepAccountProps) {
  return (
    <motion.div
      className="space-y-1 pb-4 sm:pb-6"
      variants={stepRoot}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={stepBlock} className="space-y-1">
        <p className="text-foreground text-sm font-medium">
        </p>
        <p className="text-muted-foreground text-xs">
          Логин и почта для входа и уведомлений
        </p>
      </motion.div>
      <motion.div variants={stepBlock} className="mt-4 flex flex-col gap-4">
        <form.Field
          name="username"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const errorMessage = getFirstFieldError(field.state.meta.errors);

            return (
              <AuthTextInput
                name={field.name}
                label="Имя пользователя"
                value={field.state.value}
                placeholder="Введите ваше имя пользователя"
                startIcon={<span className="text-sm">@</span>}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  field.handleChange(nextValue);
                  onUsernameChange(nextValue);
                }}
                isInvalid={isInvalid}
                errorMessage={
                  errorMessage ??
                  (isUsernameChecking ? "Проверяем доступность логина..." : undefined)
                }
                disabled={isSubmitting}
              />
            );
          }}
        />

        <form.Field
          name="email"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const errorMessage = getFirstFieldError(field.state.meta.errors);

            return (
              <AuthTextInput
                name={field.name}
                label="Email"
                value={field.state.value}
                placeholder="Введите ваш email"
                type="email"
                startIcon={<Mail />}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  field.handleChange(nextValue);
                  onEmailChange(nextValue);
                }}
                isInvalid={isInvalid}
                errorMessage={
                  errorMessage ??
                  (isEmailChecking ? "Проверяем email через API..." : undefined)
                }
                disabled={isSubmitting}
              />
            );
          }}
        />
      </motion.div>
    </motion.div>
  );
}
