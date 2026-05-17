import { useState } from "react";
import { useGetCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
import type { Category } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#2E7D32", "#1565C0", "#E65100", "#6A1B9A", "#00838F", "#C62828", "#546E7A", "#E53935", "#AD1457", "#F57C00"];
const ICONS = ["attach_money", "briefcase", "store", "laptop", "trending-up", "utensils", "home", "car", "heart-pulse", "graduation-cap", "music", "shirt", "circle-dot", "flag", "star", "gift"];

export default function CategoriesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", type: "expense", icon: "circle-dot", color: "#1565C0" });

  const { data: categories, isLoading } = useGetCategories({ type: activeTab });
  const createMutation = useCreateCategory({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const updateMutation = useUpdateCategory({ mutation: { onSuccess: () => { qc.invalidateQueries(); setDialogOpen(false); } } });
  const deleteMutation = useDeleteCategory({ mutation: { onSuccess: () => qc.invalidateQueries() } });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", type: activeTab, icon: "circle-dot", color: "#1565C0" });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { name: form.name, icon: form.icon, color: form.color } });
    } else {
      createMutation.mutate({ data: { name: form.name, type: form.type as "income" | "expense", icon: form.icon, color: form.color } });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Eliminar esta categoria?")) deleteMutation.mutate({ id });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("categories")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organizar receitas e despesas</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Categoria</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "income" | "expense")}>
        <TabsList>
          <TabsTrigger value="expense">{t("expense")}</TabsTrigger>
          <TabsTrigger value="income">{t("income")}</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : categories?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Tags className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma categoria</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Criar categoria
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories?.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                    style={{ background: cat.color }}
                  >
                    {cat.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.type === "income" ? t("income") : t("expense")}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(cat)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Alimentação" />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t("income")}</SelectItem>
                    <SelectItem value="expense">{t("expense")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
