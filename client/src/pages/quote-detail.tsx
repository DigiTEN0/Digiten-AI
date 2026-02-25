import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Send,
  Receipt,
  Copy,
  ExternalLink,
  Check,
  Clock,
  User,
  Building,
  Mail,
  Phone,
  Download,
  CalendarDays,
  FileText,
  MapPin,
  CheckCircle2,
  XCircle,
  Eye,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Quotation, QuoteItem } from "@shared/schema";

const actionIcons: Record<string, any> = {
  approved: CheckCircle2,
  rejected: XCircle,
  viewed: Eye,
  quote_sent: Send,
  lead_submitted: User,
  invoiced: Receipt,
  invoice_sent: Mail,
  paid: Wallet,
  created: FileText,
};

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const id = parseInt(params.id || "0");

  const { data: quote, isLoading } = useQuery<Quotation>({
    queryKey: ["/api/quotations", id],
  });

  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const { data: items = [] } = useQuery<QuoteItem[]>({
    queryKey: ["/api/quotations", id, "items"],
  });

  const sendMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", `/api/quotations/${id}/send`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", id] });
      toast({ title: "Offerte verstuurd naar klant" });
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: async (notes?: string) => { await apiRequest("POST", `/api/quotations/${id}/generate-invoice`, { invoiceNotes: notes || null }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", id] });
      setShowInvoiceDialog(false);
      setInvoiceNotes("");
      toast({ title: "Factuur aangemaakt" });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", `/api/quotations/${id}/send-invoice`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", id] });
      toast({ title: "Factuur verstuurd naar klant" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/quotations/${id}`, {
        status: "paid",
        auditLog: [
          ...((quote?.auditLog as any[]) || []),
          { action: "paid", timestamp: new Date().toISOString() },
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", id] });
      toast({ title: "Gemarkeerd als betaald" });
    },
  });

  const downloadPDF = () => { window.open(`/api/quotations/${id}/invoice-pdf`, "_blank"); };

  const copyLink = () => {
    if (quote) {
      navigator.clipboard.writeText(`${window.location.origin}/quote/${quote.token}`);
      toast({ title: "Link gekopieerd" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-lg font-semibold">Offerte niet gevonden</p>
      </div>
    );
  }

  const auditLog = (quote.auditLog as any[]) || [];
  const selectedItems = items.filter((i) => i.isSelected);
  const optionalNotSelected = items.filter((i) => i.isOptional && !i.isSelected);

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation("/quotes")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight" data-testid="text-quote-title">
                {quote.clientName}
              </h1>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(quote.status)}`}>
                {getStatusLabel(quote.status)}
              </span>
              {quote.invoiceNumber && (
                <Badge variant="outline" className="font-mono text-xs">
                  {quote.invoiceNumber}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Offerte #{quote.id} • {formatDate(quote.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(quote.status === "new_lead" || quote.status === "viewed") && (
            <Button size="sm" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} data-testid="button-send">
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Verstuur offerte
            </Button>
          )}
          {quote.status === "approved" && (
            <Button size="sm" onClick={() => setShowInvoiceDialog(true)} data-testid="button-invoice">
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              Maak factuur
            </Button>
          )}
          {(quote.status === "invoiced" || quote.status === "paid") && (
            <>
              <Button size="sm" variant="outline" onClick={downloadPDF} data-testid="button-download-pdf">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                PDF
              </Button>
              {quote.status === "invoiced" && (
                <>
                  <Button size="sm" onClick={() => sendInvoiceMutation.mutate()} disabled={sendInvoiceMutation.isPending} data-testid="button-send-invoice">
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Verstuur factuur
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending} data-testid="button-mark-paid">
                    <Wallet className="w-3.5 h-3.5 mr-1.5" />
                    Betaald
                  </Button>
                </>
              )}
            </>
          )}
          <Button size="sm" variant="outline" onClick={copyLink} data-testid="button-copy-link">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`/quote/${quote.token}`} target="_blank" rel="noreferrer" data-testid="link-client-view">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-sm font-semibold">Klantgegevens</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Naam</p>
                    <p className="text-sm font-medium" data-testid="text-client-name">{quote.clientName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">E-mail</p>
                    <p className="text-sm">{quote.clientEmail}</p>
                  </div>
                </div>
                {quote.clientPhone && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Telefoon</p>
                      <p className="text-sm">{quote.clientPhone}</p>
                    </div>
                  </div>
                )}
                {quote.clientCompany && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                      <Building className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Bedrijf</p>
                      <p className="text-sm">{quote.clientCompany}</p>
                    </div>
                  </div>
                )}
                {quote.desiredStartDate && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                      <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Gewenste startdatum</p>
                      <p className="text-sm">{formatDate(quote.desiredStartDate)}</p>
                    </div>
                  </div>
                )}
                {quote.clientAddress && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Adres</p>
                      <p className="text-sm">{quote.clientAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h2 className="text-sm font-semibold">Items</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 sm:px-6 py-3" data-testid={`item-row-${item.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.isOptional && <Badge variant="outline" className="text-[10px] h-5">Optioneel</Badge>}
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(parseFloat(item.total || "0"))}</p>
                      <p className="text-[10px] text-muted-foreground">{item.quantity} x {formatCurrency(parseFloat(item.unitPrice))}</p>
                    </div>
                  </div>
                ))}
                {optionalNotSelected.length > 0 && (
                  <div className="px-4 sm:px-6 py-2 bg-muted/30">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Niet geselecteerd</p>
                    {optionalNotSelected.map((item) => (
                      <p key={item.id} className="text-xs text-muted-foreground py-0.5 line-through">{item.name}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {quote.notes && (
            <Card>
              <CardHeader className="pb-2"><h2 className="text-sm font-semibold">Notities</h2></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{quote.notes}</p></CardContent>
            </Card>
          )}

          {quote.signature && (
            <Card>
              <CardHeader className="pb-2"><h2 className="text-sm font-semibold">Digitale handtekening</h2></CardHeader>
              <CardContent>
                <img src={quote.signature} alt="Handtekening" className="max-w-[250px] border rounded-lg p-2 bg-white" data-testid="img-signature" />
                {quote.signedAt && (
                  <p className="text-xs text-muted-foreground mt-2">Ondertekend op {formatDate(quote.signedAt.toString())}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><h2 className="text-sm font-semibold">Totaaloverzicht</h2></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between gap-1 text-sm">
                <span className="text-muted-foreground">Subtotaal</span>
                <span>{formatCurrency(parseFloat(quote.subtotal || "0"))}</span>
              </div>
              {parseFloat(quote.discount || "0") > 0 && (
                <div className="flex justify-between gap-1 text-sm">
                  <span className="text-muted-foreground">Korting</span>
                  <span className="text-red-600">-{formatCurrency(parseFloat(quote.discount || "0"))}</span>
                </div>
              )}
              {quote.includeVat && (
                <div className="flex justify-between gap-1 text-sm">
                  <span className="text-muted-foreground">BTW ({quote.vatRate}%)</span>
                  <span>{formatCurrency(parseFloat(quote.vatAmount || "0"))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between gap-1">
                <span className="font-semibold">Totaal</span>
                <span className="text-lg font-bold" data-testid="text-quote-total">
                  {formatCurrency(parseFloat(quote.total || "0"))}
                </span>
              </div>
            </CardContent>
          </Card>

          {quote.invoiceNumber && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Factuur</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nummer</span>
                  <span className="font-mono font-medium" data-testid="text-invoice-number">{quote.invoiceNumber}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={downloadPDF} data-testid="button-sidebar-download">
                    <Download className="w-3 h-3 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => sendInvoiceMutation.mutate()} disabled={sendInvoiceMutation.isPending} data-testid="button-sidebar-send-invoice">
                    <Mail className="w-3 h-3 mr-1" /> Verstuur
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><h2 className="text-sm font-semibold">Tijdlijn</h2></CardHeader>
            <CardContent>
              <div className="space-y-3 relative">
                <div className="absolute left-3 top-3 bottom-3 w-px bg-muted" />
                {auditLog.map((entry: any, i: number) => {
                  const Icon = actionIcons[entry.action] || Clock;
                  const isSuccess = entry.action === "approved" || entry.action === "paid";
                  const isError = entry.action === "rejected";
                  return (
                    <div key={i} className="flex items-start gap-3 relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        isSuccess ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600" :
                        isError ? "bg-red-100 dark:bg-red-950/30 text-red-600" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-xs font-medium">{getStatusLabel(entry.action)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(entry.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Factuur aanmaken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Wilt u een notitie toevoegen aan de factuur? Dit verschijnt onderaan de factuur PDF.
            </p>
            <div className="space-y-2">
              <Label>Factuurnotitie (optioneel)</Label>
              <Textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Bijv. Betaling binnen 14 dagen, werkzaamheden starten op..."
                rows={3}
                data-testid="input-invoice-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => invoiceMutation.mutate(invoiceNotes)}
              disabled={invoiceMutation.isPending}
              data-testid="button-confirm-invoice"
            >
              <Receipt className="w-4 h-4 mr-2" />
              {invoiceMutation.isPending ? "Aanmaken..." : "Factuur aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
