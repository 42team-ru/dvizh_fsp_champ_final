import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { USER_QUERY_KEY, useUser } from "@/entity/user/model/use-user";
import type {
  MeResponse, PetCatalogResponse, PetResponse, ShopItemResponse, UserPreferencesResponse, UserSportResponse,
} from "@/shared/api/generated/core/appAPI.schemas";
import {
  getPetsGetMineQueryKey, usePetsCatalog, usePetsGetMine, usePetsRename, usePetsSaveMine, usePetsShop,
} from "@/shared/api/generated/core/pets/pets";
import {
  getUsersMyPreferencesQueryKey, getUsersMySportsQueryKey, useUsersMyPreferences, useUsersMySports,
  useUsersSaveMyPreferences, useUsersSaveMySports, useUsersUpdateMe, useUsersUploadAvatar,
} from "@/shared/api/generated/core/users/users";
import { Button } from "@/shared/components/ui/button";
import { MemphisBackground } from "@/shared/components/ui/memphis-background";
import { cn } from "cn";
import {
  StepDone, StepHelpers, StepPet, StepProfile, StepSchedule, StepSports,
  type Pet, type Prefs, type Profile, type SportRow,
} from "./onboarding-steps";

const STEPS = 6;
const DEFAULT_RADIUS_KM = 5;

const FOOTER_HINT = [
  "Сохраним сразу. Потом поменяешь в профиле",
  "По выбранным видам соберём «Для меня»",
  "Дом — точка отсчёта для подборки «Вам подойдёт»",
  "Помощников можно выключить в настройках",
  "Образ сохраним целиком, менять можно в любой момент",
  "Подборка всегда в ленте, во вкладке «Для вас»",
];

export default function OnboardingPage() {
  const { user } = useUser();
  const prefs = useUsersMyPreferences();
  const sports = useUsersMySports();
  const pet = usePetsGetMine();
  const shop = usePetsShop();
  const catalog = usePetsCatalog({ query: { staleTime: 5 * 60_000 } });
  const ok = <T,>(q: { data?: { status: number; data: unknown } }) =>
    q.data?.status === 200 ? (q.data.data as T) : undefined;
  const loaded = {
    prefs: ok<UserPreferencesResponse>(prefs), sports: ok<UserSportResponse[]>(sports), pet: ok<PetResponse>(pet),
    items: ok<ShopItemResponse[]>(shop), catalog: ok<PetCatalogResponse>(catalog),
  };

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-background">
      <MemphisBackground seed="onboarding" />
      {user && loaded.prefs && loaded.sports && loaded.pet && loaded.items && loaded.catalog ? (
        <Wizard user={user} prefs={loaded.prefs} sports={loaded.sports} pet={loaded.pet}
          items={loaded.items} catalog={loaded.catalog} />
      ) : (
        <p role="status" className="m-auto text-sm font-semibold text-muted-foreground">Загружаем…</p>
      )}
    </div>
  );
}

