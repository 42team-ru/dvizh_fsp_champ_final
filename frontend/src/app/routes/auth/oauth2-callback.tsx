import type { Route } from "../../+types/root";
import { redirect } from "react-router";
import LoadingPage from "@/pages/loading/ui/loading-page";
import { refreshAuthRefreshPost } from "@/shared/api/generated/core/auth/auth";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Вход" }];
}

export async function clientLoader() {
  try {
    await refreshAuthRefreshPost({});
    return redirect("/dashboard");
  } catch {
    return redirect("/auth/login");
  }
}

export default function OAuth2CallbackPage() {
  return <LoadingPage />;
}
