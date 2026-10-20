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
  StepHelpers, StepPet, StepProfile, StepSchedule, StepSports,
  type Pet, type Prefs, type Profile, type SportRow,
} from "./onboarding-steps";
import { StepDone } from "./onboarding-done";
import { OnboardingPanel } from "./onboarding-panel";
import { AnimatePresence, motion } from "motion/react";

const STEPS = 6;
const DEFAULT_RADIUS_KM = 5;

/** Подпись шага над заголовком: «ШАГ 2 ИЗ 6 · ВИДЫ СПОРТА». */
const STEP_LABEL = ["ПРОФИЛЬ", "ВИДЫ СПОРТА", "ВРЕМЯ И МЕСТО", "ПОМОЩНИКИ", "БОБР", "ПОДБОРКА"];
/** Шаги с живым бобром справа; остальные — на всю ширину. */
const SPLIT_STEPS = 4;

const FOOTER_HINT = [
  "Сохраним сразу, поменяешь в профиле",
  "",
  "Дом и радиус — точка отсчёта подборки",
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
  const [prefs, setPrefs] = useState<Prefs>({ ...props.prefs, radiusKm: props.prefs.radiusKm || DEFAULT_RADIUS_KM });
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
    if (step === 1) await updateMe.mutateAsync({ data: profile });
    if (step === 2) {
      await saveSports.mutateAsync({ data: { sports: sportRows.map((r) => (r.sportId
        ? { sportId: r.sportId, level: r.level } : { sportName: r.name, level: r.level })) } });
    }
    if (step === 3 || step === 4) await savePrefs.mutateAsync({ data: prefs });
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

  const split = step <= SPLIT_STEPS;
  const hint = step === 2 ? `Выбрано ${sportRows.length} из 30` : FOOTER_HINT[step - 1];

  const content = (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: "easeOut" }}>
        {step === 1 && (
          <StepProfile user={user} profile={profile} setProfile={setProfile}
            onUpload={(file) => uploadAvatar.mutate({ data: { file } })} uploading={uploadAvatar.isPending} />
        )}
        {step === 2 && <StepSports sports={sportRows} setSports={setSportRows} />}
        {step === 3 && <StepSchedule prefs={prefs} setPrefs={setPrefs} />}
        {step === 4 && <StepHelpers prefs={prefs} setPrefs={setPrefs} pet={pet} />}
        {step === 5 && <StepPet pet={pet} setPet={setPet} items={props.items} catalog={props.catalog} />}
        {step === 6 && <StepDone name={profile.firstName.trim()} sports={sportRows} prefs={prefs} pet={pet} />}
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-destructive">{error}</p>}
      </motion.div>
    </AnimatePresence>
  );

  const footer = (
    <footer className="shrink-0 border-t-2 border-track bg-background">
      <div className={cn("flex items-center justify-between gap-3 px-4 py-4 lg:px-10", !split && "mx-auto max-w-[1280px]")}>
        {step > 1 ? (
          <Button variant="outline" className="h-12 px-6" disabled={busy} onClick={() => setStep(step - 1)}>
            <ArrowLeft className="size-4" />Назад
          </Button>
        ) : <span />}
        {hint && (
          <p className="hidden max-w-[260px] items-center gap-2 text-center text-sm font-medium text-muted-foreground md:flex">
            {!split && <Check className="size-4 shrink-0 text-green" />}{hint}
          </p>
        )}
        {step < STEPS ? (
          <Button className="h-12 px-6" disabled={!canNext || busy} onClick={() => void next()}>
            {busy ? "Сохраняем…" : <><ArrowRight className="size-4" />Дальше</>}
          </Button>
        ) : (
          <Button variant="secondary" className="h-12 px-6" onClick={() => void finish()}>
            <ArrowRight className="size-4" />На главную
          </Button>
        )}
      </div>
    </footer>
  );

  const logo = (
    <div className="flex items-center gap-[10px]">
      <img src="/icon.svg" alt="" className="size-10 shrink-0" />
      <span className="hidden font-display text-lg font-bold sm:inline">Движ</span>
    </div>
  );
  const skip = step < STEPS ? (
    <button type="button" onClick={() => void finish()} className="text-sm font-extrabold text-primary hover:underline">Пропустить</button>
  ) : <span />;

  if (split) {
    return (
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(560px,700px)_1fr]">
        <div className="flex min-h-0 flex-col bg-background">
          <header className="flex shrink-0 items-center justify-between gap-4 px-4 pt-5 lg:px-12">{logo}{skip}</header>
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 lg:px-12">
            <div className="flex flex-col gap-4 py-5">
              <Dots step={step} />
              {content}
            </div>
          </main>
          {footer}
        </div>
        <OnboardingPanel step={step} profile={profile} sports={sportRows} prefs={prefs} pet={pet} />
      </div>
    );
  }

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 lg:px-10">
        {logo}
        <div className="flex items-center gap-3" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step} aria-label="Шаг онбординга">
          <div className="hidden gap-2 sm:flex">
            {Array.from({ length: STEPS }, (_, i) => (
              <motion.span key={i} layout className={cn("h-2.5 rounded-full border-[1.5px] border-ink",
                i + 1 === step ? "w-16" : "w-11", i < step ? "bg-primary" : "bg-card")} />
            ))}
          </div>
          <span className="text-xs font-bold text-muted-foreground">Шаг {step} из {STEPS}</span>
        </div>
        {skip}
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 lg:px-10">
        <div className="m-auto w-full max-w-[1152px] py-4">{content}</div>
      </main>
      {footer}
    </>
  );
}

/** Точки прогресса над заголовком: пройденные — заливкой, текущая — длинная. */
function Dots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step} aria-label="Шаг онбординга">
      {Array.from({ length: STEPS }, (_, i) => (
        <motion.span key={i} layout transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn("h-2.5 rounded-full border-[1.5px] border-ink", i + 1 === step ? "w-8" : "w-4", i < step ? "bg-primary" : "bg-card")} />
      ))}
      <span className="ml-2 text-[11px] font-extrabold tracking-[1.2px] text-primary">
        ШАГ {step} ИЗ {STEPS} · {STEP_LABEL[step - 1]}
      </span>
    </div>
  );
}
