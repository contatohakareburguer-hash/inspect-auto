import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, Loader2 } from "lucide-react";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — InspectAuto" },
      { name: "description", content: "Acesse sua conta InspectAuto para realizar inspeções veiculares profissionais." },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "signup" | "reset";

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: nome },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email para confirmar.");
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Email de recuperação enviado!");
        setMode("login");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(`Erro ao entrar com ${provider === "google" ? "Google" : "Apple"}. Verifique se o provider está ativo no painel.`);
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Erro no login social");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src={logoUrl}
            alt="InspectAuto"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-elevated"
          />
          <h1 className="text-3xl font-bold text-white">InspectAuto</h1>
          <p className="mt-2 text-sm text-white/80">Inspeção veicular profissional</p>
        </div>

        <Card className="p-6 shadow-elevated">
          <h2 className="mb-1 text-xl font-bold">
            {mode === "login" && "Entrar"}
            {mode === "signup" && "Criar conta"}
            {mode === "reset" && "Recuperar senha"}
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {mode === "login" && "Acesse sua conta para começar"}
            {mode === "signup" && "Cadastre-se em segundos"}
            {mode === "reset" && "Enviaremos um link por email"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  placeholder="João Silva"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@email.com"
                  className="pl-9"
                />
              </div>
            </div>
            {mode !== "reset" && (
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="pl-9"
                  />
                </div>
              </div>
            )}
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" && "Entrar"}
              {mode === "signup" && "Criar conta"}
              {mode === "reset" && "Enviar link"}
            </Button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="my-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" size="lg" onClick={() => handleOAuth("google")} disabled={loading}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </Button>

              <Button variant="outline" className="mt-2 w-full bg-black text-white hover:bg-black/90 hover:text-white" size="lg" onClick={() => handleOAuth("apple")} disabled={loading}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continuar com Apple
              </Button>
            </>
          )}

          <div className="mt-5 space-y-2 text-center text-sm">
            {mode === "login" && (
              <>
                <button type="button" onClick={() => setMode("reset")} className="text-primary hover:underline">
                  Esqueci minha senha
                </button>
                <div className="text-muted-foreground">
                  Não tem conta?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="font-medium text-primary hover:underline">
                    Criar conta
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div className="text-muted-foreground">
                Já tem conta?{" "}
                <button type="button" onClick={() => setMode("login")} className="font-medium text-primary hover:underline">
                  Entrar
                </button>
              </div>
            )}
            {mode === "reset" && (
              <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline">
                Voltar ao login
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