function Wizard(props: {
  user: MeResponse;
  prefs: UserPreferencesResponse;
  sports: UserSportResponse[];
  pet: PetResponse;
  items: ShopItemResponse[];
  catalog: PetCatalogResponse;
}) {
  const { user } = props;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [step, setStep] = useState(Math.min(Math.max(Number(params.get("step")) || 1, 1), STEPS));

  const [profile, setProfile] = useState<Profile>({
    firstName: user.firstName ?? "", lastName: user.lastName ?? "", city: user.city ?? "", bio: user.bio ?? "",
  });
  const [sportRows, setSportRows] = useState<SportRow[]>(
    props.sports.map((s) => ({ sportId: s.sport.id, name: s.sport.name, level: s.level })),
  );
  const { radiusKm, ...initialPrefs } = props.prefs;
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [pet, setPet] = useState<Pet>({ name: props.pet.name, outfit: { ...props.pet.outfit }, activity: props.pet.activity || "none" });

  const updateMe = useUsersUpdateMe();
  const uploadAvatar = useUsersUploadAvatar({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }) } });
  const saveSports = useUsersSaveMySports();
  const savePrefs = useUsersSaveMyPreferences();
  const rename = usePetsRename();
  const savePet = usePetsSaveMine();
  const busy = updateMe.isPending || saveSports.isPending || savePrefs.isPending || rename.isPending || savePet.isPending;
  const [error, setError] = useState<string>();

  const canNext =
    step === 1 ? profile.firstName.trim().length >= 2 && profile.lastName.trim().length >= 2
      : step === 2 ? sportRows.length > 0
        : step === 3 ? prefs.days.length > 0
          : step === 5 ? pet.name.trim().length > 0
            : true;

  /** Каждый шаг сохраняется на сервере при переходе дальше. */
  const save = async () => {
    const body = { ...prefs, radiusKm: radiusKm || DEFAULT_RADIUS_KM };
    if (step === 1) await updateMe.mutateAsync({ data: profile });
    if (step === 2) {
      await saveSports.mutateAsync({ data: { sports: sportRows.map((r) => (r.sportId
        ? { sportId: r.sportId, level: r.level } : { sportName: r.name, level: r.level })) } });
    }
    if (step === 3 || step === 4) await savePrefs.mutateAsync({ data: body });
    if (step === 5) {
      const name = pet.name.trim().replace(/\s+/g, " ");
      if (name !== props.pet.name) await rename.mutateAsync({ data: { name } });
      await savePet.mutateAsync({ data: { activity: pet.activity, outfit: pet.outfit } });
    }
  };

  const next = async () => {
    setError(undefined);
    try {
      await save();
      setStep(step + 1);
      document.querySelector("main")?.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as { detail?: string })?.detail ?? "Не удалось сохранить. Попробуй ещё раз.");
    }
  };

  const finish = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: getUsersMySportsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getUsersMyPreferencesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getPetsGetMineQueryKey() }),
    ]);
    navigate("/");
  };

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 lg:px-10">
        <div className="flex items-center gap-[10px]">
          <img src="/icon.svg" alt="" className="size-9 shrink-0" />
          <span className="hidden font-display text-base font-bold sm:inline">Движ</span>
        </div>
        <div className="flex items-center gap-3" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step} aria-label="Шаг онбординга">
          <div className="hidden gap-1.5 sm:flex">
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={cn("h-2 w-10 rounded-full border-[1.5px] border-ink", i < step ? "bg-primary" : "bg-card")} />
            ))}
          </div>
          <span className="text-xs font-bold text-muted-foreground">Шаг {step} из {STEPS}</span>
        </div>
        {step < STEPS ? (
          <button type="button" onClick={() => void finish()} className="text-sm font-extrabold text-primary">Пропустить</button>
        ) : <span />}
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 lg:px-10">
        <div className="m-auto w-full max-w-[1200px] py-4">
        {step === 1 && (
          <StepProfile user={user} profile={profile} setProfile={setProfile}
            onUpload={(file) => uploadAvatar.mutate({ data: { file } })} uploading={uploadAvatar.isPending} />
        )}
        {step === 2 && <StepSports sports={sportRows} setSports={setSportRows} />}
        {step === 3 && <StepSchedule prefs={prefs} setPrefs={setPrefs} />}
        {step === 4 && <StepHelpers prefs={prefs} setPrefs={setPrefs} pet={pet} />}
        {step === 5 && <StepPet pet={pet} setPet={setPet} items={props.items} catalog={props.catalog} />}
        {step === 6 && <StepDone name={profile.firstName.trim()} />}
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-destructive">{error}</p>}
        </div>
      </main>

      <footer className="shrink-0 border-t-2 border-track bg-background">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 lg:px-10">
          {step > 1 ? (
            <Button variant="outline" className="h-12" disabled={busy} onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-4" />Назад
            </Button>
          ) : <span />}
          <p className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <Check className="size-4 text-primary" />{FOOTER_HINT[step - 1]}
          </p>
          {step < STEPS ? (
            <Button className="h-12 px-6" disabled={!canNext || busy} onClick={() => void next()}>
              {busy ? "Сохраняем…" : <>Дальше<ArrowRight className="size-4" /></>}
            </Button>
          ) : (
            <Button variant="secondary" className="h-12 px-6" onClick={() => void finish()}>
              На главную<ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </footer>
    </>
  );
}
