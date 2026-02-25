import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  TrendingUp,
  Euro,
  FileText,
  Receipt,
  Plus,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Send,
  Eye,
  Wallet,
  CalendarDays,
  FolderOpen,
  Clock,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from "@/lib/utils";

function OwnerDashboard({ stats }: { stats: any }) {
  const kpis = [
    {
      label: "Totale omzet",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: Euro,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    },
    {
      label: "Pipeline waarde",
      value: formatCurrency(stats?.pipelineValue || 0),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      label: "Actieve offertes",
      value: stats?.activeQuotes || 0,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
    },
    {
      label: "Open facturen",
      value: stats?.openInvoices || 0,
      icon: Receipt,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800",
    },
  ];

  const pipelineStages = [
    { key: "quote_sent", label: "Verstuurd", icon: Send, color: "bg-blue-500" },
    { key: "viewed", label: "Bekeken", icon: Eye, color: "bg-indigo-500" },
    { key: "approved", label: "Akkoord", icon: CheckCircle2, color: "bg-emerald-500" },
    { key: "invoiced", label: "Factuur", icon: Receipt, color: "bg-purple-500" },
    { key: "paid", label: "Betaald", icon: Wallet, color: "bg-emerald-600" },
  ];

  const totalPipeline = pipelineStages.reduce((sum, s) => sum + (stats?.statusCounts?.[s.key] || 0), 0);

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overzicht van uw offerte pipeline
          </p>
        </div>
        <Button asChild size="sm" data-testid="button-new-quote">
          <Link href="/quotes/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Nieuwe offerte
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`border ${kpi.borderColor} ${kpi.bgColor}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-1 mb-2">
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-lg sm:text-2xl font-bold tracking-tight" data-testid={`text-kpi-${kpi.label}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-1">
              <h2 className="text-sm font-semibold">Verkoopfunnel</h2>
              <Badge variant="secondary" className="text-xs">{stats?.totalQuotes || 0} totaal</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipelineStages.map((stage) => {
              const count = stats?.statusCounts?.[stage.key] || 0;
              const pct = totalPipeline > 0 ? (count / totalPipeline) * 100 : 0;
              const Icon = stage.icon;
              return (
                <div key={stage.key} data-testid={`pipeline-${stage.key}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">{stage.label}</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-1">
              <h2 className="text-sm font-semibold">Recente activiteit</h2>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                <Link href="/quotes">
                  Alles
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats?.recentQuotes?.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nog geen activiteit</p>
                </div>
              )}
              {stats?.recentQuotes?.map((quote: any) => (
                <Link
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg p-2.5 hover:bg-muted/60 transition-colors cursor-pointer group"
                  data-testid={`activity-quote-${quote.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {quote.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(parseFloat(quote.total || "0"))} • {formatDate(quote.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(quote.status)}`}>
                      {getStatusLabel(quote.status)}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MedewerkerDashboard({ stats }: { stats: any }) {
  const kpis = [
    {
      label: "Toegewezen offertes",
      value: stats?.totalQuotes || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      label: "Toegewezen dossiers",
      value: stats?.assignedDossiers || 0,
      icon: FolderOpen,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    },
    {
      label: "Open dossiers",
      value: stats?.openDossiers || 0,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
    },
  ];

  return (
    <>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Mijn overzicht
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Uw toegewezen afspraken en dossiers
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`border ${kpi.borderColor} ${kpi.bgColor}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-1 mb-2">
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-lg sm:text-2xl font-bold tracking-tight" data-testid={`text-kpi-${kpi.label}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-1">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Komende afspraken
              </h2>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                <Link href="/calendar">
                  Agenda
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(!stats?.upcomingEvents || stats.upcomingEvents.length === 0) ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Geen komende afspraken</p>
                </div>
              ) : (
                stats.upcomingEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                    data-testid={`event-${event.id}`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-primary font-medium leading-none">
                        {new Date(event.date).toLocaleDateString("nl-NL", { month: "short" })}
                      </span>
                      <span className="text-sm font-bold text-primary leading-tight">
                        {new Date(event.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.type === "booked" ? "Geboekt" : event.type === "unavailable" ? "Onbeschikbaar" : event.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.startTime && event.endTime
                          ? `${event.startTime} - ${event.endTime}`
                          : "Hele dag"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {event.type === "booked" ? "Geboekt" : event.type === "unavailable" ? "Afwezig" : event.type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-1">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Mijn offertes
              </h2>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                <Link href="/quotes">
                  Alles
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats?.recentQuotes?.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Geen toegewezen offertes</p>
                </div>
              )}
              {stats?.recentQuotes?.map((quote: any) => (
                <Link
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg p-2.5 hover:bg-muted/60 transition-colors cursor-pointer group"
                  data-testid={`activity-quote-${quote.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {quote.clientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(parseFloat(quote.total || "0"))} • {formatDate(quote.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(quote.status)}`}>
                      {getStatusLabel(quote.status)}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const isMedewerker = stats?.role === "medewerker";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
      {isMedewerker ? (
        <MedewerkerDashboard stats={stats} />
      ) : (
        <OwnerDashboard stats={stats} />
      )}
    </div>
  );
}
