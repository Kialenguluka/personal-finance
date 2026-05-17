import { useGetDashboardSummary, useGetDashboardByCategory, useGetDashboardCashflow, useGetRecentTransactions } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({ title, value, icon, trend, color }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", color ?? "bg-primary/10")}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            {trend === "up" ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            ) : trend === "down" ? (
              <ArrowDownRight className="w-3 h-3 text-red-500" />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const currency = user?.currency ?? "AOA";

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({});
  const { data: byCategory, isLoading: loadingByCategory } = useGetDashboardByCategory({});
  const { data: cashflow, isLoading: loadingCashflow } = useGetDashboardCashflow();
  const { data: recent, isLoading: loadingRecent } = useGetRecentTransactions();

  const COLORS = ["#00897B", "#1565C0", "#E65100", "#6A1B9A", "#C62828", "#2E7D32", "#0277BD", "#AD1457"];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bem-vindo de volta, {user?.name?.split(" ")[0]}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingSummary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title={t("totalBalance")}
              value={formatCurrency(summary?.totalBalance ?? 0, currency)}
              icon={<Wallet className="w-5 h-5 text-primary" />}
              color="bg-primary/10"
            />
            <StatCard
              title={t("monthlyIncome")}
              value={formatCurrency(summary?.monthlyIncome ?? 0, currency)}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
              color="bg-emerald-500/10"
              trend="up"
            />
            <StatCard
              title={t("monthlyExpense")}
              value={formatCurrency(summary?.monthlyExpense ?? 0, currency)}
              icon={<TrendingDown className="w-5 h-5 text-red-500" />}
              color="bg-red-500/10"
              trend="down"
            />
            <StatCard
              title="Saldo Mensal"
              value={formatCurrency((summary?.monthlyIncome ?? 0) - (summary?.monthlyExpense ?? 0), currency)}
              icon={<ArrowUpRight className="w-5 h-5 text-blue-500" />}
              color="bg-blue-500/10"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cashflow chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("cashflow")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCashflow ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={cashflow ?? []}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00897B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00897B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E65100" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E65100" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, currency)}
                    contentStyle={{ fontSize: "12px" }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="income" name="Receita" stroke="#00897B" fill="url(#incomeGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Despesa" stroke="#E65100" fill="url(#expenseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By category pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("expensesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingByCategory ? (
              <Skeleton className="h-56 w-full" />
            ) : !byCategory || byCategory.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                {t("noData")}
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <RePieChart>
                    <Pie
                      data={byCategory}
                      dataKey="total"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                    >
                      {byCategory.map((entry, index) => (
                        <Cell key={entry.categoryId} fill={entry.categoryColor ?? COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v, currency)} contentStyle={{ fontSize: "11px" }} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {byCategory.slice(0, 4).map((item, i) => (
                    <div key={item.categoryId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: item.categoryColor ?? COLORS[i % COLORS.length] }}
                        />
                        <span className="truncate text-muted-foreground">{item.categoryName}</span>
                      </div>
                      <span className="font-medium shrink-0">{formatCurrency(item.total, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("recentTransactions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !recent || recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</div>
          ) : (
            <div className="divide-y divide-border">
              {(recent as Array<{id: number; type: string; amount: number; description: string | null; date: string; notes: string | null; createdAt: string; userId: number; accountId: number; categoryId: number; categoryName: string | null; categoryColor: string | null; categoryIcon: string | null; accountName: string | null}>).map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 py-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm"
                    style={{ background: (txn.categoryColor ?? "#555") + "20", color: txn.categoryColor ?? "#555" }}
                  >
                    {txn.categoryName?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{txn.description || txn.categoryName}</p>
                    <p className="text-xs text-muted-foreground">{txn.date} · {txn.accountName}</p>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold shrink-0",
                    txn.type === "income" ? "text-emerald-500" : "text-red-500"
                  )}>
                    {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
