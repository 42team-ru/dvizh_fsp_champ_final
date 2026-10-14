import LoginPage from "@/pages/auth/login-page";
import type { Route } from "./+types/login";
import RegisterPage from "@/pages/auth/register-page";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Регистрация" },
    { name: "description", content: "Страница регистрации" },
  ];
}

export default function Register() {
  return <RegisterPage />;
}
