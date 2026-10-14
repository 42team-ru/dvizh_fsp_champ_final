import { Link } from "react-router";

export function RegisterFormLinks() {
  return (
    <div className="flex justify-center">
      <p className="text-xs md:text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link
          to="/auth/login"
          className="text-foreground text-md hover:text-foreground/80 transition-colors"
          viewTransition
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
