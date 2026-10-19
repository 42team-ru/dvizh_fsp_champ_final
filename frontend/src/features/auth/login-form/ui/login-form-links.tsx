import { Link } from "react-router";

export function LoginFormLinks() {
  return (
    <p className="w-full text-center text-sm font-semibold text-muted-foreground">
      Нет аккаунта?{" "}
      <Link
        to="/auth/register"
        className="font-extrabold text-primary hover:text-primary/80"
        viewTransition
      >
        Зарегистрироваться
      </Link>
    </p>
  );
}
