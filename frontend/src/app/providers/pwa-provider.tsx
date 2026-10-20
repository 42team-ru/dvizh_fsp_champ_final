import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { listenForPwaInstall } from "@/shared/lib/pwa-install";

function showUpdate() {
  toast.custom((id) => (
    <div role="status" className="flex w-[min(92vw,380px)] items-center gap-4 rounded-[20px] border-2 border-ink bg-card p-4 text-foreground shadow-hard">
      <p className="font-sans text-[15px] font-bold">Доступна новая версия</p>
      <Button size="sm" onClick={() => {
        toast.dismiss(id);
        window.location.reload();
      }}>Обновить</Button>
    </div>
  ), { id: "pwa-update", duration: Infinity });
}

/** SW работает только в production; dev освобождает origin для Vite/HMR. */
export function PwaProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!import.meta.env.PROD) {
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        let removed = false;
        for (const registration of registrations) {
          const worker = registration.active ?? registration.waiting ?? registration.installing;
          if (worker && new URL(worker.scriptURL).pathname === "/sw.js") {
            removed = await registration.unregister() || removed;
          }
        }
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("dvizh-pwa-")).map((key) => caches.delete(key)));
        // unregister сам по себе не освобождает уже открытую вкладку от контроллера.
        const controller = navigator.serviceWorker.controller;
        if (removed && controller && new URL(controller.scriptURL).pathname === "/sw.js") window.location.reload();
      })().catch((error: unknown) => console.warn("PWA: не удалось очистить SW в dev", error));
      return;
    }

    const stopInstall = listenForPwaInstall();
    let disposed = false;
    let cleanupRegistration = () => {};
    const register = async () => {
      try {
        let controlled = Boolean(navigator.serviceWorker.controller);
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        if (disposed) return;
        // skipWaiting + claim активируют обновление сразу; перезагрузка — только по кнопке.
        let updateShown = false;
        const notify = () => {
          if (controlled && !updateShown) {
            updateShown = true;
            showUpdate();
          }
        };
        const onControllerChange = () => {
          notify();
          controlled = true;
        };
        const watchWorker = () => {
          const worker = registration.installing;
          if (!worker) return;
          const updating = controlled;
          const onStateChange = () => {
            // Кнопка перезагрузки появляется после активации, чтобы открыть новую оболочку.
            if (worker.state === "activated" && updating) notify();
          };
          worker.addEventListener("statechange", onStateChange);
          removeWorkerListeners.push(() => worker.removeEventListener("statechange", onStateChange));
          onStateChange();
        };
        const removeWorkerListeners: Array<() => void> = [];
        registration.addEventListener("updatefound", watchWorker);
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
        watchWorker();
        cleanupRegistration = () => {
          registration.removeEventListener("updatefound", watchWorker);
          navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
          removeWorkerListeners.forEach((remove) => remove());
        };
      } catch (error) {
        console.warn("PWA: не удалось зарегистрировать SW", error);
      }
    };
    const onLoad = () => { void register(); };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      disposed = true;
      stopInstall();
      window.removeEventListener("load", onLoad);
      cleanupRegistration();
    };
  }, []);

  return null;
}
