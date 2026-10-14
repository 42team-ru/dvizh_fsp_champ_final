import { Button } from "@/shared/components/ui/button";
import { Sparkles } from "lucide-react";
import { FaYandexInternational } from "react-icons/fa";
import { FiGithub } from "react-icons/fi";
import useAlternativeBlock from "../model/useAlternativeBlock";

export default function AlternativeBlock({
  showMagicLink = false,
}: {
  showMagicLink?: boolean;
}) {
  const { handleMagicLink, handleYandex, handleGithub } = useAlternativeBlock();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 md:flex-row md:gap-3">
        <Button
          variant="secondary"
          className="h-10 w-full justify-center gap-2 px-3 text-xs sm:flex-1 sm:text-sm"
          onClick={handleGithub}
        >
          <FiGithub className="size-4 shrink-0" />
          Войти через GitHub
        </Button>
        <Button
          variant="secondary"
          className="h-10 w-full justify-center gap-2 px-3 text-xs sm:flex-1 sm:text-sm"
          onClick={handleYandex}
        >
          <FaYandexInternational className="size-4 shrink-0" />
          Войти через Яндекс
        </Button>
      </div>
      {showMagicLink && (
        <Button
          variant="secondary"
          className="h-10 w-full justify-center gap-2 px-3 text-sm"
          onClick={handleMagicLink}
        >
          <Sparkles className="size-4 shrink-0" />
          Войти через Magic Link
        </Button>
      )}
    </div>
  );
}
