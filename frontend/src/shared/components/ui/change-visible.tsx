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
      className="absolute inset-y-0 right-4 text-[13px] font-extrabold text-primary"
    >
      {show ? "Скрыть" : "Показать"}
    </button>
  );
}
