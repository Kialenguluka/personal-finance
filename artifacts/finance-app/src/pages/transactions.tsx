import { useState } from "react";
import {
  useGetTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useGetAccounts,
  useGetCategories,
  GetTransactionsType,
} from "@workspace/api-client-react";
import type { Transaction } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Search, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY: Partial<Transaction> = { type: "expense", amount: 0, date: new Date().toISOString().slice(0, 10), description: "" };

export default function TransactionsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const currency = user?.currency ?? "AOA";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<Partial<Transaction> & { accountId?: number; categoryId?: number; amount?: number; date?: string; type?: string }>({ ...EMPTY });

  const params = {
    page,
    limit: 20,
    ...(filterType !== "all" && { type: filterType as typeof GetTransactionsType[keyof typeof GetTransactionsType] }),
    ...(search && { search }),
  };

  const { data, isLoading } = useGetTransactions(params);
  const { data: accounts } = useGetAccounts();
  const { data: categories } = useGetCategories({});

  const filteredCategories = categories?.filter(c => c.type === form.type) ?? [];

  const createMutation = useCreateTransaction({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const updateMutation = useUpdateTransaction({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const deleteMutation = useDeleteTransaction({ mutation: { onSuccess: () => qc.invalidateQueries() } });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setDialogOpen(true);
  };

  const openEdit = (txn: Transaction) => {
    setEditing(txn);
    setForm({ ...txn });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const body = {
      accountId: form.accountId!,
      categoryId: form.categoryId!,
      type: form.type as "income" | "expense",
      amount: form.amount!,
      description: form.description || undefined,
      date: form.date!,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: body });
    } else {
      createMutation.mutate({ data: body });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Eliminar esta transação?")) {
      deleteMutation.mutate({ id });
    }
  };

  const transactions = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("transactions")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerir receitas e despesas</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t("newTransaction")}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">{t("income")}</SelectItem>
              <SelectItem value="expense">{t("expense")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Transactions list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">{t("noData")}</p>
              <Button variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar transação
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: (txn.categoryColor ?? "#555") + "20", color: txn.categoryColor ?? "#555" }}
                  >
                    {txn.categoryName?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{txn.description || txn.categoryName}</p>
                    <p className="text-xs text-muted-foreground">{txn.date} · {txn.accountName} · {txn.categoryName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-semibold", txn.type === "income" ? "text-emerald-500" : "text-red-500")}>
                      {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount, currency)}
                    </p>
                    <Badge variant={txn.type === "income" ? "default" : "destructive"} className="text-[10px] h-4 px-1.5">
                      {txn.type === "income" ? t("income") : t("expense")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(txn)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(txn.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Transação" : t("newTransaction")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setForm(f => ({ ...f, type: "income", categoryId: undefined }))}
                className={cn("flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors text-sm font-medium",
                  form.type === "income" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground"
                )}
              >
                <ArrowUpRight className="w-4 h-4" /> {t("income")}
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, type: "expense", categoryId: undefined }))}
                className={cn("flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors text-sm font-medium",
                  form.type === "expense" ? "border-red-500 bg-red-500/10 text-red-600" : "border-border text-muted-foreground"
                )}
              >
                <ArrowDownRight className="w-4 h-4" /> {t("expense")}
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>{t("amount")} (AOA)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount ?? ""}
                onChange={(e) => setForm(f => ({ ...f, amount: parseFloat(e.target.value) }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("date")}</Label>
              <Input type="date" value={form.date ?? ""} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("account")}</Label>
              <Select value={form.accountId?.toString()} onValueChange={(v) => setForm(f => ({ ...f, accountId: parseInt(v) }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                <SelectContent>
                  {accounts?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("category")}</Label>
              <Select value={form.categoryId?.toString()} onValueChange={(v) => setForm(f => ({ ...f, categoryId: parseInt(v) }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("description")}</Label>
              <Input
                value={form.description ?? ""}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={!form.amount || !form.date || !form.accountId || !form.categoryId}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
