import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  FileText,
  Shield,
  BarChart3,
  Send,
  Users,
  Receipt,
  ArrowRight,
  Check,
  ChevronRight,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Lead formulieren",
    description: "Embed aanpasbare formulieren op uw website. Klanten kiezen diensten, een datum en vullen hun gegevens in — net als Calendly.",
  },
  {
    icon: FileText,
    title: "Slimme offertes",
    description: "Automatisch gegenereerd uit uw prijsmatrix. Met optionele items, BTW-berekening en conditionele logica.",
  },
  {
    icon: Shield,
    title: "Digitale handtekening",
    description: "Klanten tekenen online met hun vinger of muis. Juridisch bindend conform eIDAS.",
  },
  {
    icon: Send,
    title: "Automatische e-mails",
    description: "Offertes en facturen worden direct verstuurd. U ontvangt altijd een kopie.",
  },
  {
    icon: BarChart3,
    title: "Pipeline dashboard",
    description: "Volg elke lead van aanvraag tot betaling. Filter op status, zoek op naam, export naar PDF.",
  },
  {
    icon: Receipt,
    title: "Facturatie & PDF",
    description: "Zet geaccepteerde offertes om in professionele facturen met een klik. PDF wordt automatisch gegenereerd.",
  },
];

const stats = [
  { value: "< 2 min", label: "Offerte versturen" },
  { value: "100%", label: "Automatisch" },
  { value: "24/7", label: "Online beschikbaar" },
];

const steps = [
  {
    number: "01",
    title: "Klant vult formulier in",
    description: "Uw klant selecteert diensten en plant een datum via het embedded formulier op uw website.",
  },
  {
    number: "02",
    title: "Offerte wordt automatisch verstuurd",
    description: "Op basis van uw prijsmatrix wordt direct een professionele offerte per e-mail verzonden.",
  },
  {
    number: "03",
    title: "Klant tekent digitaal",
    description: "Uw klant bekijkt de offerte, past optionele items aan en ondertekent met een digitale handtekening.",
  },
  {
    number: "04",
    title: "Factureer met één klik",
    description: "Na goedkeuring zet u de offerte om in een factuur. De PDF wordt automatisch verstuurd.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "95",
    features: [
      "Onbeperkt offertes",
      "Tot 3 medewerkers",
      "Lead formulieren",
      "Digitale handtekening",
      "Klantenportaal & dossiers",
      "Dashboard & rapportage",
      "E-mail notificaties",
      "Facturatie & PDF",
    ],
  },
  {
    name: "Pro",
    price: "145",
    popular: true,
    features: [
      "Alles van Starter",
      "3 tot 10 medewerkers",
      "Geavanceerde rapportage",
      "Eigen branding",
      "Agenda & planning",
      "Prioriteit support",
    ],
  },
  {
    name: "Enterprise",
    price: "Op maat",
    features: [
      "Alles van Pro",
      "10+ medewerkers",
      "White-label oplossing",
      "Dedicated support",
      "Custom integraties",
      "SLA garantie",
    ],
  },
];

const testimonials = [
  {
    name: "Mark de Vries",
    company: "TechBouw BV",
    text: "Voorheen was ik uren bezig met offertes. Nu is het klaar in 2 minuten. Mijn klanten zijn ook blij met de digitale handtekening.",
    stars: 5,
  },
  {
    name: "Sandra Jansen",
    company: "CleanPro Services",
    text: "Het lead formulier op mijn website heeft mijn conversie verdubbeld. Klanten vullen alles zelf in en krijgen direct een offerte.",
    stars: 5,
  },
  {
    name: "Ahmed El Amrani",
    company: "A&A Installatietechniek",
    text: "Van lead tot betaling in één systeem. Geen Excel meer, geen losse e-mails. Alles overzichtelijk in het dashboard.",
    stars: 5,
  },
];

