import { Navigate, useLocation, useParams } from "react-router";
import { expandShortPath } from "@/shared/lib/short-link";

/** Короткая ссылка из QR (/E/…, /O/…, /U/…) сразу ведёт на полную страницу; вход проверит уже она. */
export default function ShortLinkPage() {
  const { code = "" } = useParams();
  const kind = useLocation().pathname.split("/")[1] ?? "";
  return <Navigate to={expandShortPath(kind, code) ?? "/"} replace />;
}
