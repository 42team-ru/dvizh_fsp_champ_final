import { AuroraBackground } from "@/shared/components/ui/aurora-background";
import ShinyText from "@/shared/components/ShinyText";
import TextType from "@/shared/components/TextType";
import { ChevronLeft } from "lucide-react";
import { Link, Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <div className="relative hidden h-full flex-1 flex-col items-start justify-between overflow-hidden p-12 md:flex md:w-1/2">
        <LeftSide />
      </div>

      <div className="flex h-full w-full flex-1 flex-col overflow-y-auto px-6 py-10 pb-6! md:w-1/2 md:border-l md:border-border md:px-14 md:py-16">
        <Outlet />
      </div>
    </div>
  );
}

function LeftSide() {
  return (
    <div className="absolute inset-0">
      <div className="relative h-full w-full">
        <Link
          to="/"
          className="group absolute top-12 left-8 z-100 flex items-center gap-1 px-0! font-medium text-muted-foreground transition-all hover:text-foreground"
        >
          <ChevronLeft
            size={22}
            className="transition-transform duration-200 group-hover:-translate-x-1"
          />
          Назад
        </Link>
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden bg-muted/30 dark:bg-background"
          aria-hidden="true"
        >
          <AuroraBackground
            asLayer
            className="absolute inset-0 bg-muted/30 dark:bg-background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/10 to-background/45" />
        </div>
        <div className="absolute bottom-12 left-8 z-10 flex w-[min(70%,520px)] flex-col gap-4 rounded-lg border border-border/70 bg-card/82 p-6 shadow-xl backdrop-blur-md">
          <ShinyText
            text="Задавайте вопросы данным на русском с NaturalQL"
            className="text-4xl font-bold leading-tight"
            color="var(--muted-foreground)"
            shineColor="var(--foreground)"
            speed={3}
          />
          <div className="relative">
            <p className="invisible text-base leading-7 text-foreground/85">
              NaturalQL сам построит SQL, достанет данные и покажет результат в
              графиках и отчетах.
            </p>
            <TextType
              as="p"
              text="NaturalQL сам построит SQL, достанет данные и покажет результат в графиках и отчетах."
              className="absolute inset-0 text-base leading-7 text-foreground/85"
              cursorClassName="text-primary"
              typingSpeed={24}
              pauseDuration={0}
              loop={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
