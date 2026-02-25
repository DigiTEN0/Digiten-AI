import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Clock, AlertTriangle, CreditCard, Users, X, Zap, Crown, Building2 } from "lucide-react";

interface SubscriptionData {
  status: string;
  trialEndsAt: string | null;
  employeeCount: number;
  maxEmployees: number;
  plan: string;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "trial": return "Proefperiode";
    case "active": return "Actief";
    case "expired": return "Verlopen";
    default: return status;
  }
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "trial": return "secondary";
    case "active": return "default";
    case "expired": return "destructive";
    default: return "outline";
  }
}

function getDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const allPlans = [
  {
    id: "starter",
    name: "Starter",
    price: 95,
    maxEmployees: 3,
    employeeLabel: "Tot 3 medewerkers",
    features: [
      { label: "Onbeperkt offertes", included: true },
      { label: "Tot 3 medewerkers", included: true },
      { label: "Lead formulieren", included: true },
      { label: "Digitale handtekening", included: true },
      { label: "Klantenportaal & dossiers", included: true },
      { label: "Dashboard & rapportage", included: true },
      { label: "E-mail notificaties", included: true },
      { label: "Facturatie & PDF", included: true },
      { label: "Geavanceerde rapportage", included: false },
      { label: "Prioriteit support", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 145,
    maxEmployees: 10,
    employeeLabel: "3 tot 10 medewerkers",
    popular: true,
    features: [
      { label: "Onbeperkt offertes", included: true },
      { label: "3 tot 10 medewerkers", included: true },
      { label: "Lead formulieren", included: true },
      { label: "Digitale handtekening", included: true },
      { label: "Klantenportaal & dossiers", included: true },
      { label: "Dashboard & rapportage", included: true },
      { label: "E-mail notificaties", included: true },
      { label: "Facturatie & PDF", included: true },
      { label: "Geavanceerde rapportage", included: true },
      { label: "Prioriteit support", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    maxEmployees: null,
    employeeLabel: "10+ medewerkers",
    features: [
      { label: "Onbeperkt offertes", included: true },
      { label: "10+ medewerkers", included: true },
      { label: "Lead formulieren", included: true },
      { label: "Digitale handtekening", included: true },
      { label: "Klantenportaal & dossiers", included: true },
      { label: "Dashboard & rapportage", included: true },
      { label: "E-mail notificaties", included: true },
      { label: "Facturatie & PDF", included: true },
      { label: "Geavanceerde rapportage", included: true },
      { label: "Prioriteit support", included: true },
      { label: "White-label oplossing", included: true },
      { label: "Custom integraties", included: true },
      { label: "SLA garantie", included: true },
    ],
  },
];

function getPlanIcon(planId: string) {
  switch (planId) {
    case "starter": return Zap;
    case "pro": return Crown;
    case "enterprise": return Building2;
    default: return Zap;
  }
}

export default function SubscriptionPage() {
  const { toast } = useToast();

  const { data: subscription, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
  });

  const activateMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("POST", "/api/subscription/activate", { plan: planId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Abonnement geactiveerd",
        description: "Uw abonnement is succesvol geactiveerd.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <p data-testid="text-no-subscription" className="text-muted-foreground">Geen abonnementsgegevens gevonden.</p>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(subscription.trialEndsAt);
  const isExpired = subscription.status === "expired";
  const isTrial = subscription.status === "trial";
  const isActive = subscription.status === "active";
  const currentPlan = (subscription.plan || "starter").toLowerCase();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Abonnement</h1>
        <Badge variant={getStatusVariant(subscription.status)} data-testid="badge-subscription-status">
          {getStatusLabel(subscription.status)}
        </Badge>
      </div>

      {isTrial && daysRemaining !== null && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30" data-testid="card-trial-banner">
          <CardContent className="py-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Proefperiode — nog {daysRemaining} {daysRemaining === 1 ? "dag" : "dagen"} resterend
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                Uw proefperiode loopt af op {new Date(subscription.trialEndsAt!).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. Kies een plan om te blijven gebruiken.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Users className="w-4 h-4" />
              <span data-testid="text-employee-count">{subscription.employeeCount} / {subscription.maxEmployees} medewerkers</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isExpired && (
        <Card className="border-destructive bg-red-50 dark:bg-red-950/30" data-testid="card-paywall">
          <CardContent className="py-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-900 dark:text-red-200">
                Uw proefperiode is verlopen
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                Activeer een abonnement hieronder om Digiten.ai te blijven gebruiken.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isActive && (
        <Card data-testid="card-active-plan">
          <CardContent className="py-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                {allPlans.find(p => p.id === currentPlan)?.name || "Starter"} plan actief
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Uw abonnement is actief. U kunt op elk moment upgraden.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span data-testid="text-employee-count">{subscription.employeeCount} / {subscription.maxEmployees} medewerkers</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Kies uw plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allPlans.map((plan) => {
            const Icon = getPlanIcon(plan.id);
            const isCurrent = currentPlan === plan.id && isActive;

            return (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? "border-primary shadow-lg ring-1 ring-primary/20" : ""} ${isCurrent ? "border-green-500 ring-1 ring-green-500/20" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="shadow-sm">Meest gekozen</Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary" className="shadow-sm bg-green-100 text-green-800 border-green-300">Huidig plan</Badge>
                  </div>
                )}
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.employeeLabel}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    {plan.price !== null ? (
                      <>
                        <span className="text-3xl font-bold">&euro;{plan.price}</span>
                        <span className="text-muted-foreground text-sm">/maand</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">Op maat</span>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f.label} className="flex items-center gap-2 text-sm">
                        {f.included ? (
                          <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <X className="w-2.5 h-2.5 text-gray-400" />
                          </div>
                        )}
                        <span className={f.included ? "" : "text-muted-foreground"}>{f.label}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.price !== null ? (
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                      disabled={isCurrent || activateMutation.isPending}
                      onClick={() => activateMutation.mutate(plan.id)}
                      data-testid={`button-activate-${plan.id}`}
                    >
                      {isCurrent ? "Huidig plan" : activateMutation.isPending ? "Bezig..." : isTrial || isExpired ? "Activeer plan" : "Overstappen"}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => window.open("mailto:info@digiten.ai?subject=Enterprise plan aanvraag", "_blank")}
                      data-testid="button-contact-enterprise"
                    >
                      Neem contact op
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
