import { Link } from "react-router";

export function RegisterFormLinks() {
  return (
    <p className="w-full text-center text-sm font-semibold text-muted-foreground">
      Уже есть аккаунт?{" "}
      <Link
        to="/auth/login"
        className="font-extrabold text-primary hover:text-primary/80"
        viewTransition
      >
        Войти
      </Link>
    </p>
  );
}
