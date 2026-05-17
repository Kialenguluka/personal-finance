import { useState } from "react";
import { useGetProfile, useUpdateProfile, useChangePassword } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/lib/theme-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Globe, Palette, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { t } = useI18n();
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    preferredLang: user?.preferredLang ?? "pt",
    currency: user?.currency ?? "AOA",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [pwError, setPwError] = useState("");

  const { data: profile } = useGetProfile();

  const updateMutation = useUpdateProfile({
    mutation: {
      onSuccess: (data) => {
        updateUser(data as never);
        toast({ title: "Perfil atualizado com sucesso" });
      },
      onError: () => {
        toast({ title: "Erro ao atualizar perfil", variant: "destructive" });
      },
    },
  });

  const changePasswordMutation = useChangePassword({
    mutation: {
      onSuccess: () => {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPwError("");
        toast({ title: "Palavra-passe alterada com sucesso" });
      },
      onError: (err: { response?: { data?: { error?: string } } }) => {
        setPwError(err?.response?.data?.error || "Erro ao alterar palavra-passe");
      },
    },
  });

  const handleProfileSave = () => {
    updateMutation.mutate({ data: profileForm });
  };

  const handlePasswordChange = () => {
    setPwError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwError("As palavras-passe não coincidem");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPwError("A nova palavra-passe deve ter pelo menos 6 caracteres");
      return;
    }
    changePasswordMutation.mutate({
      data: {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
    });
  };

  const initials = user?.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("profile")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerir conta e preferências</p>
      </div>

      {/* User info */}
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="text-xl bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="mt-1">
              {user?.role === "admin" ? "Administrador" : "Utilizador"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Profile info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Informações do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={profileForm.name}
              onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={user?.email ?? ""} disabled className="opacity-60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Idioma</Label>
              <Select value={profileForm.preferredLang} onValueChange={(v) => setProfileForm(f => ({ ...f, preferredLang: v as "pt" | "en" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moeda</Label>
              <Select value={profileForm.currency} onValueChange={(v) => setProfileForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AOA">AOA (Kwanza)</SelectItem>
                  <SelectItem value="USD">USD (Dólar)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleProfileSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "A guardar..." : "Guardar Alterações"}
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" /> Aparência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${theme === t ? "border-primary bg-primary/5" : "border-border"}`}
              >
                {theme === t && <CheckCircle2 className="w-3.5 h-3.5 text-primary mx-auto mb-1" />}
                {t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Sistema"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pwError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{pwError}</div>
          )}
          <div className="space-y-1.5">
            <Label>Palavra-passe Atual</Label>
            <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="••••••" />
          </div>
          <div className="space-y-1.5">
            <Label>Nova Palavra-passe</Label>
            <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar Palavra-passe</Label>
            <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repetir nova palavra-passe" />
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={!passwordForm.currentPassword || !passwordForm.newPassword || changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? "A alterar..." : "Alterar Palavra-passe"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
