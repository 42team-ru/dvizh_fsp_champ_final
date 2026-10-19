import z from "zod";

const personName = z
  .string()
  .trim()
  .min(2, "От 2 до 100 символов.")
  .max(100, "От 2 до 100 символов.");

const email = z
  .string()
  .email("Пожалуйста, введите действительный email адрес.")
  .max(50, "Email должен содержать не более 50 символов.");

const username = z
  .string()
  .min(3, "Логин — от 3 до 50 символов.")
  .max(50, "Логин — от 3 до 50 символов.");

const password = z
  .string()
  .min(8, "Пароль должен содержать как минимум 8 символов.")
  .max(100, "Пароль должен содержать не более 100 символов.");

export { email as registerEmailSchema, username as registerUsernameSchema };

export const registerSchema = z.object({
  accountType: z.enum(["USER", "ORG"]),
  firstName: personName,
  lastName: personName,
  username: username.trim(),
  email,
  password,
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Сколько из четырёх делений надёжности пароля заполнено. */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  let score = 1;
  if (value.length >= 8) score += 1;
  if (/[a-zа-я]/.test(value) && /[A-ZА-Я]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\p{L}\d]/u.test(value)) score += 1;
  return Math.min(score, 4) as 1 | 2 | 3 | 4;
}

export const STRENGTH_LABEL = ["", "Слабый", "Средний", "Хороший", "Надёжный"] as const;
