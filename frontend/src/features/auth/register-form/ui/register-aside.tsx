/** Витрина справа от формы: что получит человек после регистрации. */
export function RegisterAside() {
  return (
    <aside className="mt-8 hidden w-full max-w-[380px] flex-col gap-[14px] lg:absolute lg:flex lg:top-[136px] lg:left-[484px] lg:mt-0 lg:w-[328px]">
      <div className="flex gap-3 whitespace-nowrap">
        <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[18px] border-2 border-ink bg-primary p-[14px]">
          <p className="font-display text-sm leading-[normal] font-bold text-white">Билеты</p>
          <p className="text-xs font-semibold text-lilac">в один тап</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[18px] border-2 border-ink bg-secondary p-[14px] text-foreground">
          <p className="font-display text-sm leading-[normal] font-bold">Серии</p>
          <p className="text-xs font-semibold">и бейджи</p>
        </div>
      </div>
      <div className="flex items-center gap-[10px] rounded-[18px] border-2 border-ink bg-sky py-[10px] pr-4 pl-3">
        <img src="/register/pet.png" alt="" className="size-[52px] shrink-0 object-contain" />
        <p className="flex-1 text-[13px] leading-[18px] font-bold text-foreground">
          Бублик — питомец и помощник, подскажет, куда пойти
        </p>
      </div>
    </aside>
  );
}
