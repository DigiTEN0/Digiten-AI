import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  ExternalLink,
  FileText,
  GripVertical,
  Filter,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quotation } from "@shared/schema";

const KANBAN_COLUMNS = [
  { key: "quote_sent", label: "Verstuurd" },
  { key: "viewed", label: "Bekeken" },
  { key: "approved", label: "Geaccepteerd" },
  { key: "rejected", label: "Afgewezen" },
  { key: "invoiced", label: "Gefactureerd" },
  { key: "paid", label: "Betaald" },
] as const;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  quote_sent: ["viewed"],
  viewed: ["approved", "rejected"],
  approved: ["invoiced"],
  invoiced: ["paid"],
  rejected: [],
  paid: [],
};

function QuoteCard({
  quote,
  onDragStart,
}: {
  quote: Quotation;
  onDragStart: (e: React.DragEvent, quote: Quotation) => void;
}) {
  const { toast } = useToast();

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/quote/${token}`);
    toast({ title: "Link gekopieerd" });
  };

  const isDraggable = (ALLOWED_TRANSITIONS[quote.status || "new_lead"] || []).length > 0;

  return (
    <Card
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && onDragStart(e, quote)}
      className={`group ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      data-testid={`card-quote-${quote.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" data-testid={`text-client-name-${quote.id}`}>
              {quote.clientName}
            </p>
            {quote.clientCompany && (
              <p className="text-xs text-muted-foreground truncate">
                {quote.clientCompany}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isDraggable && (
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 invisible group-hover:visible" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-actions-${quote.id}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/quotes/${quote.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Bekijken
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyLink(quote.token)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Kopieer link
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/quote/${quote.token}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Klantweergave
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold" data-testid={`text-total-${quote.id}`}>
            {formatCurrency(parseFloat(quote.total || "0"))}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatDate(quote.createdAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  column,
  quotes,
  onDragStart,
  onDrop,
  dragOverColumn,
  onDragOver,
  onDragLeave,
}: {
  column: { key: string; label: string };
  quotes: Quotation[];
  onDragStart: (e: React.DragEvent, quote: Quotation) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  dragOverColumn: string | null;
  onDragOver: (e: React.DragEvent, status: string) => void;
  onDragLeave: () => void;
}) {
  const isOver = dragOverColumn === column.key;

  return (
    <div
      className="flex flex-col min-w-[260px] sm:min-w-[280px]"
      data-testid={`column-${column.key}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(column.key)}`}
          >
            {column.label}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {quotes.length}
          </span>
        </div>
      </div>

      <div
        className={`flex-1 space-y-2 p-2 rounded-md min-h-[120px] transition-colors ${
          isOver
            ? "bg-primary/5 border-2 border-dashed border-primary/30"
            : "bg-muted/30 border-2 border-dashed border-transparent"
        }`}
        onDragOver={(e) => onDragOver(e, column.key)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, column.key)}
      >
        {quotes.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[80px]">
            <p className="text-xs text-muted-foreground">Geen items</p>
          </div>
        ) : (
          quotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

export default function QuotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const draggedQuoteRef = useRef<Quotation | null>(null);
  const { toast } = useToast();

  const { data: quotes = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/quotations/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
    },
    onError: () => {
      toast({ title: "Status kon niet worden bijgewerkt", variant: "destructive" });
    },
  });

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = quotes.filter((q) => {
    if (statusFilter && q.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.clientName.toLowerCase().includes(query) ||
      q.clientEmail.toLowerCase().includes(query) ||
      (q.clientCompany || "").toLowerCase().includes(query)
    );
  });

  const getColumnQuotes = useCallback(
    (status: string) => filtered.filter((q) => q.status === status),
    [filtered]
  );

  const handleDragStart = (e: React.DragEvent, quote: Quotation) => {
    draggedQuoteRef.current = quote;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(quote.id));
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const quote = draggedQuoteRef.current;
    if (!quote) return;
    const allowed = ALLOWED_TRANSITIONS[quote.status || "new_lead"] || [];
    if (allowed.includes(status)) {
      e.dataTransfer.dropEffect = "move";
      setDragOverColumn(status);
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const quote = draggedQuoteRef.current;
    if (!quote) return;
    const allowed = ALLOWED_TRANSITIONS[quote.status || "new_lead"] || [];
    if (!allowed.includes(targetStatus)) return;
    updateStatusMutation.mutate({ id: quote.id, status: targetStatus });
    draggedQuoteRef.current = null;
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 w-64 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight"
            data-testid="text-quotes-title"
          >
            Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quotes.length} lead{quotes.length !== 1 ? "s" : ""} totaal
          </p>
        </div>
        <Button asChild size="sm" data-testid="button-new-quote">
          <Link href="/quotes/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Nieuwe offerte
          </Link>
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, email of bedrijf..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-quotes"
          />
        </div>
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Alle statussen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="quote_sent">Verstuurd</SelectItem>
            <SelectItem value="viewed">Bekeken</SelectItem>
            <SelectItem value="approved">Geaccepteerd</SelectItem>
            <SelectItem value="rejected">Afgewezen</SelectItem>
            <SelectItem value="invoiced">Gefactureerd</SelectItem>
            <SelectItem value="paid">Betaald</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (searchQuery || statusFilter) ? (
        <Card>
          <CardContent className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <p className="font-semibold">Geen leads gevonden</p>
            <p className="text-sm text-muted-foreground">
              Probeer een andere zoekterm of filter
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:flex gap-4 flex-1 overflow-x-auto pb-4">
            {KANBAN_COLUMNS
              .filter((col) => !statusFilter || col.key === statusFilter)
              .map((col) => (
              <KanbanColumn
                key={col.key}
                column={col}
                quotes={getColumnQuotes(col.key)}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                dragOverColumn={dragOverColumn}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              />
            ))}
          </div>

          <div className="md:hidden space-y-6 pb-4">
            {KANBAN_COLUMNS
              .filter((col) => !statusFilter || col.key === statusFilter)
              .map((col) => {
              const colQuotes = getColumnQuotes(col.key);
              if (colQuotes.length === 0 && !searchQuery && !statusFilter) return null;
              return (
                <div key={col.key} data-testid={`mobile-column-${col.key}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(col.key)}`}
                    >
                      {col.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {colQuotes.length}
                    </span>
                  </div>
                  {colQuotes.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1">Geen items</p>
                  ) : (
                    <div className="space-y-2">
                      {colQuotes.map((quote) => (
                        <QuoteCard
                          key={quote.id}
                          quote={quote}
                          onDragStart={handleDragStart}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
