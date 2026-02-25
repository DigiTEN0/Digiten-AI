import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Zap,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  User,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Send,
  Clock,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  CircleCheck,
  Package,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { nl } from "date-fns/locale";

type Step = "services" | "date" | "details" | "confirm";

const WEEKDAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function generateTimeSlots(open: string, close: string): string[] {
  const slots: string[] = [];
  const [openH] = open.split(":").map(Number);
  const [closeH] = close.split(":").map(Number);
  for (let h = openH; h < closeH; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

export default function LeadFormPage() {
  const params = useParams<{ orgId: string; slug: string }>();
  const identifier = params.orgId || params.slug || "";
  const [step, setStep] = useState<Step>("services");
  const [submitted, setSubmitted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [desiredDate, setDesiredDate] = useState<Date | undefined>();
  const [desiredTime, setDesiredTime] = useState<string | undefined>();
  const [animDir, setAnimDir] = useState<"left" | "right">("left");
  const [animating, setAnimating] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientCompany: "",
    notes: "",
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/public/lead-form", identifier],
  });

  const { data: blockedDates = [] } = useQuery<string[]>({
    queryKey: ["/api/public/calendar", identifier, "unavailable"],
    queryFn: async () => {
      const res = await fetch(`/api/public/calendar/${identifier}/unavailable`);
      return res.json();
    },
  });

  const { data: openingHours } = useQuery<Record<string, { open: string; close: string }>>({
    queryKey: ["/api/public/calendar", identifier, "opening-hours"],
    queryFn: async () => {
      const res = await fetch(`/api/public/calendar/${identifier}/opening-hours`);
      return res.json();
    },
  });

  const dateStr = desiredDate ? format(desiredDate, "yyyy-MM-dd") : "";

  const { data: bookedTimes = [] } = useQuery<string[]>({
    queryKey: ["/api/public/calendar", identifier, "booked-times", dateStr],
    queryFn: async () => {
      if (!dateStr) return [];
      const res = await fetch(`/api/public/calendar/${identifier}/booked-times?date=${dateStr}`);
      return res.json();
    },
    enabled: !!dateStr,
  });

  const org = data?.organization;
  const template = data?.template;
  const priceItems: any[] = data?.priceItems || [];
  const primaryColor = org?.primaryColor || "#1d4ed8";

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const bookedSet = useMemo(() => new Set(bookedTimes), [bookedTimes]);

  const availableSlots = useMemo(() => {
    if (!desiredDate || !openingHours) return [];
    const dayOfWeek = getDay(desiredDate);
    const dayName = WEEKDAY_MAP[dayOfWeek];
    const hours = openingHours[dayName];
    if (!hours || !hours.open || !hours.close) return [];
    return generateTimeSlots(hours.open, hours.close);
  }, [desiredDate, openingHours]);

  const toggleService = useCallback((id: number) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((id: number, qty: string) => {
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  }, []);

  useEffect(() => {
    setDesiredTime(undefined);
  }, [desiredDate]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const services = priceItems
        .filter((p: any) => selectedServiceIds.has(p.id))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          quantity: quantities[p.id] || "1",
        }));

      await apiRequest("POST", `/api/public/lead-form/${identifier}/submit`, {
        ...formData,
        desiredStartDate: desiredDate ? format(desiredDate, "yyyy-MM-dd") : "",
        desiredStartTime: desiredTime || "",
        selectedServices: services,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  const steps: { key: Step; label: string; icon: any }[] = [
    { key: "services", label: "Diensten", icon: Briefcase },
    { key: "date", label: "Datum & Tijd", icon: CalendarDays },
    { key: "details", label: "Gegevens", icon: User },
    { key: "confirm", label: "Bevestigen", icon: Send },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  const canProceed = () => {
    switch (step) {
      case "services": return selectedServiceIds.size > 0;
      case "date": return true;
      case "details": return formData.clientName.trim() && formData.clientEmail.trim();
      case "confirm": return true;
      default: return false;
    }
  };

  const goNext = () => {
    if (stepIndex < steps.length - 1) {
      setAnimDir("left");
      setAnimating(true);
      setTimeout(() => {
        setStep(steps[stepIndex + 1].key);
        setAnimating(false);
      }, 150);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setAnimDir("right");
      setAnimating(true);
      setTimeout(() => {
        setStep(steps[stepIndex - 1].key);
        setAnimating(false);
      }, 150);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="w-full max-w-2xl p-6 space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-lg font-semibold">Formulier niet gevonden</p>
            <p className="text-sm text-muted-foreground mt-2">Dit formulier is niet beschikbaar</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-16 space-y-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <CircleCheck className="w-10 h-10" style={{ color: primaryColor }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Bedankt!</h2>
              <p className="text-muted-foreground mt-3 leading-relaxed max-w-xs mx-auto">
                {template?.successMessage ||
                  "Uw aanvraag is ontvangen. U ontvangt binnen enkele minuten een e-mail met uw persoonlijke offerte."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = Array.from(new Set(priceItems.map((p: any) => p.category || "General")));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOffset = (getDay(monthStart) + 6) % 7;
  const todayDate = startOfDay(new Date());

  const selectedServices = priceItems.filter((p: any) => selectedServiceIds.has(p.id));

  const stepContentStyle: React.CSSProperties = {
    transition: "opacity 150ms ease, transform 150ms ease",
    opacity: animating ? 0 : 1,
    transform: animating
      ? animDir === "left"
        ? "translateX(-12px)"
        : "translateX(12px)"
      : "translateX(0)",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 min-h-screen flex flex-col">
        <div className="flex items-center gap-3 py-4 mb-2">
          {org.logo ? (
            <img
              src={org.logo}
              alt={org.name}
              style={{ height: `${org.logoSize || 40}px` }}
              className="max-w-[160px] object-contain"
            />
          ) : (
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="text-lg font-bold tracking-tight" data-testid="text-form-org-name">
            {org.name}
          </span>
        </div>

        <div className="flex items-center gap-0 mb-6 px-1">
          {steps.map((s, i) => {
            const isActive = i === stepIndex;
            const isDone = i < stepIndex;
            const StepIcon = s.icon;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                      isDone && "text-white shadow-sm",
                      isActive && "text-white shadow-md ring-4",
                      !isActive && !isDone && "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                    )}
                    style={
                      isDone || isActive
                        ? {
                            backgroundColor: primaryColor,
                            ...(isActive ? { ringColor: `${primaryColor}20` } : {}),
                          }
                        : undefined
                    }
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="hidden sm:block">
                    <span
                      className={cn(
                        "text-xs font-semibold transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-3 h-[2px] rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        backgroundColor: primaryColor,
                        width: i < stepIndex ? "100%" : "0%",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Card className="flex-1 overflow-visible">
          <CardContent className="p-0">
            <div style={stepContentStyle}>
              {step === "services" && (
                <div className="p-5 sm:p-8 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight" data-testid="text-step-title">
                      Selecteer uw diensten
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Kies de diensten die u nodig heeft
                    </p>
                  </div>
                  {categories.map((cat) => {
                    const catItems = priceItems.filter((p: any) => (p.category || "General") === cat);
                    const parentItems = catItems.filter((p: any) => !p.dependsOnItemId);
                    return (
                      <div key={cat} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {cat}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {parentItems.map((item: any) => {
                            const isSelected = selectedServiceIds.has(item.id);
                            const children = catItems.filter(
                              (c: any) => c.dependsOnItemId === item.id
                            );
                            const visibleChildren = children.filter((c: any) => {
                              if (c.dependsOnCondition === "when_selected") return isSelected;
                              if (c.dependsOnCondition === "when_not_selected") return !isSelected;
                              return true;
                            });

                            return (
                              <div key={item.id}>
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full text-left rounded-xl border-2 p-4 transition-all duration-200",
                                    isSelected
                                      ? "shadow-sm"
                                      : "border-transparent bg-slate-50 dark:bg-slate-800/50"
                                  )}
                                  style={
                                    isSelected
                                      ? {
                                          borderColor: primaryColor,
                                          backgroundColor: `${primaryColor}08`,
                                        }
                                      : undefined
                                  }
                                  onClick={() => toggleService(item.id)}
                                  data-testid={`service-item-${item.id}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200"
                                      )}
                                      style={
                                        isSelected
                                          ? { borderColor: primaryColor, backgroundColor: primaryColor }
                                          : { borderColor: "#d1d5db" }
                                      }
                                    >
                                      {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm">{item.name}</span>
                                        {item.unitPrice && parseFloat(item.unitPrice) > 0 && (
                                          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                                            {"\u20AC"}{parseFloat(item.unitPrice).toFixed(2)}
                                            {item.unit && item.unit !== "vast" ? ` / ${item.unit}` : ""}
                                          </Badge>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                          {item.description}
                                        </p>
                                      )}
                                      {isSelected && (
                                        <div
                                          className="flex items-center gap-2 mt-3 pt-3 border-t"
                                          style={{ borderColor: `${primaryColor}15` }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Label className="text-xs text-muted-foreground">Aantal:</Label>
                                          <Input
                                            type="number"
                                            value={quantities[item.id] || "1"}
                                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                                            min="1"
                                            className="w-20 text-sm"
                                            data-testid={`input-quantity-${item.id}`}
                                          />
                                          {item.unit && item.unit !== "vast" && (
                                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>

                                {visibleChildren.length > 0 && (
                                  <div
                                    className="ml-6 mt-1 space-y-1 border-l-2 pl-4"
                                    style={{ borderColor: `${primaryColor}25` }}
                                  >
                                    {visibleChildren.map((child: any) => {
                                      const childSelected = selectedServiceIds.has(child.id);
                                      return (
                                        <button
                                          key={child.id}
                                          type="button"
                                          className={cn(
                                            "w-full text-left rounded-lg border-2 p-3 transition-all duration-200 text-sm",
                                            childSelected
                                              ? "shadow-sm"
                                              : "border-transparent bg-slate-50 dark:bg-slate-800/50"
                                          )}
                                          style={
                                            childSelected
                                              ? {
                                                  borderColor: primaryColor,
                                                  backgroundColor: `${primaryColor}08`,
                                                }
                                              : undefined
                                          }
                                          onClick={() => toggleService(child.id)}
                                          data-testid={`service-item-${child.id}`}
                                        >
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <div
                                              className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                                              style={
                                                childSelected
                                                  ? { borderColor: primaryColor, backgroundColor: primaryColor }
                                                  : { borderColor: "#d1d5db" }
                                              }
                                            >
                                              {childSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="font-medium">{child.name}</span>
                                            {child.unitPrice && parseFloat(child.unitPrice) > 0 && (
                                              <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                                                {"\u20AC"}{parseFloat(child.unitPrice).toFixed(2)}
                                              </Badge>
                                            )}
                                            {child.isOptional && (
                                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                optioneel
                                              </span>
                                            )}
                                          </div>
                                          {child.description && (
                                            <p className="text-xs text-muted-foreground mt-1 ml-6 leading-relaxed">
                                              {child.description}
                                            </p>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step === "date" && (
                <div className="p-5 sm:p-8 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight" data-testid="text-step-title">
                      Gewenste startdatum
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optioneel — selecteer een datum of sla over
                    </p>
                  </div>

                  <div className="rounded-xl border overflow-hidden">
                    <div
                      className="flex items-center justify-between gap-2 p-3"
                      style={{ backgroundColor: `${primaryColor}08` }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                        data-testid="button-prev-month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h3 className="text-sm font-bold capitalize tracking-wide">
                        {format(currentMonth, "MMMM yyyy", { locale: nl })}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                        data-testid="button-next-month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="p-3 sm:p-4">
                      <div className="grid grid-cols-7 gap-0 mb-2">
                        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
                          <div
                            key={d}
                            className="text-center text-[11px] font-bold text-muted-foreground py-1 uppercase"
                          >
                            {d}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDayOffset }).map((_, i) => (
                          <div key={`e-${i}`} className="aspect-square" />
                        ))}

                        {allDays.map((day) => {
                          const ds = format(day, "yyyy-MM-dd");
                          const isPast = isBefore(day, todayDate);
                          const isUnavailable = blockedSet.has(ds);
                          const isDisabled = isPast || isUnavailable;
                          const isSelected = desiredDate && isSameDay(day, desiredDate);
                          const isCurrentDay = isToday(day);

                          return (
                            <button
                              key={ds}
                              type="button"
                              disabled={isDisabled}
                              className={cn(
                                "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all duration-200 relative",
                                isPast && !isUnavailable && "text-slate-300 dark:text-slate-600 cursor-default",
                                isUnavailable && "bg-red-50 dark:bg-red-950/30 text-red-300 dark:text-red-700 cursor-not-allowed",
                                !isDisabled && !isSelected && "cursor-pointer",
                                isSelected && "text-white font-bold shadow-md",
                                isCurrentDay && !isSelected && !isDisabled && "font-bold ring-2 ring-inset"
                              )}
                              style={
                                isSelected
                                  ? { backgroundColor: primaryColor }
                                  : isCurrentDay && !isDisabled
                                  ? ({ "--tw-ring-color": `${primaryColor}40` } as React.CSSProperties)
                                  : undefined
                              }
                              onClick={() => {
                                if (!isDisabled) setDesiredDate(day);
                              }}
                              data-testid={`calendar-day-${ds}`}
                            >
                              {format(day, "d")}
                              {isUnavailable && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-red-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/40 border border-red-200" />
                      <span>Niet beschikbaar</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded border"
                        style={{ borderColor: `${primaryColor}40` }}
                      />
                      <span>Vandaag</span>
                    </div>
                  </div>

                  {desiredDate && (
                    <div
                      className="flex items-center gap-3 p-4 rounded-xl border"
                      style={{
                        backgroundColor: `${primaryColor}06`,
                        borderColor: `${primaryColor}20`,
                      }}
                    >
                      <CalendarDays className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {format(desiredDate, "EEEE d MMMM yyyy", { locale: nl })}
                        </p>
                        <p className="text-xs text-muted-foreground">Gewenste startdatum</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setDesiredDate(undefined)}
                      >
                        Wissen
                      </Button>
                    </div>
                  )}

                  {desiredDate && availableSlots.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Kies een tijdslot</p>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" data-testid="time-slots-grid">
                        {availableSlots.map((slot) => {
                          const isBooked = bookedSet.has(slot);
                          const isTimeSelected = desiredTime === slot;
                          const endHour = parseInt(slot.split(":")[0]) + 1;
                          const endStr = `${String(endHour).padStart(2, "0")}:00`;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked}
                              className={cn(
                                "rounded-lg border-2 py-2.5 px-2 text-center transition-all duration-200",
                                isBooked && "opacity-40 cursor-not-allowed border-transparent bg-slate-100 dark:bg-slate-800/50 line-through",
                                !isBooked && !isTimeSelected && "border-transparent bg-slate-50 dark:bg-slate-800/50 cursor-pointer",
                                isTimeSelected && "text-white font-bold shadow-sm"
                              )}
                              style={
                                isTimeSelected
                                  ? { borderColor: primaryColor, backgroundColor: primaryColor }
                                  : !isBooked
                                  ? undefined
                                  : undefined
                              }
                              onClick={() => {
                                if (!isBooked) setDesiredTime(slot);
                              }}
                              data-testid={`time-slot-${slot}`}
                            >
                              <span className="text-sm font-semibold">{slot}</span>
                              <span className={cn("block text-[10px]", isTimeSelected ? "text-white/80" : "text-muted-foreground")}>
                                {slot} - {endStr}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {desiredTime && (
                        <div
                          className="flex items-center gap-3 p-3 rounded-xl border"
                          style={{
                            backgroundColor: `${primaryColor}06`,
                            borderColor: `${primaryColor}20`,
                          }}
                        >
                          <Clock className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                          <p className="text-sm font-medium">
                            Geselecteerd: {desiredTime} - {String(parseInt(desiredTime.split(":")[0]) + 1).padStart(2, "0")}:00
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {desiredDate && availableSlots.length === 0 && (
                    <div className="text-center py-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed">
                      <Clock className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Geen openingstijden beschikbaar voor deze dag
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === "details" && (
                <div className="p-5 sm:p-8 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight" data-testid="text-step-title">
                      Uw gegevens
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vul uw contactgegevens in
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          Naam <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={formData.clientName}
                          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                          placeholder="Uw volledige naam"
                          data-testid="input-lead-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                          E-mailadres <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="email"
                          value={formData.clientEmail}
                          onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                          placeholder="uw@email.nl"
                          data-testid="input-lead-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          Telefoonnummer
                        </Label>
                        <Input
                          value={formData.clientPhone}
                          onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                          placeholder="+31 6 ..."
                          data-testid="input-lead-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          Bedrijfsnaam
                        </Label>
                        <Input
                          value={formData.clientCompany}
                          onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                          placeholder="Optioneel"
                          data-testid="input-lead-company"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                        Opmerkingen
                      </Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Heeft u nog speciale wensen of opmerkingen?"
                        rows={3}
                        data-testid="input-lead-notes"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === "confirm" && (
                <div className="p-5 sm:p-8 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight" data-testid="text-step-title">
                      Bevestig uw aanvraag
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Controleer de gegevens hieronder
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4" style={{ color: primaryColor }} />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Geselecteerde diensten
                        </p>
                      </div>
                      {selectedServices.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <CircleCheck className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {quantities[item.id] || "1"} {item.unit !== "vast" ? item.unit : ""}
                          </span>
                        </div>
                      ))}
                    </div>

                    {(desiredDate || desiredTime) && (
                      <div className="rounded-xl border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDays className="w-4 h-4" style={{ color: primaryColor }} />
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Gewenste datum & tijd
                          </p>
                        </div>
                        {desiredDate && (
                          <p className="text-sm font-medium">
                            {format(desiredDate, "EEEE d MMMM yyyy", { locale: nl })}
                          </p>
                        )}
                        {desiredTime && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {desiredTime} - {String(parseInt(desiredTime.split(":")[0]) + 1).padStart(2, "0")}:00
                          </p>
                        )}
                      </div>
                    )}

                    <div className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4" style={{ color: primaryColor }} />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Contactgegevens
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Naam</p>
                          <p className="text-sm font-medium">{formData.clientName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">E-mail</p>
                          <p className="text-sm font-medium break-all">{formData.clientEmail}</p>
                        </div>
                        {formData.clientPhone && (
                          <div>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Telefoon</p>
                            <p className="text-sm font-medium">{formData.clientPhone}</p>
                          </div>
                        )}
                        {formData.clientCompany && (
                          <div>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Bedrijf</p>
                            <p className="text-sm font-medium">{formData.clientCompany}</p>
                          </div>
                        )}
                      </div>
                      {formData.notes && (
                        <div className="pt-2 border-t mt-2">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Opmerkingen</p>
                          <p className="text-sm mt-0.5">{formData.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:px-8 sm:pb-8 pt-0 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="text-sm flex-shrink-0"
                data-testid="button-back-step"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Terug</span>
              </Button>

              {step === "confirm" ? (
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="px-6 flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? "Bezig..." : "Versturen"}
                  <Send className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="px-6 flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                  data-testid="button-next-step"
                >
                  {step === "date" && !desiredDate ? "Overslaan" : "Volgende"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground mt-4 pb-4">
          Powered by {org.name}
        </p>
      </div>
    </div>
  );
}
