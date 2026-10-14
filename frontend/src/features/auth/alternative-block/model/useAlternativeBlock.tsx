import { toast } from "sonner";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "https://42team.ru/api";

export default function useAlternativeBlock() {
  const handleMagicLink = () => {
    toast.info(
      "Функция Magic Link в разработке. Пожалуйста, выберите другой способ входа.",
    );
  };

  const handleOAuth2 = (provider: string) => {
    window.location.href = `${BACKEND_URL}/oauth2/authorization/${provider}`;
  };

  return {
    handleMagicLink,
    handleYandex: () => handleOAuth2("yandex"),
    handleGithub: () => handleOAuth2("github"),
  };
}
