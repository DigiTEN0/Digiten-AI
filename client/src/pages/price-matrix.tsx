import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Grid3X3, GitBranch, ArrowRight, Link2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PriceMatrixItem } from "@shared/schema";

function ItemForm({
  item,
  allItems,
  onSave,
  onCancel,
  isPending,
}: {
  item?: PriceMatrixItem;
  allItems: PriceMatrixItem[];
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
    category: item?.category || "Algemeen",
    unit: item?.unit || "vast",
    unitPrice: item?.unitPrice || "0",
    isOptional: item?.isOptional || false,
    sortOrder: item?.sortOrder || 0,
    dependsOnItemId: item?.dependsOnItemId || null,
    dependsOnCondition: item?.dependsOnCondition || "always",
  });

  const parentItems = allItems.filter((i) => i.id !== item?.id && !i.dependsOnItemId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label>Naam *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Naam van de dienst"
            data-testid="input-item-name"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Beschrijving</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Korte beschrijving"
            data-testid="input-item-description"
          />
        </div>
        <div className="space-y-2">
          <Label>Categorie</Label>
          <Input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Categorie"
            data-testid="input-item-category"
          />
        </div>
        <div className="space-y-2">
          <Label>Eenheid</Label>
          <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
            <SelectTrigger data-testid="select-item-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stuk">stuk</SelectItem>
              <SelectItem value="m²">m²</SelectItem>
              <SelectItem value="uur">uur</SelectItem>
              <SelectItem value="vast">vast</SelectItem>
              <SelectItem value="maand">maand</SelectItem>
              <SelectItem value="dag">dag</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prijs per eenheid *</Label>
          <Input
            type="number"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            min="0"
            step="0.01"
            data-testid="input-item-price"
          />
        </div>
        <div className="space-y-2">
          <Label>Sorteervolgorde</Label>
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Switch
          checked={form.isOptional}
          onCheckedChange={(c) => setForm({ ...form, isOptional: c })}
          data-testid="switch-optional"
        />
        <div>
          <Label className="text-sm font-medium">Optioneel item</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Klant kan dit item aan/uitzetten in de offerte</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Conditionele logica</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Toon dit item alleen als een ander item geselecteerd is of juist niet
        </p>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Afhankelijk van</Label>
            <Select
              value={form.dependsOnItemId ? String(form.dependsOnItemId) : "none"}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  dependsOnItemId: v === "none" ? null : parseInt(v),
                  dependsOnCondition: v === "none" ? "always" : form.dependsOnCondition === "always" ? "when_selected" : form.dependsOnCondition,
                })
              }
            >
              <SelectTrigger data-testid="select-depends-on">
                <SelectValue placeholder="Geen afhankelijkheid" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen (altijd tonen)</SelectItem>
                {parentItems.map((pi) => (
                  <SelectItem key={pi.id} value={String(pi.id)}>
                    {pi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.dependsOnItemId && (
            <div className="space-y-2">
              <Label className="text-xs">Wanneer tonen</Label>
              <Select
                value={form.dependsOnCondition || "when_selected"}
                onValueChange={(v) => setForm({ ...form, dependsOnCondition: v })}
              >
                <SelectTrigger data-testid="select-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="when_selected">Als het bovenliggende item geselecteerd is</SelectItem>
                  <SelectItem value="when_not_selected">Als het bovenliggende item NIET geselecteerd is</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Annuleren
        </Button>
        <Button
          onClick={() => onSave(form)}
          disabled={isPending || !form.name || !form.unitPrice}
          data-testid="button-save-item"
        >
          {isPending ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </div>
  );
}

export default function PriceMatrixPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceMatrixItem | null>(null);

  const { data: items = [], isLoading } = useQuery<PriceMatrixItem[]>({
    queryKey: ["/api/price-matrix"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/price-matrix", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-matrix"] });
      setIsDialogOpen(false);
      toast({ title: "Dienst toegevoegd" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/price-matrix/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-matrix"] });
      setEditingItem(null);
      toast({ title: "Dienst bijgewerkt" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/price-matrix/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-matrix"] });
      toast({ title: "Dienst verwijderd" });
    },
  });

  const categories = [...new Set(items.map((i) => i.category || "Algemeen"))];

  const getParentName = (id: number | null) => {
    if (!id) return null;
    return items.find((i) => i.id === id)?.name;
  };

  const getConditionLabel = (condition: string | null) => {
    if (!condition || condition === "always") return null;
    return condition === "when_selected" ? "bij selectie" : "zonder selectie";
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-matrix-title">
            Prijsmatrix
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Beheer diensten, prijzen en conditionele logica
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-service">
              <Plus className="w-4 h-4 mr-1.5" />
              Dienst toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe dienst toevoegen</DialogTitle>
            </DialogHeader>
            <ItemForm
              allItems={items}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setIsDialogOpen(false)}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dienst bewerken</DialogTitle>
            </DialogHeader>
            <ItemForm
              item={editingItem}
              allItems={items}
              onSave={(data) =>
                updateMutation.mutate({ id: editingItem.id, data })
              }
              onCancel={() => setEditingItem(null)}
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Grid3X3 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Nog geen diensten</p>
              <p className="text-sm text-muted-foreground mt-1">
                Voeg uw eerste dienst toe om offertes te kunnen maken
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Eerste dienst toevoegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        categories.map((cat) => {
          const topLevelItems = items.filter(
            (i) => (i.category || "Algemeen") === cat && !i.dependsOnItemId
          );
          const childItems = items.filter(
            (i) => (i.category || "Algemeen") === cat && !!i.dependsOnItemId
          );

          return (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-1">
                  <h2 className="text-sm font-semibold">{cat}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {topLevelItems.length + childItems.length} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-3 sm:p-6 pt-0">
                {topLevelItems.map((item) => {
                  const children = items.filter((c) => c.dependsOnItemId === item.id);
                  return (
                    <div key={item.id}>
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors group"
                        data-testid={`row-item-${item.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{item.name}</span>
                            {item.isOptional ? (
                              <Badge variant="outline" className="text-[10px] h-5">Optioneel</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] h-5">Standaard</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">{formatCurrency(parseFloat(item.unitPrice))}</p>
                          <p className="text-[10px] text-muted-foreground">per {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingItem(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteMutation.mutate(item.id)}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {children.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-dashed border-muted pl-4">
                          {children.map((child) => (
                            <div
                              key={child.id}
                              className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed hover:bg-muted/30 transition-colors group"
                              data-testid={`row-item-${child.id}`}
                            >
                              <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                                <Link2 className="w-3 h-3" />
                                <ArrowRight className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{child.name}</span>
                                  {child.isOptional ? (
                                    <Badge variant="outline" className="text-[10px] h-5">Optioneel</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] h-5">Standaard</Badge>
                                  )}
                                  <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                                    <GitBranch className="w-2.5 h-2.5 mr-1" />
                                    {getConditionLabel(child.dependsOnCondition)} van {getParentName(child.dependsOnItemId)}
                                  </Badge>
                                </div>
                                {child.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{child.description}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">{formatCurrency(parseFloat(child.unitPrice))}</p>
                                <p className="text-[10px] text-muted-foreground">per {child.unit}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditingItem(child)}
                                  data-testid={`button-edit-${child.id}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => deleteMutation.mutate(child.id)}
                                  data-testid={`button-delete-${child.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {childItems.filter((c) => !topLevelItems.some((t) => t.id === c.dependsOnItemId)).map((orphan) => (
                  <div
                    key={orphan.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-dashed hover:bg-muted/30 transition-colors group"
                    data-testid={`row-item-${orphan.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{orphan.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5 border-amber-300 text-amber-700 dark:text-amber-400">
                          <GitBranch className="w-2.5 h-2.5 mr-1" />
                          {getConditionLabel(orphan.dependsOnCondition)} van {getParentName(orphan.dependsOnItemId)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(parseFloat(orphan.unitPrice))}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem(orphan)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(orphan.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
