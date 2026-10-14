import { Link } from "react-router";
import { Sparkles, Menu } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Возможности" },
  { href: "#pricing", label: "Цены" },
  { href: "#docs", label: "Документация" },
  { href: "#about", label: "О нас" },
] as const;

interface PublicHeaderProps {
  className?: string;
}

export function PublicHeader({ className }: PublicHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">NaturalQL</span>
        </Link>

        {/* Nav links (desktop) */}
        <nav className="hidden flex-1 items-center gap-0.5 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Auth buttons */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/auth/login">Войти</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth/register">Начать бесплатно</Link>
          </Button>

          {/* Mobile menu placeholder */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
