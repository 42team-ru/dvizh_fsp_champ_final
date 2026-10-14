import ForgotPasswordPage from "@/pages/auth/forgot-password-page";
import type { Route } from "./+types/forgot-password";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Восстановление пароля" },
    { name: "description", content: "Страница восстановления пароля" },
  ];
}

export default function ForgotPassword() {
  return <ForgotPasswordPage />;
}
