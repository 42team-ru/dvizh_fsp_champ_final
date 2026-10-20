import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./styles/app.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "./providers/theme-provider";
import { ViewportScale } from "./providers/viewport-scale";
import { PwaProvider } from "./providers/pwa-provider";
import { OfflineBanner } from "./providers/offline-sync";
import { AvatarBeaverContext } from "@/shared/components/ui/user-avatar";
import { UserBeaver } from "@/widgets/event-card/ui/card-participants";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
];

// Без сети запросы всё равно идут в service worker: он отдаёт сохранённые личные данные (см. public/sw.js).
// Действия без сети сразу падают с ошибкой, а не висят «в ожидании».
const queryClient = new QueryClient({
  defaultOptions: { queries: { networkMode: "offlineFirst" }, mutations: { networkMode: "always" } },
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4B3FE0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Движ" />
        <Meta />
        <Links />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <ViewportScale />
            <PwaProvider />
            <OfflineBanner />
            <AvatarBeaverContext.Provider value={(user) => <UserBeaver userId={user?.id} pet={user?.pet} className="size-full" />}>
              <MotionConfig reducedMotion="user">{children}</MotionConfig>
            </AvatarBeaverContext.Provider>
            <Toaster position="top-right" offset={20} expand visibleToasts={3} />
          </ThemeProvider>
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  if (import.meta.env.DEV) {
    import("react-grab");
  }

  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Что-то пошло не так";
  let details = "Попробуйте обновить страницу или вернуться на главную.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Страница не найдена" : "Что-то пошло не так";
    details =
      error.status === 404
        ? "Возможно, ссылка устарела или в ней опечатка."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto flex flex-col items-center gap-3 p-4 pt-16 text-center">
      <img src="/bublik/sad.png" alt="" className="h-40 w-auto" />
      <h1 className="font-display text-2xl font-extrabold">{message}</h1>
      <p className="max-w-[420px] font-medium text-muted-foreground">{details}</p>
      <a href="/" className="mt-2 rounded-full border-2 border-ink bg-primary px-6 py-3 font-extrabold text-primary-foreground shadow-hard-sm">
        На главную
      </a>
      {stack && (
        <pre className="w-full overflow-x-auto p-4 text-left">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