const faqs = [
  {
    q: "Hoe snel kan ik beginnen?",
    a: "Binnen 5 minuten bent u operationeel. Maak een account aan, stel uw diensten in en verstuur uw eerste offerte.",
  },
  {
    q: "Kan ik het formulier op mijn eigen website plaatsen?",
    a: "Ja, u krijgt een embed code die u eenvoudig in uw website plakt. Het formulier past zich aan uw huisstijl aan.",
  },
  {
    q: "Is de digitale handtekening rechtsgeldig?",
    a: "Ja, onze digitale handtekeningen voldoen aan de Europese eIDAS-verordening en zijn juridisch bindend.",
  },
  {
    q: "Kan ik de offertes aanpassen aan mijn huisstijl?",
    a: "Absoluut. Stel uw logo, kleuren en footer in via de instellingen. Uw klanten zien uw branding.",
  },
  {
    q: "Wat gebeurt er als een klant de offerte afwijst?",
    a: "U ontvangt een notificatie met de reden. U kunt de offerte aanpassen en opnieuw versturen.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">Digiten.ai</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/auth" data-testid="link-login">Inloggen</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth" data-testid="link-start">
                <span className="hidden sm:inline">Gratis starten</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="text-center space-y-6 sm:space-y-8">
            <Badge variant="secondary" className="text-xs sm:text-sm px-3 py-1">
              <TrendingUp className="w-3 h-3 mr-1.5" />
              Het #1 CPQ platform voor Nederlandse service bedrijven
            </Badge>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Van lead tot factuur
              <br />
              <span className="text-primary">volledig automatisch</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Uw klant vult een formulier in op uw website, ontvangt direct een offerte, 
              tekent digitaal en u factureert met één klik. Geen handwerk, meer omzet.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12" asChild>
                <Link href="/auth" data-testid="link-hero-start">
                  Start 6 dagen gratis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 h-12" asChild>
                <a href="#hoe-werkt-het">Bekijk hoe het werkt</a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Geen creditcard nodig · Direct aan de slag</p>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 max-w-lg mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="hoe-werkt-het" className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <Badge variant="outline" className="mb-4">
              <Clock className="w-3 h-3 mr-1.5" />
              In 4 stappen
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Hoe werkt Digiten.ai?
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
              Van klantaanvraag tot betaling — volledig geautomatiseerd
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {steps.map((s, i) => (
              <div key={s.number} className="relative flex gap-4 sm:gap-5">
                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-lg sm:text-xl font-bold text-primary">{s.number}</span>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-semibold text-base sm:text-lg">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Alles wat u nodig heeft
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
              Een compleet platform om uw offerte- en factuurproces te stroomlijnen
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-lg transition-shadow duration-200 border-muted">
                <CardContent className="p-5 sm:p-6 space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Wat onze klanten zeggen
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-muted">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "{t.text}"
                  </p>
                  <div className="pt-2 border-t">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Eenvoudige, transparante prijzen
          </h2>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Geen verborgen kosten. Start gratis en upgrade wanneer u wilt.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? "border-primary shadow-lg ring-1 ring-primary/20" : "border-muted"}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-sm">Meest gekozen</Badge>
                </div>
              )}
              <CardContent className="p-5 sm:p-6 space-y-5 sm:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    {plan.price === "Op maat" ? (
                      <span className="text-2xl sm:text-3xl font-bold">{plan.price}</span>
                    ) : (
                      <>
                        <span className="text-3xl sm:text-4xl font-bold">
                          &euro;{plan.price}
                        </span>
                        <span className="text-muted-foreground text-sm">/maand</span>
                      </>
                    )}
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-chart-2" />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-11"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/auth">
                    {plan.price === "Op maat" ? "Neem contact op" : "Start nu"}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-center mb-8 sm:mb-12">
            Veelgestelde vragen
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.q} className="border-muted">
                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-semibold text-sm sm:text-base mb-1.5">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6 sm:p-10 text-center space-y-5 sm:space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Klaar om te beginnen?
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                Start vandaag nog met het professionaliseren van uw offerte proces.
                6 dagen gratis, geen creditcard nodig.
              </p>
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/auth">
                  Start gratis proefperiode
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground">
              <Zap className="w-3 h-3" />
            </div>
            <span className="text-sm font-semibold">Digiten.ai</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 Digiten.ai. Alle rechten voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
