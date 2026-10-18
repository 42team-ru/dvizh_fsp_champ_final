import { EyeIcon, EyeOffIcon } from "lucide-react";

export default function ChangeVisible({
  show,
  changeShow,
  disabled,
}: {
  show: boolean;
  changeShow: (show: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => changeShow(!show)}
      disabled={disabled}
      aria-label={show ? "Скрыть пароль" : "Показать пароль"}
      className="absolute inset-y-0 right-3 grid place-items-center text-muted-foreground"
    >
      {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
    </button>
  );
}
