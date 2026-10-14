import z from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(2, "Имя пользователя должно содержать как минимум 2 символа.")
    .max(100, "Имя пользователя должно содержать не более 100 символов."),
  password: z
    .string()
    .max(100, "Пароль должен содержать не более 100 символов."),
});
