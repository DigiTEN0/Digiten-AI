import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Building, Palette, FileText, Link2, Copy, Mail, Code2, Check, Upload, ImageIcon, Trash2, Clock, CreditCard } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Organization } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: org, isLoading } = useQuery<Organization>({
    queryKey: ["/api/organization"],
  });

  const defaultOpeningHours: Record<string, { open: string; close: string; enabled: boolean }> = {
    monday: { open: "09:00", close: "17:00", enabled: true },
    tuesday: { open: "09:00", close: "17:00", enabled: true },
    wednesday: { open: "09:00", close: "17:00", enabled: true },
    thursday: { open: "09:00", close: "17:00", enabled: true },
    friday: { open: "09:00", close: "17:00", enabled: true },
    saturday: { open: "09:00", close: "17:00", enabled: false },
    sunday: { open: "09:00", close: "17:00", enabled: false },
  };

  const dayLabels: Record<string, string> = {
    monday: "Maandag",
    tuesday: "Dinsdag",
    wednesday: "Woensdag",
    thursday: "Donderdag",
    friday: "Vrijdag",
    saturday: "Zaterdag",
    sunday: "Zondag",
  };

  const [form, setForm] = useState({
    name: "",
    vatNumber: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    primaryColor: "#1d4ed8",
    accentColor: "#3b82f6",
    quoteFooter: "",
    termsConditions: "",
    emailFromName: "",
    invoicePrefix: "INV",
    logoSize: 40,
    iban: "",
    kvkNumber: "",
    openingHours: defaultOpeningHours as Record<string, { open: string; close: string; enabled: boolean }>,
  });

  useEffect(() => {
    if (org) {
      const oh = (org as any).openingHours || {};
      const mergedHours = { ...defaultOpeningHours };
      for (const day of Object.keys(defaultOpeningHours)) {
        if (oh[day]) {
          mergedHours[day] = { ...defaultOpeningHours[day], ...oh[day] };
        }
      }
      setForm({
        name: org.name || "",
        vatNumber: org.vatNumber || "",
        address: org.address || "",
        phone: org.phone || "",
        email: org.email || "",
        website: org.website || "",
        primaryColor: org.primaryColor || "#1d4ed8",
        accentColor: org.accentColor || "#3b82f6",
        quoteFooter: org.quoteFooter || "",
        termsConditions: org.termsConditions || "",
        emailFromName: org.emailFromName || "",
        invoicePrefix: org.invoicePrefix || "INV",
        logoSize: org.logoSize || 40,
        iban: (org as any).iban || "",
        kvkNumber: (org as any).kvkNumber || "",
        openingHours: mergedHours,
      });
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", "/api/organization", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Instellingen opgeslagen" });
    },
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formDataObj = new FormData();
      formDataObj.append("logo", file);
      const res = await fetch("/api/organization/logo", {
        method: "POST",
        body: formDataObj,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Logo geüpload" });
    },
    onError: () => {
      toast({ title: "Upload mislukt", variant: "destructive" });
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/organization", { logo: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Logo verwijderd" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: `${label} gekopieerd` });
    setTimeout(() => setCopied(null), 2000);
  };

  const slug = org?.slug || "";
  const leadFormUrl = org
    ? slug
      ? `${window.location.origin}/${slug}`
      : `${window.location.origin}/lead-form/${org.id}`
    : "";
  const embedCode = org
    ? `<iframe src="${leadFormUrl}" width="100%" height="800" frameborder="0" style="border:none; border-radius:8px;"></iframe>`
    : "";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">
            Instellingen
          </h1>
          <p className="text-muted-foreground mt-1">Beheer uw bedrijfsgegevens en configuratie</p>
        </div>
        <Button
          onClick={() => updateMutation.mutate(form)}
          disabled={updateMutation.isPending}
          data-testid="button-save-settings"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" data-testid="tab-general">Algemeen</TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">Offertes</TabsTrigger>
          <TabsTrigger value="availability" data-testid="tab-availability">Beschikbaarheid</TabsTrigger>
          <TabsTrigger value="embed" data-testid="tab-embed">Embed</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Bedrijfsgegevens</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bedrijfsnaam</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="input-org-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>BTW-nummer</Label>
                  <Input
                    value={form.vatNumber}
                    onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                    placeholder="NL123456789B01"
                    data-testid="input-vat-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mailadres</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    data-testid="input-org-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefoonnummer</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    data-testid="input-org-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://..."
                    data-testid="input-org-website"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Afzendernaam (e-mail)</Label>
                  <Input
                    value={form.emailFromName}
                    onChange={(e) => setForm({ ...form, emailFromName: e.target.value })}
                    data-testid="input-email-from"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  data-testid="input-org-address"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Betaalgegevens</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Deze gegevens worden getoond op uw facturen
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={form.iban}
                    onChange={(e) => setForm({ ...form, iban: e.target.value })}
                    placeholder="NL00 BANK 0000 0000 00"
                    data-testid="input-iban"
                  />
                </div>
                <div className="space-y-2">
                  <Label>KVK-nummer</Label>
                  <Input
                    value={form.kvkNumber}
                    onChange={(e) => setForm({ ...form, kvkNumber: e.target.value })}
                    placeholder="12345678"
                    data-testid="input-kvk"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Logo</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Upload uw bedrijfslogo — dit wordt getoond op het aanvraagformulier en in offertes
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {org?.logo ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative rounded-lg border bg-white p-3 flex items-center justify-center" style={{ minWidth: 60, minHeight: 60 }}>
                      <img
                        src={org.logo}
                        alt="Logo"
                        style={{ height: `${form.logoSize}px`, maxWidth: "200px" }}
                        className="object-contain"
                        data-testid="img-current-logo"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadLogoMutation.isPending}
                        data-testid="button-change-logo"
                      >
                        <Upload className="w-3 h-3 mr-2" />
                        Wijzigen
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeLogoMutation.mutate()}
                        disabled={removeLogoMutation.isPending}
                        data-testid="button-remove-logo"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Verwijderen
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Logo grootte</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">{form.logoSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="120"
                      step="2"
                      value={form.logoSize}
                      onChange={(e) => setForm({ ...form, logoSize: parseInt(e.target.value) })}
                      className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                      data-testid="slider-logo-size"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Klein</span>
                      <span>Groot</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                  data-testid="dropzone-logo"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Upload uw logo</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG of WebP (max 5MB)</p>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadLogoMutation.mutate(file);
                  e.target.value = "";
                }}
                data-testid="input-logo-file"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Kleuren</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primaire kleur</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-md border cursor-pointer"
                      data-testid="input-primary-color"
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent kleur</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-md border cursor-pointer"
                      data-testid="input-accent-color"
                    />
                    <Input
                      value={form.accentColor}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
                <div className="w-8 h-8 rounded-md" style={{ backgroundColor: form.primaryColor }} />
                <div className="w-8 h-8 rounded-md" style={{ backgroundColor: form.accentColor }} />
                <p className="text-sm text-muted-foreground">Preview van uw kleuren</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="quotes" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Offerte & factuur instellingen</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Factuur prefix</Label>
                <Input
                  value={form.invoicePrefix}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                  placeholder="INV"
                  className="w-32"
                  data-testid="input-invoice-prefix"
                />
                <p className="text-xs text-muted-foreground">
                  Factuurnummers worden als {form.invoicePrefix || "INV"}-1001, {form.invoicePrefix || "INV"}-1002, etc. gegenereerd
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Offerte footer tekst</Label>
                <Textarea
                  value={form.quoteFooter}
                  onChange={(e) => setForm({ ...form, quoteFooter: e.target.value })}
                  placeholder="Tekst die onderaan elke offerte verschijnt..."
                  rows={3}
                  data-testid="input-quote-footer"
                />
              </div>
              <div className="space-y-2">
                <Label>Algemene voorwaarden</Label>
                <Textarea
                  value={form.termsConditions}
                  onChange={(e) => setForm({ ...form, termsConditions: e.target.value })}
                  placeholder="Uw algemene voorwaarden..."
                  rows={4}
                  data-testid="input-terms"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Openingstijden</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Stel uw beschikbare tijden in. Klanten kunnen alleen tijdslots kiezen binnen deze uren.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(dayLabels).map(([dayKey, dayLabel]) => {
                const dayHours = form.openingHours[dayKey] || { open: "09:00", close: "17:00", enabled: false };
                return (
                  <div key={dayKey} className="flex items-center gap-3 p-3 rounded-lg border" data-testid={`opening-hours-${dayKey}`}>
                    <label className="flex items-center gap-2 w-28 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dayHours.enabled}
                        onChange={(e) => {
                          const updated = { ...form.openingHours };
                          updated[dayKey] = { ...dayHours, enabled: e.target.checked };
                          setForm({ ...form, openingHours: updated });
                        }}
                        className="rounded border-gray-300"
                        data-testid={`checkbox-${dayKey}`}
                      />
                      <span className={`text-sm font-medium ${dayHours.enabled ? "" : "text-muted-foreground"}`}>
                        {dayLabel}
                      </span>
                    </label>
                    {dayHours.enabled ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={dayHours.open}
                          onChange={(e) => {
                            const updated = { ...form.openingHours };
                            updated[dayKey] = { ...dayHours, open: e.target.value };
                            setForm({ ...form, openingHours: updated });
                          }}
                          className="w-28 h-9 text-sm"
                          data-testid={`input-open-${dayKey}`}
                        />
                        <span className="text-sm text-muted-foreground">tot</span>
                        <Input
                          type="time"
                          value={dayHours.close}
                          onChange={(e) => {
                            const updated = { ...form.openingHours };
                            updated[dayKey] = { ...dayHours, close: e.target.value };
                            setForm({ ...form, openingHours: updated });
                          }}
                          className="w-28 h-9 text-sm"
                          data-testid={`input-close-${dayKey}`}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Gesloten</span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Lead formulier link</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Deel deze link met klanten zodat zij een offerte kunnen aanvragen
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={leadFormUrl}
                  className="font-mono text-xs"
                  data-testid="input-lead-form-url"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(leadFormUrl, "Link")}
                  data-testid="button-copy-lead-link"
                >
                  {copied === "Link" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Embed code (iframe)</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Kopieer deze code en plak het op uw website om het aanvraagformulier in te sluiten
              </p>
              <div className="relative">
                <pre className="p-4 rounded-md bg-muted text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-code">
                  {embedCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(embedCode, "Embed code")}
                  data-testid="button-copy-embed"
                >
                  {copied === "Embed code" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span className="ml-1">{copied === "Embed code" ? "Gekopieerd" : "Kopieer"}</span>
                </Button>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  De embed code plaatst uw aanvraagformulier als iframe op uw website.
                  Het formulier past zich automatisch aan de breedte van de container aan.
                  Prijzen worden niet getoond aan de klant.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
