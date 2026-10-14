import { Link } from "react-router";

export function LoginFormLinks() {
  return (
    <div className="flex justify-between">
      <p className="text-xs md:text-sm text-muted-foreground">
        Нет аккаунта?{" "}
        <Link
          to="/auth/register"
          className="text-foreground text-md hover:text-foreground/80 transition-colors"
          viewTransition
        >
          Зарегистрироваться
        </Link>
      </p>
      <Link
        to="/auth/forgot-password"
        className="text-muted-foreground text-md hover:text-foreground transition-colors"
        viewTransition
      >
        <p className="text-xs md:text-sm">Забыли пароль?</p>
      </Link>
    </div>
  );
}
