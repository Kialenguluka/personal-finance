import { useState } from "react";
import {
  useGetGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useDepositToGoal,
} from "@workspace/api-client-react";
import type { Goal } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Target, PlusCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#E65100", "#1565C0", "#2E7D32", "#6A1B9A", "#00838F", "#C62828", "#546E7A"];

export default function GoalsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const currency = user?.currency ?? "AOA";
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", targetAmount: "", deadline: "", color: "#E65100"
  });

  const { data: goals, isLoading } = useGetGoals();
  const createMutation = useCreateGoal({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const updateMutation = useUpdateGoal({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const deleteMutation = useDeleteGoal({ mutation: { onSuccess: () => qc.invalidateQueries() } });
  const depositMutation = useDepositToGoal({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDepositDialogOpen(false); setDepositAmount(""); } } });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", targetAmount: "", deadline: "", color: "#E65100" });
    setDialogOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setForm({
      name: g.name,
      description: g.description ?? "",
      targetAmount: g.targetAmount.toString(),
      deadline: g.deadline ?? "",
      color: g.color ?? "#E65100",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const body = {
      name: form.name,
      description: form.description || undefined,
      targetAmount: parseFloat(form.targetAmount),
      deadline: form.deadline || undefined,
      color: form.color,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: body });
    } else {
      createMutation.mutate({ data: body });
    }
  };

  const openDeposit = (g: Goal) => {
    setDepositGoal(g);
    setDepositAmount("");
    setDepositDialogOpen(true);
  };

  const handleDeposit = () => {
    if (depositGoal && depositAmount) {
      depositMutation.mutate({ id: depositGoal.id, data: { amount: parseFloat(depositAmount) } });
    }
  };

  const activeGoals = goals?.filter(g => g.status === "active") ?? [];
  const completedGoals = goals?.filter(g => g.status === "completed") ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("goals")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Poupar para os seus objetivos</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Objetivo</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : goals?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Sem objetivos de poupança</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Criar objetivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Ativos ({activeGoals.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeGoals.map(goal => <GoalCard key={goal.id} goal={goal} currency={currency} onEdit={openEdit} onDelete={(id) => { if (confirm("Eliminar?")) deleteMutation.mutate({ id }); }} onDeposit={openDeposit} />)}
              </div>
            </div>
          )}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Concluídos ({completedGoals.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completedGoals.map(goal => <GoalCard key={goal.id} goal={goal} currency={currency} onEdit={openEdit} onDelete={(id) => { if (confirm("Eliminar?")) deleteMutation.mutate({ id }); }} onDeposit={openDeposit} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Fundo de emergência" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Alvo (AOA)</Label>
              <Input type="number" min="0" value={form.targetAmount} onChange={(e) => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo (opcional)</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn("w-8 h-8 rounded-full border-2 transition-all", form.color === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.targetAmount}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Depositar em "{depositGoal?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Montante (AOA)</Label>
              <Input type="number" min="0.01" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleDeposit} disabled={!depositAmount || parseFloat(depositAmount) <= 0}>Depositar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({ goal, currency, onEdit, onDelete, onDeposit }: {
  goal: Goal;
  currency: string;
  onEdit: (g: Goal) => void;
  onDelete: (id: number) => void;
  onDeposit: (g: Goal) => void;
}) {
  const isCompleted = goal.status === "completed";

  return (
    <Card className={cn(isCompleted && "opacity-80")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: goal.color }}>
              {goal.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{goal.name}</p>
              {goal.deadline && <p className="text-xs text-muted-foreground">até {goal.deadline}</p>}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {!isCompleted && (
              <Button variant="ghost" size="icon" className="w-7 h-7 text-primary" onClick={() => onDeposit(goal)} title="Depositar">
                <PlusCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(goal)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => onDelete(goal.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {goal.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{goal.description}</p>}

        <div className="space-y-1.5">
          <Progress value={goal.progressPercentage} className={cn("h-2.5", isCompleted && "[&>div]:bg-emerald-500")} style={!isCompleted ? { "--progress-background": goal.color } as React.CSSProperties : undefined} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{formatCurrency(goal.currentAmount, currency)}</span>
            <div className="flex items-center gap-1.5">
              {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              <span className="font-medium">{(goal.progressPercentage ?? 0).toFixed(0)}%</span>
              <span className="text-muted-foreground">/ {formatCurrency(goal.targetAmount, currency)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
