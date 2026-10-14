import LoginPage from "@/pages/auth/login-page";
import type { Route } from "./+types/login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Вход" },
    { name: "description", content: "Страница входа" },
  ];
}

export default function Login() {
  return <LoginPage />;
}
