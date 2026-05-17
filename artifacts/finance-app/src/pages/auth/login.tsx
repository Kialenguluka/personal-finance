import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { t } = useI18n();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user as never);
        setLocation("/");
      },
      onError: (err: { response?: { data?: { error?: string } }; message?: string }) => {
        setError(err?.response?.data?.error || "Erro ao entrar");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">FinançasPessoais</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">Gestão Financeira Pessoal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t("login")}</CardTitle>
            <CardDescription>Entre com a sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "A entrar..." : t("login")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <button
                onClick={() => setLocation("/register")}
                className="text-primary hover:underline font-medium"
              >
                {t("register")}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
