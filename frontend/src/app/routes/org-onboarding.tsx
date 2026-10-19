import OrgOnboardingPage from "@/pages/onboarding/ui/org-onboarding-page";

export function meta() {
  return [
    { title: "Анкета клуба" },
    { name: "description", content: "Анкета организации, документы и отправка на проверку." },
  ];
}

export default function OrgOnboardingRoute() {
  return <OrgOnboardingPage />;
}
