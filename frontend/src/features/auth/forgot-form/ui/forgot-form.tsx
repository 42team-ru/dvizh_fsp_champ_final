import { Button } from "@/shared/components/ui/button";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Link } from "react-router";
import { useForgotForm } from "../model/useForgotForm";

export default function ForgotForm() {
  const { form } = useForgotForm();

  return (
    <TooltipProvider>
      <form
        className="flex flex-col gap-6"
        onSubmit={(evt) => {
          evt.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="email"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const firstError = field.state.meta.errors[0];
            const errorMessage =
              typeof firstError === "string" ? firstError : firstError?.message;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Email<span className="text-primary">*</span>
                </FieldLabel>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      className="h-10"
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Введите ваш email"
                    />
                  </TooltipTrigger>
                  {isInvalid && errorMessage && (
                    <TooltipContent side="bottom">
                      {errorMessage}
                    </TooltipContent>
                  )}
                </Tooltip>
              </Field>
            );
          }}
        />

        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-10"
        >
          Отправить ссылку
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Вспомнили пароль?{" "}
          <Link
            to="/auth/login"
            className="text-foreground text-md hover:text-foreground/80 transition-colors"
            viewTransition
          >
            Войти
          </Link>
        </p>
      </form>
    </TooltipProvider>
  );
}
