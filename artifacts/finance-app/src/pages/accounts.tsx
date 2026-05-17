import { useState } from "react";
import { useGetAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from "@workspace/api-client-react";
import type { Account } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Wallet, PiggyBank, Landmark, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPES = [
  { value: "cash", label: "Dinheiro", icon: <Wallet className="w-4 h-4" /> },
  { value: "bank", label: "Banco", icon: <Landmark className="w-4 h-4" /> },
  { value: "savings", label: "Poupança", icon: <PiggyBank className="w-4 h-4" /> },
  { value: "investment", label: "Investimento", icon: <TrendingUp className="w-4 h-4" /> },
];

const COLORS = ["#2E7D32", "#1565C0", "#E65100", "#6A1B9A", "#00838F", "#C62828", "#546E7A"];

export default function AccountsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const currency = user?.currency ?? "AOA";
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: "", type: "cash", balance: "0", color: "#2E7D32" });

  const { data: accounts, isLoading } = useGetAccounts();
  const createMutation = useCreateAccount({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const updateMutation = useUpdateAccount({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const deleteMutation = useDeleteAccount({ mutation: { onSuccess: () => qc.invalidateQueries() } });

  const totalBalance = accounts?.reduce((s, a) => s + a.balance, 0) ?? 0;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", type: "cash", balance: "0", color: "#2E7D32" });
    setDialogOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setForm({ name: account.name, type: account.type, balance: account.balance.toString(), color: account.color });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const body = { name: form.name, type: form.type as Account["type"], balance: parseFloat(form.balance), color: form.color };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: body });
    } else {
      createMutation.mutate({ data: body });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Eliminar esta conta?")) deleteMutation.mutate({ id });
  };

  const getTypeIcon = (type: string) => ACCOUNT_TYPES.find(t => t.value === type)?.icon ?? <Wallet className="w-4 h-4" />;
  const getTypeLabel = (type: string) => ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("accounts")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerir as suas contas financeiras</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Conta</span>
        </Button>
      </div>

      {/* Total balance card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("totalBalance")}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(totalBalance, currency)}</p>
          <p className="text-xs text-muted-foreground mt-1">{accounts?.length ?? 0} conta(s) ativa(s)</p>
        </CardContent>
      </Card>

      {/* Accounts grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : accounts?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma conta. Crie a sua primeira conta!</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Criar conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts?.map((account) => (
            <Card key={account.id} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ background: account.color }} />
              <CardContent className="p-4 pl-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ background: account.color }}
                    >
                      {getTypeIcon(account.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{account.name}</p>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 mt-0.5">
                        {getTypeLabel(account.type)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(account)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(account.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{formatCurrency(account.balance, currency)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{account.currency}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Conta BFA" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Saldo Inicial (AOA)</Label>
              <Input type="number" value={form.balance} onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn("w-8 h-8 rounded-full border-2 transition-all", form.color === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={!form.name}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
