import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Save,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { PriceMatrixItem } from "@shared/schema";

interface QuoteItemDraft {
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
  unit: string;
  isOptional: boolean;
  isSelected: boolean;
}

export default function QuoteBuilderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: priceItems = [] } = useQuery<PriceMatrixItem[]>({
    queryKey: ["/api/price-matrix"],
  });

  const [client, setClient] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientCompany: "",
    clientAddress: "",
  });

  const [items, setItems] = useState<QuoteItemDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [includeVat, setIncludeVat] = useState(true);
  const [vatRate, setVatRate] = useState("21");
  const [discount, setDiscount] = useState("0");

  const addFromMatrix = (priceItem: PriceMatrixItem) => {
    setItems([
      ...items,
      {
        name: priceItem.name,
        description: priceItem.description || "",
        quantity: "1",
        unitPrice: priceItem.unitPrice,
        unit: priceItem.unit || "unit",
        isOptional: priceItem.isOptional || false,
        isSelected: true,
      },
    ]);
  };

  const addCustomItem = () => {
    setItems([
      ...items,
      {
        name: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
        unit: "unit",
        isOptional: false,
        isSelected: true,
      },
    ]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items
    .filter((i) => i.isSelected)
    .reduce((sum, i) => sum + parseFloat(i.quantity || "0") * parseFloat(i.unitPrice || "0"), 0);
  const discountAmount = parseFloat(discount || "0");
  const vatAmount = includeVat ? (subtotal - discountAmount) * (parseFloat(vatRate) / 100) : 0;
  const total = subtotal - discountAmount + vatAmount;

  const createMutation = useMutation({
    mutationFn: async (sendQuote: boolean) => {
      const quoteItems = items.map((i) => ({
        name: i.name,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unit: i.unit,
        isOptional: i.isOptional,
        isSelected: i.isSelected,
        total: (parseFloat(i.quantity || "0") * parseFloat(i.unitPrice || "0")).toFixed(2),
      }));

      const res = await apiRequest("POST", "/api/quotations", {
        ...client,
        items: quoteItems,
        subtotal: subtotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        vatRate,
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        includeVat,
        notes,
        status: sendQuote ? "quote_sent" : "new_lead",
        auditLog: [
          { action: "created", timestamp: new Date().toISOString() },
          ...(sendQuote ? [{ action: "quote_sent", timestamp: new Date().toISOString() }] : []),
        ],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "Offerte aangemaakt" });
      setLocation("/quotes");
    },
    onError: (err: any) => {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    },
  });

  const categories = [...new Set(priceItems.map((p) => p.category || "General"))];

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/quotes")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-builder-title">
            Nieuwe Offerte
          </h1>
          <p className="text-muted-foreground mt-1">
            Stel een offerte samen voor uw klant
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <h2 className="text-base font-semibold">Klantgegevens</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input
                    value={client.clientName}
                    onChange={(e) => setClient({ ...client, clientName: e.target.value })}
                    placeholder="Jan de Vries"
                    data-testid="input-client-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={client.clientEmail}
                    onChange={(e) => setClient({ ...client, clientEmail: e.target.value })}
                    placeholder="jan@voorbeeld.nl"
                    data-testid="input-client-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefoon</Label>
                  <Input
                    value={client.clientPhone}
                    onChange={(e) => setClient({ ...client, clientPhone: e.target.value })}
                    placeholder="+31 6 12345678"
                    data-testid="input-client-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bedrijf</Label>
                  <Input
                    value={client.clientCompany}
                    onChange={(e) => setClient({ ...client, clientCompany: e.target.value })}
                    placeholder="Bedrijf BV"
                    data-testid="input-client-company"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  value={client.clientAddress}
                  onChange={(e) => setClient({ ...client, clientAddress: e.target.value })}
                  placeholder="Straatnaam 1, 1234 AB Amsterdam"
                  data-testid="input-client-address"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-base font-semibold">Offerte items</h2>
                <Button variant="outline" size="sm" onClick={addCustomItem} data-testid="button-add-custom">
                  <Plus className="w-4 h-4 mr-1" />
                  Custom item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((cat) => {
                const catItems = priceItems.filter((p) => (p.category || "General") === cat);
                return (
                  <div key={cat}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      {cat}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {catItems.map((pi) => (
                        <Button
                          key={pi.id}
                          variant="outline"
                          size="sm"
                          onClick={() => addFromMatrix(pi)}
                          data-testid={`button-add-item-${pi.id}`}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {pi.name}
                          <span className="ml-1 text-muted-foreground">
                            {formatCurrency(parseFloat(pi.unitPrice))}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <Separator />

              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Voeg items toe uit de prijsmatrix of maak een custom item</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-md border p-4 space-y-3"
                      data-testid={`quote-item-${index}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2 space-y-1">
                            <Label className="text-xs">Naam</Label>
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(index, "name", e.target.value)}
                              placeholder="Item naam"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Aantal</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              min="0"
                              step="0.5"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Prijs per {item.unit}</Label>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="mt-5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.isOptional}
                              onCheckedChange={(c) => updateItem(index, "isOptional", c)}
                            />
                            <Label className="text-xs text-muted-foreground">Optioneel</Label>
                          </div>
                          <Select
                            value={item.unit}
                            onValueChange={(v) => updateItem(index, "unit", v)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unit">unit</SelectItem>
                              <SelectItem value="m\u00B2">m\u00B2</SelectItem>
                              <SelectItem value="uur">uur</SelectItem>
                              <SelectItem value="vast">vast</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-sm font-medium">
                          {formatCurrency(
                            parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0")
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <h2 className="text-base font-semibold">Notities</h2>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Aanvullende opmerkingen voor de klant..."
                rows={3}
                data-testid="input-notes"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="pb-4">
              <h2 className="text-base font-semibold">Samenvatting</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1 text-sm">
                  <span className="text-muted-foreground">Subtotaal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-1 text-sm">
                  <span className="text-muted-foreground">Korting</span>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 h-8 text-right"
                    min="0"
                    step="0.01"
                    data-testid="input-discount"
                  />
                </div>
                <div className="flex items-center justify-between gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={includeVat}
                      onCheckedChange={setIncludeVat}
                      data-testid="switch-vat"
                    />
                    <span className="text-muted-foreground">BTW ({vatRate}%)</span>
                  </div>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold">Totaal</span>
                  <span className="text-lg font-bold" data-testid="text-total">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate(true)}
                  disabled={
                    createMutation.isPending ||
                    !client.clientName ||
                    !client.clientEmail ||
                    items.length === 0
                  }
                  data-testid="button-send-quote"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? "Bezig..." : "Verstuur offerte"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => createMutation.mutate(false)}
                  disabled={
                    createMutation.isPending ||
                    !client.clientName ||
                    !client.clientEmail ||
                    items.length === 0
                  }
                  data-testid="button-save-draft"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Opslaan als concept
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
