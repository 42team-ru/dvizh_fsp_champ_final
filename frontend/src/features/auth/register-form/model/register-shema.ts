import z from "zod";

const firstName = z
  .string()
  .min(2, "Имя должно содержать как минимум 2 символа.")
  .max(100, "Имя должно содержать не более 100 символов.");

const lastName = z
  .string()
  .min(2, "Фамилия должна содержать как минимум 2 символа.")
  .max(100, "Фамилия должна содержать не более 100 символов.");

const email = z
  .string()
  .email("Пожалуйста, введите действительный email адрес.");

const username = z
  .string()
  .min(3, "Имя пользователя должно содержать как минимум 3 символа.");

const password = z
  .string()
  .min(6, "Пароль должен содержать как минимум 6 символов.")
  .max(100, "Пароль должен содержать не более 100 символов.");

const passwordVerification = z
  .string()
  .min(6, "Пароль должен содержать как минимум 6 символов.")
  .max(100, "Пароль должен содержать не более 100 символов.");

export { email as registerEmailSchema, username as registerUsernameSchema };

const registerBaseSchema = z.object({
  firstName,
  lastName,
  email,
  username,
  password,
  passwordVerification,
});

export const registerStep1Schema = registerBaseSchema.pick({
  firstName: true,
  lastName: true,
});

export const registerStep2Schema = registerBaseSchema.pick({
  username: true,
  email: true,
});

export const registerStep3Schema = registerBaseSchema
  .pick({
    password: true,
    passwordVerification: true,
  })
  .refine((data) => data.password === data.passwordVerification, {
    message: "Пароли не совпадают.",
    path: ["passwordVerification"],
  });

export const registerSchema = registerBaseSchema.refine(
  (data) => data.password === data.passwordVerification,
  {
    message: "Пароли не совпадают.",
    path: ["passwordVerification"],
  },
);

export type RegisterFormValues = z.infer<typeof registerBaseSchema>;

export const REGISTER_STEP_FIELD_GROUPS: Record<
  1 | 2 | 3,
  readonly (keyof RegisterFormValues)[]
> = {
  1: ["firstName", "lastName"],
  2: ["username", "email"],
  3: ["password", "passwordVerification"],
};

export function parseRegisterStep(
  step: 1 | 2 | 3,
  values: RegisterFormValues,
):
  | { ok: true }
  | { ok: false; fieldErrors: Partial<Record<keyof RegisterFormValues, string>> } {
  const schema =
    step === 1 ? registerStep1Schema : step === 2 ? registerStep2Schema : registerStep3Schema;
  const payload =
    step === 1
      ? { firstName: values.firstName, lastName: values.lastName }
      : step === 2
        ? { username: values.username, email: values.email }
        : {
            password: values.password,
            passwordVerification: values.passwordVerification,
          };

  const result = schema.safeParse(payload);
  if (result.success) {
    return { ok: true };
  }

  const fieldErrors: Partial<Record<keyof RegisterFormValues, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") {
      continue;
    }
    const fieldKey = key as keyof RegisterFormValues;
    if (fieldErrors[fieldKey]) {
      continue;
    }
    fieldErrors[fieldKey] = issue.message;
  }
  return { ok: false, fieldErrors };
}
