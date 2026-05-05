import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Settings, LogOut, Mail, User } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — InspectAuto" },
      { name: "description", content: "Gerencie sua conta e preferências." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { user, signOut } = useAuth();

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Sua conta e preferências.</p>
        </div>
      </header>

      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Conta</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{user?.user_metadata?.full_name || "—"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="break-all">{user?.email}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Sessão</h2>
        <Button variant="destructive" onClick={() => signOut()} className="w-full sm:w-auto">
          <LogOut className="mr-2 h-4 w-4" /> Sair da conta
        </Button>
      </Card>
    </div>
  );
}
