import OnboardingPage from "@/pages/onboarding/ui/onboarding-page";

export function meta() {
  return [
    { title: "Знакомство" },
    { name: "description", content: "Настроим профиль: любимые виды спорта, уровень, расписание и питомец." },
  ];
}

export default function OnboardingRoute() {
  return <OnboardingPage />;
}
