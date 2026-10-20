import { create } from "zustand";
import { toast } from "@/shared/lib/toast";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: InstallPrompt | null = null;

export const usePwaInstall = create<{ mode: "native" | "ios" | null }>(() => ({ mode: null }));

/** Вызывается один раз провайдером приложения, до появления меню аккаунта. */
export function listenForPwaInstall() {
  const display = window.matchMedia("(display-mode: standalone)");
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const isStandalone = () => display.matches || navigatorWithStandalone.standalone === true;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  let installed = false;
  const refresh = () => usePwaInstall.setState({
    mode: installed || isStandalone() ? null : deferredPrompt ? "native" : isIos && isSafari ? "ios" : null,
  });
  const beforeInstall = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPrompt;
    refresh();
  };
  const appInstalled = () => {
    installed = true;
    deferredPrompt = null;
    refresh();
  };

  window.addEventListener("beforeinstallprompt", beforeInstall);
  window.addEventListener("appinstalled", appInstalled);
  display.addEventListener("change", refresh);
  refresh();
  return () => {
    window.removeEventListener("beforeinstallprompt", beforeInstall);
    window.removeEventListener("appinstalled", appInstalled);
    display.removeEventListener("change", refresh);
  };
}

export async function installPwa() {
  if (usePwaInstall.getState().mode === "ios") {
    toast.info("Установить приложение", {
      description: "В Safari нажмите «Поделиться» → «На экран Домой».",
      duration: 10000,
    });
    return;
  }
  const prompt = deferredPrompt;
  if (!prompt) return;
  deferredPrompt = null;
  usePwaInstall.setState({ mode: null });
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch {
    toast.info("Не удалось открыть установку", { description: "Попробуйте установить приложение через меню браузера." });
  }
}
