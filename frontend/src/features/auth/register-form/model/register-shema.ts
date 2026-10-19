import z from "zod";

const name = z
  .string()
  .trim()
  .refine((value) => value.split(/\s+/).length >= 2, "Укажите имя и фамилию.")
  .refine(
    (value) => value.split(/\s+/).every((part) => part.length >= 2),
    "Имя и фамилия должны содержать как минимум 2 символа.",
  )
  .refine((value) => value.length <= 200, "Слишком длинное имя.");

const email = z
  .string()
  .email("Пожалуйста, введите действительный email адрес.")
  .max(50, "Email должен содержать не более 50 символов.");

/** Логин совпадает с email: отдельного поля в форме нет. */
const username = z
  .string()
  .min(3, "Имя пользователя должно содержать как минимум 3 символа.");

const password = z
  .string()
  .min(8, "Пароль должен содержать как минимум 8 символов.")
  .max(100, "Пароль должен содержать не более 100 символов.");

export { email as registerEmailSchema, username as registerUsernameSchema };

export const registerSchema = z.object({
  accountType: z.enum(["USER", "ORG"]),
  name,
  email,
  password,
  city: z.string(),
  agree: z.literal(true, "Нужно принять правила и политику."),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Делит «Имя Фамилия» на имя и фамилию (всё после первого слова — фамилия). */
export function splitName(value: string) {
  const [firstName, ...rest] = value.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

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

export const CITIES = ["Красноярск", "Новосибирск", "Томск", "Москва", "Санкт-Петербург"] as const;
