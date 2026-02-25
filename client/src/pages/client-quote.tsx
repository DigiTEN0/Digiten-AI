import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Check,
  X,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  Zap,
  PenTool,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ClientQuotePage() {
  const params = useParams<{ token: string }>();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [optionalSelections, setOptionalSelections] = useState<Record<number, boolean>>({});

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/public/quote", params.token],
  });

  const quote = data?.quote;
  const org = data?.organization;
  const items = data?.items || [];

  useEffect(() => {
    if (items.length > 0) {
      const selections: Record<number, boolean> = {};
      items.forEach((item: any) => {
        selections[item.id] = item.isSelected;
      });
      setOptionalSelections(selections);
    }
  }, [items]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = items.map((item: any) => ({
        id: item.id,
        isSelected: optionalSelections[item.id] ?? item.isSelected,
      }));
      await apiRequest("POST", `/api/public/quote/${params.token}/accept`, {
        signature: signatureData,
        selectedItems,
      });
    },
    onSuccess: () => {
      setShowSignDialog(false);
      toast({ title: "Offerte geaccepteerd! Bedankt." });
      window.location.reload();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/public/quote/${params.token}/reject`, {
        reason: rejectReason,
      });
    },
    onSuccess: () => {
      setShowRejectDialog(false);
      toast({ title: "Offerte afgewezen" });
      window.location.reload();
    },
  });

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    if (showSignDialog) {
      setTimeout(initCanvas, 100);
    }
  }, [showSignDialog]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
  };

  const toggleOptional = (itemId: number) => {
    setOptionalSelections((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const selectedItems = items.filter(
    (item: any) => optionalSelections[item.id] ?? item.isSelected
  );
  const calculatedSubtotal = selectedItems.reduce(
    (sum: number, item: any) =>
      sum + parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0"),
    0
  );
  const vatRate = parseFloat(quote?.vatRate || "21");
  const calculatedVat = quote?.includeVat ? calculatedSubtotal * (vatRate / 100) : 0;
  const calculatedTotal = calculatedSubtotal + calculatedVat - parseFloat(quote?.discount || "0");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-3xl p-6 space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-6">
          <CardContent className="text-center py-12">
            <p className="text-lg font-medium">Offerte niet gevonden</p>
            <p className="text-sm text-muted-foreground mt-2">
              Deze link is mogelijk verlopen of ongeldig
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActionable = ["viewed", "quote_sent"].includes(quote.status);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {org?.logo ? (
              <img
                src={org.logo}
                alt={org.name}
                style={{ height: `${org?.logoSize || 40}px` }}
                className="max-w-[160px] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-md" style={{ backgroundColor: org?.primaryColor || "#1d4ed8" }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold" data-testid="text-org-name">{org?.name}</h1>
              <p className="text-xs text-muted-foreground">Offerte #{quote.id}</p>
            </div>
          </div>
          <Badge variant={quote.status === "approved" ? "default" : quote.status === "rejected" ? "destructive" : "secondary"}>
            {getStatusLabel(quote.status)}
          </Badge>
        </div>

        {(quote.status === "approved" || quote.status === "rejected") && (
          <Card>
            <CardContent className="py-6 text-center">
              {quote.status === "approved" ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-chart-2/10 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 text-chart-2" />
                  </div>
                  <p className="font-semibold text-lg">Offerte geaccepteerd</p>
                  <p className="text-sm text-muted-foreground">
                    Ondertekend op {formatDate(quote.signedAt)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <X className="w-6 h-6 text-destructive" />
                  </div>
                  <p className="font-semibold text-lg">Offerte afgewezen</p>
                  {quote.rejectionReason && (
                    <p className="text-sm text-muted-foreground">
                      Reden: {quote.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {org && (
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-muted-foreground">
                {org.address && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{org.address}</span>
                  </div>
                )}
                {org.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{org.phone}</span>
                  </div>
                )}
                {org.email && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="break-all">{org.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-1">
              <h2 className="text-base font-semibold">Offerte voor</h2>
              <p className="text-sm text-muted-foreground">
                {formatDate(quote.createdAt)}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Naam</p>
                <p className="font-medium">{quote.clientName}</p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">E-mail</p>
                <p className="font-medium break-all">{quote.clientEmail}</p>
              </div>
              {quote.clientCompany && (
                <div>
                  <p className="text-muted-foreground">Bedrijf</p>
                  <p className="font-medium">{quote.clientCompany}</p>
                </div>
              )}
              {quote.clientPhone && (
                <div>
                  <p className="text-muted-foreground">Telefoon</p>
                  <p className="font-medium">{quote.clientPhone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <h2 className="text-base font-semibold">Items</h2>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[480px]">
              <TableHeader>
                <TableRow>
                  {isActionable && <TableHead className="w-12" />}
                  <TableHead>Omschrijving</TableHead>
                  <TableHead className="text-right">Aantal</TableHead>
                  <TableHead className="text-right">Prijs</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => {
                  const isSelected = optionalSelections[item.id] ?? item.isSelected;
                  const lineTotal = isSelected
                    ? parseFloat(item.quantity || "0") * parseFloat(item.unitPrice || "0")
                    : 0;
                  return (
                    <TableRow
                      key={item.id}
                      className={!isSelected ? "opacity-50" : ""}
                      data-testid={`client-item-${item.id}`}
                    >
                      {isActionable && (
                        <TableCell>
                          {item.isOptional && (
                            <Switch
                              checked={isSelected}
                              onCheckedChange={() => toggleOptional(item.id)}
                              data-testid={`switch-item-${item.id}`}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {item.isOptional && (
                            <Badge variant="outline" className="text-xs">
                              Optioneel
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(item.unitPrice))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(lineTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex justify-between gap-1 text-sm">
              <span className="text-muted-foreground">Subtotaal</span>
              <span>{formatCurrency(calculatedSubtotal)}</span>
            </div>
            {parseFloat(quote.discount || "0") > 0 && (
              <div className="flex justify-between gap-1 text-sm">
                <span className="text-muted-foreground">Korting</span>
                <span>-{formatCurrency(parseFloat(quote.discount || "0"))}</span>
              </div>
            )}
            {quote.includeVat && (
              <div className="flex justify-between gap-1 text-sm">
                <span className="text-muted-foreground">BTW ({vatRate}%)</span>
                <span>{formatCurrency(calculatedVat)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between gap-1">
              <span className="font-semibold text-lg">Totaal</span>
              <span className="font-bold text-xl" data-testid="text-client-total">
                {formatCurrency(calculatedTotal)}
              </span>
            </div>
          </CardContent>
        </Card>

        {quote.notes && (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm font-medium mb-1">Notities</p>
              <p className="text-sm text-muted-foreground">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {org?.quoteFooter && (
          <p className="text-xs text-muted-foreground text-center">
            {org.quoteFooter}
          </p>
        )}

        {isActionable && (
          <div className="flex items-center gap-3 justify-center pt-4 pb-8">
            <Button
              size="lg"
              onClick={() => setShowSignDialog(true)}
              data-testid="button-accept-quote"
            >
              <Check className="w-4 h-4 mr-2" />
              Accepteren en ondertekenen
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowRejectDialog(true)}
              data-testid="button-reject-quote"
            >
              <X className="w-4 h-4 mr-2" />
              Afwijzen
            </Button>
          </div>
        )}

        <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Onderteken offerte</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Teken hieronder uw handtekening om de offerte van{" "}
                {formatCurrency(calculatedTotal)} te accepteren.
              </p>
              <div className="border rounded-md relative" style={{ touchAction: "none" }}>
                <canvas
                  ref={canvasRef}
                  className="w-full h-40 cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  data-testid="canvas-signature"
                />
                {!signatureData && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <PenTool className="w-4 h-4" />
                      <span className="text-sm">Teken uw handtekening</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={clearSignature}>
                  Wissen
                </Button>
                <Button
                  onClick={() => acceptMutation.mutate()}
                  disabled={!signatureData || acceptMutation.isPending}
                  data-testid="button-confirm-sign"
                >
                  {acceptMutation.isPending ? "Bezig..." : "Ondertekenen"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Offerte afwijzen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Laat ons weten waarom u de offerte afwijst (optioneel).
              </p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reden voor afwijzing..."
                rows={3}
                data-testid="input-reject-reason"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                  Annuleren
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  {rejectMutation.isPending ? "Bezig..." : "Afwijzen"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
