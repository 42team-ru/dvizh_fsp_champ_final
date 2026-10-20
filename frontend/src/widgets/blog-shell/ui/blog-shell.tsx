import type { ReactNode } from "react";
import { cn } from "cn";
import { AppHeader } from "@/widgets/app-header/ui/app-header";
import { MobileAppBar } from "@/widgets/mobile-shell/ui/mobile-app-bar";
import { MobileTabBar } from "@/widgets/mobile-shell/ui/mobile-tab-bar";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";

/**
 * Каркас страниц блога: на компьютере — общая шапка, на телефоне — верхняя панель и нижнее меню.
 * Вёрстка резиновая: одна разметка для обоих размеров, колонки появляются с lg.
 */
export function BlogShell({ title = "Блог", children, className, tabBar = true }: {
  title?: string;
  children: ReactNode;
  className?: string;
  tabBar?: boolean;
}) {
  return (
    <div className="relative isolate min-h-dvh overflow-clip bg-background">
      <MemphisBackground seed="blog" className="hidden lg:block" />
      <div className="hidden lg:block">
        <AppHeader current="blog" />
      </div>
      <div className="lg:hidden">
        <MobileAppBar dir="m-feed" title={title} />
      </div>
      <main className={cn("mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pt-2 pb-32 lg:gap-7 lg:px-8 lg:pt-8 lg:pb-16", className)}>
        {children}
      </main>
      {tabBar && <MobileTabBar current="blog" />}
    </div>
  );
}
