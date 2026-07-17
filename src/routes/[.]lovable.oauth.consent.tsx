import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import logoUrl from "@/assets/logo.png";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function authOauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center gradient-hero px-4">
      <Card className="max-w-md p-6 text-center">
        <h1 className="mb-2 text-lg font-bold">Não foi possível carregar esta autorização</h1>
        <p className="text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </Card>
    </div>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as AuthorizationDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "um aplicativo externo";
  const redirectUri = details?.client?.redirect_uris?.[0];
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const oauth = authOauth();
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("O servidor de autorização não retornou um destino de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src={logoUrl} alt="Inspect Auto" className="mx-auto mb-3 h-16 w-16 rounded-2xl shadow-elevated" />
          <h1 className="text-2xl font-bold text-white">Inspect Auto</h1>
        </div>
        <Card className="p-6 shadow-elevated">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Conectar {clientName} à sua conta</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Isso permite que {clientName} use este aplicativo como você.
              </p>
            </div>
          </div>

          {redirectUri && (
            <div className="mb-4 rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Retorno para</p>
              <p className="mt-1 break-all text-sm">{redirectUri}</p>
            </div>
          )}

          <div className="mb-5 space-y-2">
            <p className="text-sm font-medium">O acesso concedido inclui:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Ler e agir sobre suas inspeções veiculares</li>
              <li>• Consultar checklists, fotos e estatísticas do seu perfil</li>
            </ul>
            {scopes.length > 0 && (
              <p className="pt-2 text-xs text-muted-foreground">
                Escopos solicitados: {scopes.join(", ")}
              </p>
            )}
            <p className="pt-2 text-xs text-muted-foreground">
              As regras de acesso do Inspect Auto continuam válidas — o cliente só enxerga seus próprios dados.
            </p>
          </div>

          {error && (
            <p role="alert" className="mb-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              className="w-full gradient-primary text-primary-foreground"
              size="lg"
              disabled={busy !== null}
              onClick={() => decide(true)}
            >
              {busy === "approve" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aprovar e conectar
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              disabled={busy !== null}
              onClick={() => decide(false)}
            >
              {busy === "deny" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar conexão
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
