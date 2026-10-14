import { useForm } from "@tanstack/react-form";
import { forgotSchema } from "./forgot-shema";
import { toast } from "sonner";

export function useForgotForm() {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: forgotSchema,
    },
    onSubmit: async () => {
      toast.info("В разработке", {
        description: "Функция восстановления пароля находится в разработке",
      });
    },
  });

  return {
    form,
  };
}
