import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, Ban, Clock, User, MapPin } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, isSameDay, isBefore, startOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({ type: "unavailable", title: "", notes: "", startTime: "", endTime: "" });

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/calendar/events", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/events?start=${startDate}&end=${endDate}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: quotations = [] } = useQuery<any[]>({
    queryKey: ["/api/quotations"],
  });

  const requestedDates = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const q of quotations) {
      if (q.desiredStartDate) {
        const existing = map.get(q.desiredStartDate) || [];
        existing.push(q);
        map.set(q.desiredStartDate, existing);
      }
    }
    return map;
  }, [quotations]);

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      return apiRequest("POST", "/api/calendar/events", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setShowAddDialog(false);
      setNewEvent({ type: "unavailable", title: "", notes: "", startTime: "", endTime: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOffset = (getDay(monthStart) + 6) % 7;
  const today = startOfDay(new Date());

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter((e: any) => e.date === dateStr);
  };

  const getRequestsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return requestedDates.get(dateStr) || [];
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedRequests = selectedDate ? getRequestsForDate(selectedDate) : [];

  const statsThisMonth = useMemo(() => {
    const unavailable = events.filter((e: any) => e.type === "unavailable").length;
    const booked = events.filter((e: any) => e.type === "booked").length;
    let requests = 0;
    allDays.forEach((d) => { requests += getRequestsForDate(d).length; });
    return { unavailable, booked, requests };
  }, [events, allDays, requestedDates]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Beheer uw beschikbaarheid en bekijk klantaanvragen
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-3 text-center">
            <Ban className="w-4 h-4 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{statsThisMonth.unavailable}</p>
            <p className="text-[10px] text-muted-foreground">Niet beschikbaar</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-3 text-center">
            <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{statsThisMonth.requests}</p>
            <p className="text-[10px] text-muted-foreground">Aanvragen</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-3 text-center">
            <CalendarDays className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{statsThisMonth.booked}</p>
            <p className="text-[10px] text-muted-foreground">Geboekt</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-base font-semibold capitalize" data-testid="text-current-month">
                {format(currentMonth, "MMMM yyyy", { locale: nl })}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-0">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
                <div key={day} className="text-center text-[11px] font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[72px] sm:min-h-[88px] border-t p-1" />
              ))}

              {allDays.map((day) => {
                const dayEvents = getEventsForDate(day);
                const dayRequests = getRequestsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const hasUnavailable = dayEvents.some((e: any) => e.type === "unavailable");
                const hasBooked = dayEvents.some((e: any) => e.type === "booked");
                const hasRequested = dayRequests.length > 0;
                const isPast = isBefore(day, today);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[72px] sm:min-h-[88px] border-t p-1 cursor-pointer transition-all relative",
                      isSelected && "bg-primary/5 ring-2 ring-primary/30 ring-inset rounded-lg z-10",
                      !isSelected && "hover:bg-muted/50",
                      isPast && "opacity-50"
                    )}
                    onClick={() => setSelectedDate(day)}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span
                        className={cn(
                          "text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium",
                          isToday(day) && "bg-primary text-primary-foreground font-bold"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {hasUnavailable && (
                        <div className="text-[9px] sm:text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded px-1 py-0.5 truncate flex items-center gap-0.5">
                          <Ban className="w-2 h-2 shrink-0 hidden sm:block" />
                          <span className="truncate">Bezet</span>
                        </div>
                      )}
                      {hasBooked && (
                        <div className="text-[9px] sm:text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded px-1 py-0.5 truncate">
                          Geboekt
                        </div>
                      )}
                      {hasRequested && (
                        <div className="text-[9px] sm:text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-1 py-0.5 truncate flex items-center gap-0.5">
                          <User className="w-2 h-2 shrink-0 hidden sm:block" />
                          <span className="truncate">{dayRequests.length} aanvr.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {selectedDate
                    ? format(selectedDate, "d MMMM yyyy", { locale: nl })
                    : "Selecteer een dag"}
                </h3>
                {selectedDate && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setShowAddDialog(true)}
                    data-testid="button-add-event"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Toevoegen
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Klik op een dag voor details</p>
                </div>
              ) : selectedEvents.length === 0 && selectedRequests.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">Geen items op deze dag</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRequests.map((req: any) => (
                    <Link
                      key={`req-${req.id}`}
                      href={`/quotes/${req.id}`}
                      className="block p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 transition-colors"
                      data-testid={`event-request-${req.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          Aanvraag
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{req.clientName}</p>
                      <p className="text-xs text-muted-foreground">{req.clientEmail}</p>
                    </Link>
                  ))}
                  {selectedEvents.map((event: any) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        event.type === "unavailable"
                          ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                          : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                      )}
                      data-testid={`event-item-${event.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] h-5",
                            event.type === "unavailable"
                              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                          )}
                        >
                          {event.type === "unavailable" ? "Niet beschikbaar" : "Geboekt"}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => deleteMutation.mutate(event.id)}
                          data-testid={`button-delete-event-${event.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {event.title && <p className="text-sm font-medium">{event.title}</p>}
                      {event.startTime && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}
                        </p>
                      )}
                      {event.notes && <p className="text-xs text-muted-foreground mt-1">{event.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Toevoegen — {selectedDate && format(selectedDate, "d MMMM yyyy", { locale: nl })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newEvent.type}
                onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}
              >
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unavailable">Niet beschikbaar</SelectItem>
                  <SelectItem value="booked">Geboekt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titel (optioneel)</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Bijv. Vakantie, Klus bij klant..."
                data-testid="input-event-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starttijd (optioneel)</Label>
                <Input
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  data-testid="input-event-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label>Eindtijd (optioneel)</Label>
                <Input
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  data-testid="input-event-end-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notities (optioneel)</Label>
              <Textarea
                value={newEvent.notes}
                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                rows={2}
                data-testid="input-event-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuleren</Button>
            <Button
              onClick={() => {
                if (selectedDate) {
                  createMutation.mutate({
                    date: format(selectedDate, "yyyy-MM-dd"),
                    type: newEvent.type,
                    title: newEvent.title || null,
                    notes: newEvent.notes || null,
                    startTime: newEvent.startTime || null,
                    endTime: newEvent.endTime || null,
                  });
                }
              }}
              disabled={createMutation.isPending}
              data-testid="button-save-event"
            >
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
