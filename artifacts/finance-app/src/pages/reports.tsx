import { useState } from "react";
import { useGetReportSummary, useGetReportTransactions } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PieChart as RePieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Equal, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const currency = user?.currency ?? "AOA";

  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay.getDate()}`;

  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(lastDayStr);
  const [applied, setApplied] = useState({ dateFrom: firstDay, dateTo: lastDayStr });

  const { data: summary, isLoading: loadingSummary } = useGetReportSummary({ date_from: applied.dateFrom, date_to: applied.dateTo });
  const { data: transactions, isLoading: loadingTxns } = useGetReportTransactions({ date_from: applied.dateFrom, date_to: applied.dateTo });

  const COLORS = ["#00897B", "#1565C0", "#E65100", "#6A1B9A", "#C62828", "#2E7D32", "#0277BD", "#AD1457"];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("reports")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Análise detalhada de finanças</p>
        </div>
      </div>

      {/* Date range filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label>Data Início</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label>Data Fim</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={() => setApplied({ dateFrom, dateTo })}>
              <FileText className="w-4 h-4 mr-2" /> Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {loadingSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita Total</p>
                <p className="text-xl font-bold text-emerald-500">{formatCurrency(summary.totalIncome, currency)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Despesa Total</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(summary.totalExpense, currency)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Equal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo</p>
                <p className={cn("text-xl font-bold", summary.balance >= 0 ? "text-emerald-500" : "text-red-500")}>
                  {formatCurrency(summary.balance, currency)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {summary && summary.byCategory && summary.byCategory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Despesas por Categoria</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie data={summary.byCategory} dataKey="total" nameKey="categoryName" cx="50%" cy="50%" outerRadius={75}>
                    {(summary.byCategory ?? []).map((entry, i) => (
                      <Cell key={entry.categoryId} fill={entry.categoryColor ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} contentStyle={{ fontSize: "11px" }} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {(summary.byCategory ?? []).map((item, i) => (
                  <div key={item.categoryId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.categoryColor ?? COLORS[i % COLORS.length] }} />
                      <span className="truncate text-muted-foreground">{item.categoryName}</span>
                    </div>
                    <span className="font-medium shrink-0 ml-2">{formatCurrency(item.total, currency)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top Categorias</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(summary.byCategory ?? []).slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="categoryName" type="category" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} contentStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="total" name="Total">
                    {(summary.byCategory ?? []).slice(0, 6).map((entry, i) => (
                      <Cell key={i} fill={entry.categoryColor ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Transações ({transactions?.length ?? 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingTxns ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t("noData")}</div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 px-4 py-3">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
