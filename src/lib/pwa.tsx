import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaCtx = {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
};

const Ctx = createContext<PwaCtx>({
  canInstall: false,
  isInstalled: false,
  promptInstall: async () => {},
});

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect already installed (standalone)
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("Inspect Auto instalado!");
    };

    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);

    // Register SW only outside preview/iframe and only in production builds
    if (
      !isPreviewHost() &&
      !isInIframe() &&
      "serviceWorker" in navigator &&
      import.meta.env.PROD
    ) {
      // Dynamic import so dev build never pulls the virtual module
      import("virtual:pwa-register")
        .then(({ registerSW }) => {
          const updateSW = registerSW({
            onNeedRefresh() {
              toast.message("Nova versão disponível", {
                description: "Atualize para receber as últimas melhorias.",
                duration: 10000,
                action: {
                  label: "Atualizar",
                  onClick: () => updateSW(true),
                },
              });
            },
            onOfflineReady() {
              toast.success("Pronto para uso offline");
            },
          });
        })
        .catch(() => {
          /* silently ignore — virtual module absent in dev */
        });
    } else if ("serviceWorker" in navigator && (isPreviewHost() || isInIframe())) {
      // Defensive: unregister any stale SW from previous sessions inside preview
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setDeferred(null);
    }
  };

  return (
    <Ctx.Provider value={{ canInstall: !!deferred, isInstalled: installed, promptInstall }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePwa() {
  return useContext(Ctx);
}

/** Botão "Instalar App" — só renderiza se houver prompt disponível. */
export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, isInstalled, promptInstall } = usePwa();
  if (isInstalled || !canInstall) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => void promptInstall()}
    >
      📲 Instalar App
    </Button>
  );
}
