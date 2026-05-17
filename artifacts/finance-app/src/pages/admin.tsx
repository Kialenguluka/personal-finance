import { useGetAdminUsers, useGetAdminStats, useUpdateAdminUser } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Users, ArrowLeftRight, Wallet, TrendingUp, TrendingDown } from "lucide-react";

export default function AdminPage() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const { data: users, isLoading: loadingUsers } = useGetAdminUsers();
  const { data: stats, isLoading: loadingStats } = useGetAdminStats();
  const updateMutation = useUpdateAdminUser({ mutation: { onSuccess: () => qc.invalidateQueries() } });

  const handleRoleChange = (userId: number, role: "user" | "admin") => {
    if (confirm(`Alterar papel para ${role}?`)) {
      updateMutation.mutate({ id: userId, data: { role } });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("admin")}</h1>
          <p className="text-sm text-muted-foreground">Painel de administração do sistema</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {loadingStats ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : stats && (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Utilizadores</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <ArrowLeftRight className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                <p className="text-xs text-muted-foreground">Transações</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Wallet className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{stats.totalAccounts}</p>
                <p className="text-xs text-muted-foreground">Contas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-sm font-bold text-emerald-500">{formatCurrency(stats.totalIncome ?? 0, "AOA")}</p>
                <p className="text-xs text-muted-foreground">Receita Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingDown className="w-5 h-5 mx-auto text-red-500 mb-1" />
                <p className="text-sm font-bold text-red-500">{formatCurrency(stats.totalExpense ?? 0, "AOA")}</p>
                <p className="text-xs text-muted-foreground">Despesa Total</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Users table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Utilizadores do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : users?.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhum utilizador</div>
          ) : (
            <div className="divide-y divide-border">
              {users?.map((u) => {
                const initials = u.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        {u.id === currentUser?.id && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">Você</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={u.role}
                        onValueChange={(v) => handleRoleChange(u.id, v as "user" | "admin")}
                        disabled={u.id === currentUser?.id}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilizador</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
