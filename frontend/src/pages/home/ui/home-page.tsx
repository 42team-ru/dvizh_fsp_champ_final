import { Link } from "react-router";

// TODO: болванка, заменить на финальный дизайн
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Hackathon app</h1>
      <div className="flex gap-3">
        <Link className="underline" to="/auth/login">Войти</Link>
        <Link className="underline" to="/auth/register">Регистрация</Link>
        <Link className="underline" to="/dashboard">Дашборд</Link>
      </div>
    </main>
  );
}
