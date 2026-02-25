import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
  Search,
  Users,
  Eye,
  Copy,
  ExternalLink,
  MoreHorizontal,
  GripVertical,
  CalendarDays,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quotation } from "@shared/schema";

const LEAD_COLUMNS = [
  { key: "new_lead", label: "Nieuwe Lead" },
  { key: "quote_sent", label: "Verstuurd" },
  { key: "viewed", label: "Bekeken" },
] as const;

const LEAD_TRANSITIONS: Record<string, string[]> = {
  new_lead: ["quote_sent"],
  quote_sent: ["viewed"],
  viewed: [],
};

function LeadCard({
  lead,
  onDragStart,
}: {
  lead: Quotation;
  onDragStart: (e: React.DragEvent, quote: Quotation) => void;
}) {
  const { toast } = useToast();

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/quote/${token}`);
    toast({ title: "Link gekopieerd" });
  };

  const isDraggable = (LEAD_TRANSITIONS[lead.status || "new_lead"] || []).length > 0;

  return (
    <Card
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && onDragStart(e, lead)}
      className={`group ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      data-testid={`card-lead-${lead.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" data-testid={`text-lead-name-${lead.id}`}>
              {lead.clientName}
            </p>
            {lead.clientCompany && (
              <p className="text-xs text-muted-foreground truncate">
                {lead.clientCompany}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isDraggable && (
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 invisible group-hover:visible" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-lead-actions-${lead.id}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/quotes/${lead.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Bekijken
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyLink(lead.token)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Kopieer link
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/quote/${lead.token}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Klantweergave
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold" data-testid={`text-lead-total-${lead.id}`}>
            {formatCurrency(parseFloat(lead.total || "0"))}
          </p>
          <div className="text-right">
            {lead.desiredStartDate && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarDays className="w-3 h-3" />
                <span>{formatDate(lead.desiredStartDate)}</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {formatDate(lead.createdAt)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadColumn({
  column,
  leads,
  onDragStart,
  onDrop,
  dragOverColumn,
  onDragOver,
  onDragLeave,
}: {
  column: { key: string; label: string };
  leads: Quotation[];
  onDragStart: (e: React.DragEvent, quote: Quotation) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  dragOverColumn: string | null;
  onDragOver: (e: React.DragEvent, status: string) => void;
  onDragLeave: () => void;
}) {
  const isOver = dragOverColumn === column.key;

  return (
    <div
      className="flex flex-col flex-1 min-w-[260px]"
      data-testid={`column-lead-${column.key}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(column.key)}`}
          >
            {column.label}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {leads.length}
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
        {leads.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[80px]">
            <p className="text-xs text-muted-foreground">Geen leads</p>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const draggedLeadRef = useRef<Quotation | null>(null);
  const { toast } = useToast();

  const { data: quotes = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const leadStatuses = ["new_lead", "quote_sent", "viewed"];
  const allLeads = quotes.filter((q) => leadStatuses.includes(q.status || ""));

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

  const filtered = allLeads.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.clientName.toLowerCase().includes(query) ||
      q.clientEmail.toLowerCase().includes(query) ||
      (q.clientCompany || "").toLowerCase().includes(query)
    );
  });

  const getColumnLeads = useCallback(
    (status: string) => filtered.filter((q) => q.status === status),
    [filtered]
  );

  const handleDragStart = (e: React.DragEvent, lead: Quotation) => {
    draggedLeadRef.current = lead;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(lead.id));
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const lead = draggedLeadRef.current;
    if (!lead) return;
    const allowed = LEAD_TRANSITIONS[lead.status || "new_lead"] || [];
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
    const lead = draggedLeadRef.current;
    if (!lead) return;
    const allowed = LEAD_TRANSITIONS[lead.status || "new_lead"] || [];
    if (!allowed.includes(targetStatus)) return;
    updateStatusMutation.mutate({ id: lead.id, status: targetStatus });
    draggedLeadRef.current = null;
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full max-w-sm" />
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 flex-1" />
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
            data-testid="text-leads-title"
          >
            Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allLeads.length} lead{allLeads.length !== 1 ? "s" : ""} via het
            aanvraagformulier
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam of email..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-leads"
        />
      </div>

      {filtered.length === 0 && searchQuery ? (
        <Card>
          <CardContent className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <p className="font-semibold">Geen leads gevonden</p>
            <p className="text-sm text-muted-foreground">
              Probeer een andere zoekterm
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 && !searchQuery ? (
        <Card>
          <CardContent className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Geen leads gevonden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Leads verschijnen hier wanneer klanten uw aanvraagformulier invullen
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:flex gap-4 flex-1">
            {LEAD_COLUMNS.map((col) => (
              <LeadColumn
                key={col.key}
                column={col}
                leads={getColumnLeads(col.key)}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                dragOverColumn={dragOverColumn}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              />
            ))}
          </div>

          <div className="md:hidden space-y-6 pb-4">
            {LEAD_COLUMNS.map((col) => {
              const colLeads = getColumnLeads(col.key);
              return (
                <div key={col.key} data-testid={`mobile-column-lead-${col.key}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(col.key)}`}
                    >
                      {col.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {colLeads.length}
                    </span>
                  </div>
                  {colLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1">Geen leads</p>
                  ) : (
                    <div className="space-y-2">
                      {colLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
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
