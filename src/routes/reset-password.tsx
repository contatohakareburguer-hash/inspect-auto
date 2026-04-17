import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Nova senha — InspectAuto" }],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listener captura o evento PASSWORD_RECOVERY do hash
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // se já tem session, libera também
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada!");
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero px-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-2 text-xl font-bold">Definir nova senha</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          {ready ? "Digite sua nova senha abaixo." : "Validando link de recuperação..."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="np">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="np"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="pl-9"
                disabled={!ready}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full gradient-primary text-primary-foreground" size="lg">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar nova senha
          </Button>
        </form>
      </Card>
    </div>
  );
}
