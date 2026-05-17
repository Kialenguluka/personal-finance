import { useState } from "react";
import {
  useGetBudgets,
  useGetBudgetStatus,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useGetCategories,
} from "@workspace/api-client-react";
import type { Budget } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, PieChart, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function BudgetsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const currency = user?.currency ?? "AOA";
  const qc = useQueryClient();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState({ categoryId: "", amount: "" });

  const params = { month, year };
  const { data: budgets, isLoading } = useGetBudgets(params);
  const { data: budgetStatus } = useGetBudgetStatus(params);
  const { data: categories } = useGetCategories({ type: "expense" });
  const createMutation = useCreateBudget({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const updateMutation = useUpdateBudget({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const deleteMutation = useDeleteBudget({ mutation: { onSuccess: () => qc.invalidateQueries() } });

  const usedCategoryIds = new Set(budgets?.map(b => b.categoryId));
  const availableCategories = categories?.filter(c => !usedCategoryIds.has(c.id)) ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm({ categoryId: "", amount: "" });
    setDialogOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditing(b);
    setForm({ categoryId: b.categoryId.toString(), amount: b.amount.toString() });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { amount: parseFloat(form.amount) } });
    } else {
      createMutation.mutate({ data: { categoryId: parseInt(form.categoryId), month, year, amount: parseFloat(form.amount) } });
    }
  };

  const getStatusForBudget = (categoryId: number) =>
    budgetStatus?.find(s => s.categoryId === categoryId);

  const years = [year - 1, year, year + 1];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("budgets")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Controlar gastos por categoria</p>
        </div>
        <Button onClick={openCreate} className="gap-2" disabled={availableCategories.length === 0}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Orçamento</span>
        </Button>
      </div>

      {/* Month/Year selector */}
      <div className="flex gap-2">
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-36">
            <SelectValue>{MONTHS[month - 1]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : budgets?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <PieChart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Sem orçamentos para {MONTHS[month - 1]} {year}</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Criar orçamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets?.map((budget) => {
            const status = getStatusForBudget(budget.categoryId);
            const pct = status?.percentage ?? 0;
            const isOver = pct > 100;
            const isWarning = pct >= 80 && pct <= 100;

            return (
              <Card key={budget.id} className={cn(isOver && "border-destructive/50")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                      style={{ background: budget.categoryColor ?? "#555" }}
                    >
                      {budget.categoryName?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{budget.categoryName}</p>
                        <div className="flex items-center gap-1">
                          {isOver && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                          {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(budget)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Eliminar?")) deleteMutation.mutate({ id: budget.id }); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                        <span>Gasto: {formatCurrency(status?.spent ?? 0, currency)}</span>
                        <span>Orçado: {formatCurrency(budget.amount, currency)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Progress
                      value={Math.min(pct, 100)}
                      className={cn("h-2", isOver && "[&>div]:bg-destructive", isWarning && "[&>div]:bg-amber-500")}
                    />
                    <p className={cn("text-xs mt-1 text-right", isOver ? "text-destructive" : isWarning ? "text-amber-500" : "text-muted-foreground")}>
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Limite (AOA)</Label>
              <Input
                type="number"
                min="0"
                step="100"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={!form.amount || (!editing && !form.categoryId)}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
