import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouter, useLocation } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PwaProvider } from "@/lib/pwa";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, History, BookOpen } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import appCss from "../styles.css?url";
import logoUrl from "@/assets/logo.png";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { title: "InspectAuto — Inspeção Veicular Profissional" },
      {
        name: "description",
        content: "App profissional de inspeção veicular: checklist guiado, fotos, score inteligente e relatório PDF.",
      },
      { name: "theme-color", content: "#0f172a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Inspect" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "InspectAuto — Inspeção Veicular Profissional" },
      { name: "twitter:title", content: "InspectAuto — Inspeção Veicular Profissional" },
      { name: "description", content: "🚗 Inspect Auto – Inspeção Veicular Inteligente na Palma da Sua Mão. Transforme a forma como você realiza inspeções automotivas com o Inspect Auto." },
      { property: "og:description", content: "🚗 Inspect Auto – Inspeção Veicular Inteligente na Palma da Sua Mão. Transforme a forma como você realiza inspeções automotivas com o Inspect Auto." },
      { name: "twitter:description", content: "🚗 Inspect Auto – Inspeção Veicular Inteligente na Palma da Sua Mão. Transforme a forma como você realiza inspeções automotivas com o Inspect Auto." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d4c661c7-e61f-42ee-bbc7-54dbdc556e28" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d4c661c7-e61f-42ee-bbc7-54dbdc556e28" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <PwaProvider>
      <AuthProvider>
        <AppShell />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </PwaProvider>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const router = useRouter();

  const isAuthRoute = location.pathname === "/login" || location.pathname === "/auth/callback";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user && !isAuthRoute) {
    if (typeof window !== "undefined") {
      router.navigate({ to: "/login" });
    }
    return null;
  }

  if (isAuthRoute) {
    return <Outlet />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <div className="flex min-h-screen w-full flex-col bg-background pb-24">
        <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur-md supports-[backdrop-filter]:bg-card/60" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="mx-auto grid max-w-3xl grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-3 sm:px-4">
            <SidebarTrigger className="h-10 w-10 shrink-0 justify-self-start" />
            <Link to="/" className="flex items-center justify-center gap-2 justify-self-center">
              <img
                src={logoUrl}
                alt="InspectAuto"
                className="h-9 w-9 shrink-0 rounded-lg shadow-card"
              />
              <div className="text-center">
                <div className="text-sm font-bold leading-tight">InspectAuto</div>
                <div className="text-[10px] leading-tight text-muted-foreground">Inspeção profissional</div>
              </div>
            </Link>
            <div className="h-10 w-10 shrink-0 justify-self-end" aria-hidden />
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-5 sm:px-4 sm:py-6">
          <Outlet />
        </main>

        <nav
          className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card/95 backdrop-blur-md"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-around px-2 py-1.5">
            <NavItem to="/" label="Início" icon={<LayoutDashboard className="h-5 w-5" />} active={location.pathname === "/"} />
            <NavItem
              to="/historico"
              label="Histórico"
              icon={<History className="h-5 w-5" />}
              active={location.pathname.startsWith("/historico")}
            />
            <NavItem
              to="/manual"
              label="Manual"
              icon={<BookOpen className="h-5 w-5" />}
              active={location.pathname.startsWith("/manual")}
            />
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
}

function NavItem({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors active:scale-95 ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
